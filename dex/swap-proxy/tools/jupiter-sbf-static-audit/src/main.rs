use solana_sbpf::{
    elf::Executable,
    program::BuiltinProgram,
    static_analysis::Analysis,
    test_utils::TestContextObject,
};
use std::{
    collections::HashMap,
    env,
    error::Error,
    fs::{self, File},
    io::{BufWriter, Write},
    sync::Arc,
};

fn main() -> Result<(), Box<dyn Error>> {
    let mut args = env::args().skip(1);
    let elf_path = args.next().ok_or("usage: jupiter-sbf-static-audit <elf> <out-dir>")?;
    let out_dir = args.next().ok_or("usage: jupiter-sbf-static-audit <elf> <out-dir>")?;
    if args.next().is_some() {
        return Err("unexpected extra arguments".into());
    }

    let bytes = fs::read(&elf_path)?;
    fs::create_dir_all(&out_dir)?;

    // This loads and statically analyzes the ELF only. It does not execute the
    // program, construct a transaction, or invoke any Solana syscall.
    let loader = Arc::new(BuiltinProgram::<TestContextObject>::new_mock());
    let executable = Executable::<TestContextObject>::load(&bytes, loader)?;
    let version = executable.get_sbpf_version();
    let (text_address, text_bytes) = executable.get_text_bytes();
    let analysis = Analysis::from_executable(&executable)?;

    let summary_path = format!("{out_dir}/summary.txt");
    let mut summary = BufWriter::new(File::create(summary_path)?);
    writeln!(summary, "elf_path={elf_path}")?;
    writeln!(summary, "elf_bytes={}", bytes.len())?;
    writeln!(summary, "sbpf_version={version:?}")?;
    writeln!(summary, "text_address=0x{text_address:x}")?;
    writeln!(summary, "text_bytes={}", text_bytes.len())?;
    writeln!(summary, "instruction_count={}", analysis.instructions.len())?;
    writeln!(summary, "entrypoint_instruction_offset={}", analysis.entrypoint)?;
    writeln!(summary, "function_registry_entries={}", analysis.functions.len())?;
    writeln!(summary, "cfg_basic_blocks={}", analysis.cfg_nodes.len())?;
    writeln!(summary, "NOTE=static analysis only; no execution or CPI privilege recovery")?;
    for (pc, (key, name)) in &analysis.functions {
        writeln!(summary, "function_pc={pc} function_key=0x{key:08x} name={name}")?;
    }
    summary.flush()?;

    let function_by_key: HashMap<u32, (usize, &str)> = analysis
        .functions
        .iter()
        .map(|(pc, (key, name))| (*key, (*pc, name.as_str())))
        .collect();
    let entrypoint_end = analysis
        .functions
        .range((analysis.entrypoint + 1)..)
        .next()
        .map(|(pc, _)| *pc)
        .unwrap_or(usize::MAX);
    let calls_path = format!("{out_dir}/calls.tsv");
    let entrypoint_calls_path = format!("{out_dir}/entrypoint-calls.tsv");
    let mut calls = BufWriter::new(File::create(calls_path)?);
    let mut entrypoint_calls = BufWriter::new(File::create(entrypoint_calls_path)?);
    let header = "callsite_pc\tcall_key\tclassification\ttarget_pc\ttarget_name";
    writeln!(calls, "{header}")?;
    writeln!(entrypoint_calls, "{header}")?;
    for instruction in &analysis.instructions {
        if instruction.opc != solana_sbpf::ebpf::CALL_IMM {
            continue;
        }
        let key = version.calculate_call_imm_target_pc(
            instruction.ptr,
            instruction.imm,
        ) as u32;
        let line = if let Some((target_pc, target_name)) = function_by_key.get(&key) {
            let label = if target_name.is_empty() {
                format!("function_{target_pc}")
            } else {
                target_name.to_string()
            };
            format!(
                "{}\t0x{key:08x}\tinternal\t{}\t{}",
                instruction.ptr,
                target_pc,
                label.replace('\t', " "),
            )
        } else {
            format!(
                "{}\t0x{key:08x}\texternal-or-unresolved\t\t",
                instruction.ptr,
            )
        };
        writeln!(calls, "{line}")?;
        if instruction.ptr >= analysis.entrypoint && instruction.ptr < entrypoint_end {
            writeln!(entrypoint_calls, "{line}")?;
        }
    }
    calls.flush()?;
    entrypoint_calls.flush()?;

    let disassembly_path = format!("{out_dir}/disassembly.s");
    let mut disassembly = BufWriter::new(File::create(disassembly_path)?);
    analysis.disassemble(&mut disassembly)?;
    disassembly.flush()?;
    Ok(())
}
