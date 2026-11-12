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
    let call_imm_count = analysis.instructions.iter().filter(|insn| insn.opc == solana_sbpf::ebpf::CALL_IMM).count();
    let call_reg_count = analysis.instructions.iter().filter(|insn| insn.opc == solana_sbpf::ebpf::CALL_REG).count();
    writeln!(summary, "call_imm_instruction_count={call_imm_count}")?;
    writeln!(summary, "call_reg_indirect_instruction_count={call_reg_count}")?;
    writeln!(summary, "call_reg_target_resolution=unresolved_register_value; src field identifies target register")?;
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
    let syscall_names = [
        "sol_try_find_program_address",
        "sol_invoke_signed_c",
        "sol_set_return_data",
        "sol_memcpy_",
        "abort",
        "sol_get_sysvar",
        "sol_log_",
        "sol_keccak256",
        "sol_secp256k1_recover",
        "sol_panic_",
        "sol_sha256",
        "sol_log_data",
        "sol_memset_",
        "sol_memcmp_",
        "sol_memmove_",
    ];
    let syscall_by_key: HashMap<u32, &str> = syscall_names
        .iter()
        .map(|name| (solana_sbpf::ebpf::hash_symbol_name(name.as_bytes()), *name))
        .collect();
    let entrypoint_end = analysis
        .functions
        .range((analysis.entrypoint + 1)..)
        .next()
        .map(|(pc, _)| *pc)
        .unwrap_or(usize::MAX);
    let calls_path = format!("{out_dir}/calls.tsv");
    let entrypoint_calls_path = format!("{out_dir}/entrypoint-calls.tsv");
    let syscall_sites_path = format!("{out_dir}/syscall-sites.tsv");
    let callx_sites_path = format!("{out_dir}/callx-sites.tsv");
    let instructions_path = format!("{out_dir}/instructions.tsv");
    let cfg_nodes_path = format!("{out_dir}/cfg-nodes.tsv");
    let mut calls = BufWriter::new(File::create(calls_path)?);
    let mut entrypoint_calls = BufWriter::new(File::create(entrypoint_calls_path)?);
    let mut syscall_sites = BufWriter::new(File::create(syscall_sites_path)?);
    let mut callx_sites = BufWriter::new(File::create(callx_sites_path)?);
    let mut instruction_dump = BufWriter::new(File::create(instructions_path)?);
    let mut cfg_nodes = BufWriter::new(File::create(cfg_nodes_path)?);
    let header = "callsite_pc\tcaller_registry_pc\tcall_key\tclassification\ttarget_pc\ttarget_name";
    writeln!(calls, "{header}")?;
    writeln!(entrypoint_calls, "{header}")?;
    writeln!(syscall_sites, "callsite_pc\tcaller_registry_pc\tsyscall_name\tsyscall_key")?;
    writeln!(callx_sites, "callsite_pc\tcaller_registry_pc\ttarget_register\ttarget_resolution\tdst\toff\timm")?;
    writeln!(instruction_dump, "pc\topcode\tdst\tsrc\toff\timm")?;
    writeln!(cfg_nodes, "cfg_node_id\tinstruction_start_pc\tinstruction_end_pc_exclusive\tsources\tdestinations")?;
    for instruction in &analysis.instructions {
        let caller = analysis
            .functions
            .range(..=instruction.ptr)
            .next_back()
            .map(|(pc, (_, name))| (*pc, name.as_str()));
        let caller_pc = caller.map(|(pc, _)| pc).unwrap_or(usize::MAX);
        writeln!(
            instruction_dump,
            "{}\t0x{:02x}\t{}\t{}\t{}\t{}",
            instruction.ptr,
            instruction.opc,
            instruction.dst,
            instruction.src,
            instruction.off,
            instruction.imm,
        )?;
        if instruction.opc == solana_sbpf::ebpf::CALL_REG {
            writeln!(
                callx_sites,
                "{}\t{}\t{}\tunresolved-register-target\t{}\t{}\t{}",
                instruction.ptr,
                caller_pc,
                instruction.src,
                instruction.dst,
                instruction.off,
                instruction.imm,
            )?;
            continue;
        }
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
                "{}\t{}\t0x{key:08x}\tinternal\t{}\t{}",
                instruction.ptr,
                caller_pc,
                target_pc,
                label.replace('\t', " "),
            )
        } else if let Some(name) = syscall_by_key.get(&key) {
            let line = format!(
                "{}\t{}\t0x{key:08x}\tsyscall\t\t{}",
                instruction.ptr,
                caller_pc,
                name,
            );
            writeln!(
                syscall_sites,
                "{}\t{}\t{}\t0x{key:08x}",
                instruction.ptr,
                caller_pc,
                name,
            )?;
            line
        } else {
            format!(
                "{}\t{}\t0x{key:08x}\texternal-or-unresolved\t\t",
                instruction.ptr,
                caller_pc,
            )
        };
        writeln!(calls, "{line}")?;
        if instruction.ptr >= analysis.entrypoint && instruction.ptr < entrypoint_end {
            writeln!(entrypoint_calls, "{line}")?;
        }
    }
    for (node_id, node) in &analysis.cfg_nodes {
        let start_pc = analysis.instructions.get(node.instructions.start).map(|insn| insn.ptr);
        let end_pc = node.instructions.end.checked_sub(1)
            .and_then(|index| analysis.instructions.get(index))
            .map(|insn| insn.ptr.saturating_add(1));
        let sources = node.sources.iter().map(usize::to_string).collect::<Vec<_>>().join(",");
        let destinations = node.destinations.iter().map(usize::to_string).collect::<Vec<_>>().join(",");
        writeln!(
            cfg_nodes,
            "{}\t{}\t{}\t{}\t{}",
            node_id,
            start_pc.map_or_else(String::new, |pc| pc.to_string()),
            end_pc.map_or_else(String::new, |pc| pc.to_string()),
            sources,
            destinations,
        )?;
    }
    calls.flush()?;
    entrypoint_calls.flush()?;
    syscall_sites.flush()?;
    callx_sites.flush()?;
    instruction_dump.flush()?;
    cfg_nodes.flush()?;

    let disassembly_path = format!("{out_dir}/disassembly.s");
    let mut disassembly = BufWriter::new(File::create(disassembly_path)?);
    analysis.disassemble(&mut disassembly)?;
    disassembly.flush()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use solana_sbpf::ebpf;

    #[test]
    fn indirect_call_opcode_is_not_collapsed_into_immediate_calls() {
        assert_ne!(ebpf::CALL_REG, ebpf::CALL_IMM);
        assert_eq!(ebpf::CALL_REG, 0x8d);
        assert_eq!(ebpf::CALL_IMM, 0x85);
    }
}
