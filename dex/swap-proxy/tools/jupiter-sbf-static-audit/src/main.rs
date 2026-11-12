mod abstract_domain;
mod branch_analysis;

use abstract_domain::AbstractState;
use branch_analysis::{analyze_cfg_with_entry, classify_branch, CfgBlock};
use solana_sbpf::{
    elf::Executable,
    program::{BuiltinProgram, SBPFVersion},
    static_analysis::Analysis,
    test_utils::TestContextObject,
};
use std::{
    collections::{BTreeMap, HashMap, HashSet},
    env,
    error::Error,
    fs::{self, File},
    io::{BufWriter, Write},
    sync::Arc,
};

const CALLX_TSV_HEADER: &str = "callsite_pc\tcaller_registry_pc\ttarget_register\ttarget_register_source\ttarget_resolution\tdst\tsrc\toff\timm";

fn callx_target_register(version: SBPFVersion, instruction: &solana_sbpf::ebpf::Insn) -> (u8, &'static str) {
    if version.callx_uses_src_reg() {
        (instruction.src, "src")
    } else if version.callx_uses_dst_reg() {
        (instruction.dst, "dst")
    } else {
        (instruction.imm as u8, "imm_low_byte")
    }
}

fn read_instruction_data_hex(path: &str) -> Result<Vec<u8>, Box<dyn Error>> {
    let raw = fs::read_to_string(path)?;
    let hex = raw.trim();
    if hex.is_empty() || hex.len() % 2 != 0 || !hex.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return Err("instruction-data fixture must be non-empty, even-length hexadecimal".into());
    }
    let mut bytes = Vec::with_capacity(hex.len() / 2);
    for index in (0..hex.len()).step_by(2) {
        bytes.push(u8::from_str_radix(&hex[index..index + 2], 16)?);
    }
    if bytes.len() > 10_240 {
        return Err("instruction-data fixture exceeds the Solana 10 KiB instruction-data bound".into());
    }
    Ok(bytes)
}

fn main() -> Result<(), Box<dyn Error>> {
    let mut args = env::args().skip(1);
    let elf_path = args.next().ok_or("usage: jupiter-sbf-static-audit <elf> <out-dir> [instruction-data-hex-file]")?;
    let out_dir = args.next().ok_or("usage: jupiter-sbf-static-audit <elf> <out-dir> [instruction-data-hex-file]")?;
    let instruction_data_path = args.next();
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

    // Candidate input is opt-in and must be supplied only after the workflow
    // verifies the exact ProgramData ELF hash and loader/slot provenance.
    let instruction_data = instruction_data_path
        .as_deref()
        .map(read_instruction_data_hex)
        .transpose()?;
    let mut entry_state = AbstractState::default();
    let input_mode = if let Some(data) = instruction_data.as_ref() {
        if version != SBPFVersion::V0 {
            return Err("candidate input fixture is pinned to the verified SBPF V0 ELF".into());
        }
        let data_hex = data.iter().map(|byte| format!("{byte:02x}")).collect::<String>();
        if data_hex != "bb64facc31c4af143003ef0500000000d2563a4a21020000d0070a00000004000000b501102700012f0000f60301034b000000001a23010351000000000000000010270304" {
            return Err("candidate input fixture does not match the exact finalized route_v2 transaction payload".into());
        }
        entry_state = AbstractState::solana_abi_v1_simd_0321_entry_state();
        fs::write(
            format!("{out_dir}/entrypoint-instruction-data.hex"),
            data.iter().map(|byte| format!("{byte:02x}")).collect::<String>() + "\n",
        )?;
        "candidate-abi-v1-simd-0321-instruction-data"
    } else {
        "unknown-entry-registers"
    };

    // Bounded conservative forward data-flow over the pinned CFG. Generic runs
    // begin unknown; the candidate mode seeds only ABI-v1 r1/r2 proven by the
    // finalized loader-owner and transaction evidence.
    let cfg_blocks: BTreeMap<usize, CfgBlock> = analysis.cfg_nodes.iter()
        .map(|(pc, node)| (*pc, CfgBlock {
            instruction_range: node.instructions.clone(),
            successors: node.destinations.clone(),
        })).collect();
    let cfg_work_budget = analysis.cfg_nodes.len().saturating_mul(64).max(10_000).min(1_000_000);
    let cfg_reachability = analyze_cfg_with_entry(
        &analysis.instructions,
        &cfg_blocks,
        analysis.entrypoint,
        version,
        cfg_work_budget,
        entry_state,
        instruction_data.as_deref(),
    )?;

    let summary_path = format!("{out_dir}/summary.txt");
    let mut summary = BufWriter::new(File::create(summary_path)?);
    writeln!(summary, "elf_path={elf_path}")?;
    writeln!(summary, "elf_bytes={}", bytes.len())?;
    writeln!(summary, "sbpf_version={version:?}")?;
    writeln!(summary, "entrypoint_input_mode={input_mode}")?;
    writeln!(summary, "entrypoint_instruction_data_bytes={}", instruction_data.as_ref().map_or(0, Vec::len))?;
    writeln!(summary, "entrypoint_instruction_data_reads=bounded_little_endian; unknown_regions_remain_unknown")?;
    writeln!(summary, "entrypoint_register_seed=r0/r3-r9=0;r1=input-base;r2=instruction-data;r10=stack-base;r11=vm-pc")?;
    writeln!(summary, "entrypoint_r2_feature_gate=SIMD-0321 mainnet activation epoch 950; candidate epoch 1083")?;
    writeln!(summary, "direct_account_pointers=SIMD-0449 mainnet activation epoch 1099; not active at candidate epoch")?;
    writeln!(summary, "interprocedural_direct_calls=not_traversed")?;
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
    let callx_register_encoding = if version.callx_uses_src_reg() { "src" } else if version.callx_uses_dst_reg() { "dst" } else { "imm_low_byte" };
    writeln!(summary, "call_reg_target_register_encoding={callx_register_encoding}")?;
    writeln!(summary, "call_reg_target_resolution=register_value_unresolved")?;
    let branch_site_count = analysis.instructions.iter().filter(|instruction| classify_branch(version, instruction).is_some()).count();
    writeln!(summary, "branch_instruction_count={branch_site_count}")?;
    writeln!(summary, "branch_condition_resolution=bounded_cfg_dataflow; unknown conditions retain both successors")?;
    writeln!(summary, "cfg_dataflow_work_items={}", cfg_reachability.work_items)?;
    writeln!(summary, "cfg_dataflow_work_budget={}", cfg_reachability.work_budget)?;
    writeln!(summary, "cfg_dataflow_truncated={}", cfg_reachability.truncated)?;
    writeln!(summary, "cfg_reachable_basic_blocks={}", cfg_reachability.reachable_blocks.len())?;
    writeln!(summary, "cfg_branch_observations={}", cfg_reachability.branch_observations.len())?;
    writeln!(summary, "cfg_resolved_branch_observations={}", cfg_reachability.branch_observations.values().filter(|item| item.outcome_taken.is_some()).count())?;
    writeln!(summary, "cfg_unresolved_branch_observations={}", cfg_reachability.branch_observations.values().filter(|item| item.outcome_taken.is_none()).count())?;
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
    let branch_sites_path = format!("{out_dir}/branch-sites.tsv");
    let branch_reachability_path = format!("{out_dir}/branch-reachability.tsv");
    let reachable_blocks_path = format!("{out_dir}/reachable-blocks.tsv");
    let mut calls = BufWriter::new(File::create(calls_path)?);
    let mut entrypoint_calls = BufWriter::new(File::create(entrypoint_calls_path)?);
    let mut syscall_sites = BufWriter::new(File::create(syscall_sites_path)?);
    let mut callx_sites = BufWriter::new(File::create(callx_sites_path)?);
    let mut instruction_dump = BufWriter::new(File::create(instructions_path)?);
    let mut cfg_nodes = BufWriter::new(File::create(cfg_nodes_path)?);
    let mut branch_sites = BufWriter::new(File::create(branch_sites_path)?);
    let mut branch_reachability = BufWriter::new(File::create(branch_reachability_path)?);
    let mut reachable_blocks = BufWriter::new(File::create(reachable_blocks_path)?);
    let instruction_pcs: HashSet<usize> = analysis.instructions.iter().map(|instruction| instruction.ptr).collect();
    let header = "callsite_pc\tcaller_registry_pc\tcall_key\tclassification\ttarget_pc\ttarget_name";
    writeln!(calls, "{header}")?;
    writeln!(entrypoint_calls, "{header}")?;
    writeln!(syscall_sites, "callsite_pc\tcaller_registry_pc\tsyscall_name\tsyscall_key")?;
    writeln!(callx_sites, "{CALLX_TSV_HEADER}")?;
    writeln!(instruction_dump, "pc\topcode\tdst\tsrc\toff\timm")?;
    writeln!(cfg_nodes, "cfg_node_id\tinstruction_start_pc\tinstruction_end_pc_exclusive\tsources\tdestinations")?;
    writeln!(branch_sites, "branch_pc\topcode\twidth_bits\tcondition\toperand_kind\tdst\tsrc\timm\toff\ttaken_target_pc\ttarget_instruction_present\tfallthrough_pc\tfallthrough_instruction_present\tcondition_resolution")?;
    writeln!(branch_reachability, "branch_pc\tcondition\tresolution\tretained_successors\tvisits")?;
    writeln!(reachable_blocks, "basic_block_pc")?;
    for pc in &cfg_reachability.reachable_blocks { writeln!(reachable_blocks, "{pc}")?; }
    for observation in cfg_reachability.branch_observations.values() {
        let resolution = match observation.outcome_taken { Some(true) => "taken", Some(false) => "fallthrough", None => "unresolved" };
        let successors = observation.retained_successors.iter().map(usize::to_string).collect::<Vec<_>>().join(",");
        writeln!(branch_reachability, "{}\t{}\t{}\t{}\t{}", observation.pc, observation.condition, resolution, successors, observation.visits)?;
    }
    for instruction in &analysis.instructions {
        if let Some(branch) = classify_branch(version, instruction) {
            let target_present = branch.target_pc.map(|pc| instruction_pcs.contains(&pc)).map(|value| value.to_string()).unwrap_or_default();
            let fallthrough_present = branch.fallthrough_pc.map(|pc| instruction_pcs.contains(&pc)).map(|value| value.to_string()).unwrap_or_default();
            writeln!(
                branch_sites,
                "{}\t0x{:02x}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\tunresolved-condition",
                branch.pc,
                branch.opcode,
                branch.width_bits,
                branch.condition,
                branch.operand_kind,
                instruction.dst,
                instruction.src,
                instruction.imm,
                instruction.off,
                branch.target_pc.map_or_else(String::new, |pc| pc.to_string()),
                target_present,
                branch.fallthrough_pc.map_or_else(String::new, |pc| pc.to_string()),
                fallthrough_present,
            )?;
        }
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
            let (target_register, target_register_source) = callx_target_register(version, instruction);
            writeln!(
                callx_sites,
                "{}\t{}\t{}\t{}\tunresolved-register-value\t{}\t{}\t{}\t{}",
                instruction.ptr,
                caller_pc,
                target_register,
                target_register_source,
                instruction.dst,
                instruction.src,
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
    branch_sites.flush()?;
    branch_reachability.flush()?;
    reachable_blocks.flush()?;

    let disassembly_path = format!("{out_dir}/disassembly.s");
    let mut disassembly = BufWriter::new(File::create(disassembly_path)?);
    analysis.disassemble(&mut disassembly)?;
    disassembly.flush()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::callx_target_register;
    use solana_sbpf::{ebpf, program::SBPFVersion};

    #[test]
    fn callx_target_register_encoding_follows_sbpf_version() {
        let instruction = ebpf::Insn {
            ptr: 0,
            opc: ebpf::CALL_REG,
            dst: 7,
            src: 8,
            off: 0,
            imm: 0x1234,
        };
        assert_eq!(callx_target_register(SBPFVersion::V0, &instruction), (0x34, "imm_low_byte"));
        assert_eq!(callx_target_register(SBPFVersion::V1, &instruction), (0x34, "imm_low_byte"));
        assert_eq!(callx_target_register(SBPFVersion::V2, &instruction), (8, "src"));
        assert_eq!(callx_target_register(SBPFVersion::V3, &instruction), (7, "dst"));
        assert_eq!(callx_target_register(SBPFVersion::V4, &instruction), (7, "dst"));
    }


    #[test]
    fn callx_tsv_header_and_rows_use_real_tab_delimiters() {
        use super::CALLX_TSV_HEADER;
        let row = format!(
            "{}\t{}\t{}\t{}\tunresolved-register-value\t{}\t{}\t{}\t{}",
            10, 20, 2, "imm_low_byte", 0, 0, 0, 2
        );
        assert_eq!(CALLX_TSV_HEADER.split('\t').count(), 9);
        assert_eq!(row.split('\t').count(), 9);
        assert!(!CALLX_TSV_HEADER.contains("\\t"));
        assert!(!row.contains("\\t"));
    }
    #[test]
    fn indirect_call_opcode_is_not_collapsed_into_immediate_calls() {
        assert_ne!(ebpf::CALL_REG, ebpf::CALL_IMM);
        assert_eq!(ebpf::CALL_REG, 0x8d);
        assert_eq!(ebpf::CALL_IMM, 0x85);
    }
}
