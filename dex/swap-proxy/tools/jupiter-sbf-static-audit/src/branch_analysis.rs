use solana_sbpf::{ebpf, program::SBPFVersion};

/// A decoded branch instruction. This records both possible control-flow
/// successors; it deliberately does not claim which condition is true.
#[derive(Debug, PartialEq, Eq)]
pub struct BranchSite {
    pub pc: usize,
    pub opcode: u8,
    pub width_bits: u8,
    pub condition: &'static str,
    pub operand_kind: &'static str,
    pub target_pc: Option<usize>,
    pub fallthrough_pc: Option<usize>,
}

/// Classify an SBPF branch instruction using version-aware JMP32 handling.
///
/// SBPF V3/V4 enable JMP32. V2 reuses the 0x06 opcode class for PQR arithmetic,
/// so treating every 0x06 instruction as a branch would create false edges.
pub fn classify_branch(version: SBPFVersion, instruction: &ebpf::Insn) -> Option<BranchSite> {
    let class = instruction.opc & ebpf::BPF_CLS_MASK;
    let is_jmp64 = class == ebpf::BPF_JMP64;
    let is_jmp32 = class == ebpf::BPF_JMP32 && version.enable_jmp32();
    if !is_jmp64 && !is_jmp32 {
        return None;
    }

    let operation = instruction.opc & ebpf::BPF_ALU_OP_MASK;
    let condition = match operation {
        0x00 if is_jmp64 => "always",
        0x10 => "equal",
        0x20 => "unsigned-greater-than",
        0x30 => "unsigned-greater-or-equal",
        0x40 => "bit-set",
        0x50 => "not-equal",
        0x60 => "signed-greater-than",
        0x70 => "signed-greater-or-equal",
        0xa0 => "unsigned-less-than",
        0xb0 => "unsigned-less-or-equal",
        0xc0 => "signed-less-than",
        0xd0 => "signed-less-or-equal",
        // CALL_IMM/CALL_REG and EXIT share the JMP64 class but are not branches.
        _ => return None,
    };

    let operand_kind = if condition == "always" {
        "none"
    } else if instruction.opc & ebpf::BPF_X != 0 {
        "register"
    } else {
        "immediate"
    };

    // SBPF branch offsets are relative to the instruction following the branch.
    // Preserve an invalid negative target as None rather than wrapping to usize.
    let target = (instruction.ptr as i128) + 1 + (instruction.off as i128);
    let target_pc = if target >= 0 && target <= usize::MAX as i128 {
        Some(target as usize)
    } else {
        None
    };
    let fallthrough_pc = if condition == "always" {
        None
    } else {
        instruction.ptr.checked_add(1)
    };

    Some(BranchSite {
        pc: instruction.ptr,
        opcode: instruction.opc,
        width_bits: if is_jmp32 { 32 } else { 64 },
        condition,
        operand_kind,
        target_pc,
        fallthrough_pc,
    })
}

#[cfg(test)]
mod tests {
    use super::classify_branch;
    use solana_sbpf::{ebpf, program::SBPFVersion};

    fn insn(opc: u8, ptr: usize, off: i16) -> ebpf::Insn {
        ebpf::Insn {
            ptr,
            opc,
            dst: 2,
            src: 3,
            off,
            imm: 7,
        }
    }

    #[test]
    fn conditional_jmp64_preserves_taken_and_fallthrough_edges() {
        let branch = classify_branch(SBPFVersion::V0, &insn(ebpf::JEQ64_IMM, 10, -4)).unwrap();
        assert_eq!(branch.pc, 10);
        assert_eq!(branch.width_bits, 64);
        assert_eq!(branch.condition, "equal");
        assert_eq!(branch.operand_kind, "immediate");
        assert_eq!(branch.target_pc, Some(7));
        assert_eq!(branch.fallthrough_pc, Some(11));
    }

    #[test]
    fn unconditional_jump_has_no_fallthrough_edge() {
        let branch = classify_branch(SBPFVersion::V0, &insn(ebpf::JA, 10, 4)).unwrap();
        assert_eq!(branch.condition, "always");
        assert_eq!(branch.target_pc, Some(15));
        assert_eq!(branch.fallthrough_pc, None);
    }

    #[test]
    fn register_comparison_is_classified_as_register_operand() {
        let branch = classify_branch(SBPFVersion::V0, &insn(ebpf::JNE64_REG, 20, 2)).unwrap();
        assert_eq!(branch.condition, "not-equal");
        assert_eq!(branch.operand_kind, "register");
        assert_eq!(branch.target_pc, Some(23));
        assert_eq!(branch.fallthrough_pc, Some(21));
    }

    #[test]
    fn jmp32_is_enabled_only_for_versions_that_support_it() {
        let jump32_eq_imm = 0x16; // BPF_JMP32 | BPF_K | BPF_JEQ
        assert!(classify_branch(SBPFVersion::V2, &insn(jump32_eq_imm, 1, 1)).is_none());
        let branch = classify_branch(SBPFVersion::V3, &insn(jump32_eq_imm, 1, 1)).unwrap();
        assert_eq!(branch.width_bits, 32);
        assert_eq!(branch.condition, "equal");
        assert_eq!(branch.target_pc, Some(3));
    }

    #[test]
    fn calls_and_exit_are_not_misreported_as_branches() {
        assert!(classify_branch(SBPFVersion::V0, &insn(ebpf::CALL_IMM, 1, 0)).is_none());
        assert!(classify_branch(SBPFVersion::V0, &insn(ebpf::CALL_REG, 1, 0)).is_none());
        assert!(classify_branch(SBPFVersion::V0, &insn(ebpf::EXIT, 1, 0)).is_none());
    }

    #[test]
    fn invalid_negative_branch_target_is_not_wrapped() {
        let branch = classify_branch(SBPFVersion::V0, &insn(ebpf::JEQ64_IMM, 0, -2)).unwrap();
        assert_eq!(branch.target_pc, None);
        assert_eq!(branch.fallthrough_pc, Some(1));
    }
}


// Conservative forward data-flow over the pinned static-analysis CFG. This
// intentionally models only the instruction subset in AbstractState; every
// unsupported instruction invalidates all facts. A bounded run never claims
// a pruned edge if its worklist did not reach a fixpoint.
use crate::abstract_domain::{
    evaluate_constant_branch, AbstractState, AbstractValue, BranchCondition,
};
use std::collections::{BTreeMap, BTreeSet, VecDeque};
use std::ops::Range;

#[derive(Clone, Debug)]
pub struct CfgBlock {
    pub instruction_range: Range<usize>,
    pub successors: Vec<usize>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BranchObservation {
    pub pc: usize,
    pub condition: &'static str,
    /// None means unresolved or conflicting across incoming paths.
    pub outcome_taken: Option<bool>,
    /// Union of all successors that must be retained for this observation.
    pub retained_successors: BTreeSet<usize>,
    pub visits: usize,
}

#[derive(Clone, Debug)]
pub struct CfgReachability {
    pub reachable_blocks: BTreeSet<usize>,
    pub branch_observations: BTreeMap<usize, BranchObservation>,
    pub work_items: usize,
    pub work_budget: usize,
    pub truncated: bool,
    pub call_observations: BTreeMap<usize, CallObservation>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CallObservation {
    pub pc: usize,
    pub kind: &'static str,
    pub target_pc: Option<usize>,
    pub visits: usize,
}

fn branch_condition(name: &str) -> Option<BranchCondition> {
    Some(match name {
        "equal" => BranchCondition::Equal,
        "not-equal" => BranchCondition::NotEqual,
        "unsigned-greater-than" => BranchCondition::UnsignedGreater,
        "unsigned-greater-or-equal" => BranchCondition::UnsignedGreaterOrEqual,
        "unsigned-less-than" => BranchCondition::UnsignedLess,
        "unsigned-less-or-equal" => BranchCondition::UnsignedLessOrEqual,
        "signed-greater-than" => BranchCondition::SignedGreater,
        "signed-greater-or-equal" => BranchCondition::SignedGreaterOrEqual,
        "signed-less-than" => BranchCondition::SignedLess,
        "signed-less-or-equal" => BranchCondition::SignedLessOrEqual,
        "bit-set" => BranchCondition::BitSet,
        _ => return None,
    })
}

/// Analyze a basic-block graph using a bounded worklist. The caller supplies
/// the CFG ranges/destinations from solana_sbpf::static_analysis::Analysis.
/// The generic wrapper uses an entirely Unknown entry state. Candidate-specific
/// callers must supply an evidence-backed entry state and input byte region.
pub fn analyze_cfg(
    instructions: &[ebpf::Insn],
    blocks: &BTreeMap<usize, CfgBlock>,
    entrypoint: usize,
    version: SBPFVersion,
    work_budget: usize,
) -> Result<CfgReachability, &'static str> {
    analyze_cfg_with_entry(
        instructions, blocks, entrypoint, version, work_budget,
        AbstractState::default(), None,
    )
}

/// Candidate-scoped analysis entry. Callers must provide loader/slot/binary
/// provenance before seeding registers or instruction bytes.
pub fn analyze_cfg_with_entry(
    instructions: &[ebpf::Insn],
    blocks: &BTreeMap<usize, CfgBlock>,
    entrypoint: usize,
    version: SBPFVersion,
    work_budget: usize,
    initial_state: AbstractState,
    instruction_data: Option<&[u8]>,
) -> Result<CfgReachability, &'static str> {
    analyze_cfg_with_calls(
        instructions, blocks, entrypoint, version, work_budget,
        initial_state, instruction_data, &BTreeMap::new(),
    )
}

/// Bounded context-insensitive traversal of statically resolved internal
/// CALL_IMM targets. Callees receive r1-r5 arguments and r6-r9 preserved
/// registers; r0/r10 are unknown at entry. Caller continuations conservatively
/// clobber r0-r5. CALL_REG/CALLX targets and return-value summaries stay unknown.
pub fn analyze_cfg_with_calls(
    instructions: &[ebpf::Insn],
    blocks: &BTreeMap<usize, CfgBlock>,
    entrypoint: usize,
    version: SBPFVersion,
    work_budget: usize,
    initial_state: AbstractState,
    instruction_data: Option<&[u8]>,
    internal_call_targets: &BTreeMap<usize, usize>,
) -> Result<CfgReachability, &'static str> {
    if !blocks.contains_key(&entrypoint) {
        return Err("entrypoint is not a CFG basic-block key");
    }

    let mut incoming = BTreeMap::<usize, AbstractState>::new();
    incoming.insert(entrypoint, initial_state);
    let mut queue = VecDeque::from([entrypoint]);
    let mut queued = BTreeSet::from([entrypoint]);
    let mut result = CfgReachability {
        reachable_blocks: BTreeSet::new(),
        branch_observations: BTreeMap::new(),
        work_items: 0,
        work_budget,
        truncated: false,
        call_observations: BTreeMap::new(),
    };

    while let Some(block_pc) = queue.pop_front() {
        queued.remove(&block_pc);
        if result.work_items >= work_budget {
            result.truncated = true;
            break;
        }
        result.work_items += 1;
        result.reachable_blocks.insert(block_pc);

        let block = blocks.get(&block_pc).ok_or("CFG successor is not a block key")?;
        if block.instruction_range.start > block.instruction_range.end
            || block.instruction_range.end > instructions.len()
        {
            return Err("CFG block instruction range is invalid");
        }

        let mut state = incoming.get(&block_pc).cloned().ok_or("reachable block has no input state")?;
        let mut selected_successors: Option<BTreeSet<usize>> = None;
        let mut extra_successors: Vec<(usize, AbstractState)> = Vec::new();

        for (offset, instruction) in instructions[block.instruction_range.clone()].iter().enumerate() {
            let is_last = offset + 1 == block.instruction_range.len();
            if instruction.opc == ebpf::CALL_IMM {
                let target_pc = internal_call_targets.get(&instruction.ptr).copied()
                    .filter(|target| blocks.contains_key(target));
                let kind = if target_pc.is_some() { "internal" } else { "external-or-unresolved" };
                let observation = result.call_observations.entry(instruction.ptr).or_insert_with(|| CallObservation {
                    pc: instruction.ptr,
                    kind,
                    target_pc,
                    visits: 0,
                });
                if observation.kind != kind || observation.target_pc != target_pc {
                    observation.kind = "conflicting-resolution";
                    observation.target_pc = None;
                }
                observation.visits += 1;
                if let Some(target) = target_pc {
                    let mut callee_state = state.clone();
                    callee_state.prepare_internal_callee_entry();
                    extra_successors.push((target, callee_state));
                }
                // The caller continuation is retained, but caller-saved values
                // are unknown because the callee may overwrite them.
                state.invalidate_call_clobbered_registers();
                continue;
            }
            if instruction.opc == ebpf::CALL_REG {
                let observation = result.call_observations.entry(instruction.ptr).or_insert_with(|| CallObservation {
                    pc: instruction.ptr,
                    kind: "indirect-unresolved",
                    target_pc: None,
                    visits: 0,
                });
                observation.visits += 1;
                state.invalidate_call_clobbered_registers();
                continue;
            }

            if let Some(site) = classify_branch(version, instruction) {
                // The pinned CFG splits every branch into a block terminator.
                // If that structural invariant is violated, do not prune.
                let mut outcome = if !is_last {
                    None
                } else if site.condition == "always" {
                    Some(true)
                } else if let Some(condition) = branch_condition(site.condition) {
                    let left = state.registers.get(instruction.dst as usize).copied()
                        .unwrap_or(AbstractValue::Unknown);
                    let right = if site.operand_kind == "register" {
                        state.registers.get(instruction.src as usize).copied()
                            .unwrap_or(AbstractValue::Unknown)
                    } else {
                        AbstractValue::Constant(instruction.imm as i64 as u64)
                    };
                    evaluate_constant_branch(condition, left, right, site.width_bits)
                } else {
                    None
                };

                let candidate = match outcome {
                    Some(true) => site.target_pc,
                    Some(false) => site.fallthrough_pc,
                    None => None,
                };
                let retained = if let Some(candidate) = candidate {
                    if block.successors.contains(&candidate) {
                        BTreeSet::from([candidate])
                    } else {
                        // A mismatch between our decoded edge and the pinned
                        // CFG invalidates the proof; retain the CFG's full edge set.
                        outcome = None;
                        block.successors.iter().copied().collect()
                    }
                } else {
                    block.successors.iter().copied().collect()
                };

                let observation = result.branch_observations.entry(site.pc).or_insert_with(|| BranchObservation {
                    pc: site.pc,
                    condition: site.condition,
                    outcome_taken: outcome,
                    retained_successors: BTreeSet::new(),
                    visits: 0,
                });
                if observation.outcome_taken != outcome {
                    observation.outcome_taken = None;
                }
                observation.retained_successors.extend(retained.iter().copied());
                observation.visits += 1;

                if is_last {
                    selected_successors = Some(retained);
                    break;
                }
                // A non-terminal branch contradicts the block partition.
                // Kill facts and continue without attempting path pruning.
                state.transfer_instruction_with_input(instruction.opc, instruction.dst, instruction.src, instruction.off, instruction.imm as i32, version, instruction_data);
            } else {
                state.transfer_instruction_with_input(instruction.opc, instruction.dst, instruction.src, instruction.off, instruction.imm as i32, version, instruction_data);
            }
        }

        let successors = selected_successors.unwrap_or_else(|| block.successors.iter().copied().collect());
        let mut outgoing: Vec<(usize, AbstractState)> = successors.into_iter()
            .map(|successor| (successor, state.clone())).collect();
        outgoing.extend(extra_successors);
        for (successor, outgoing_state) in outgoing {
            if !blocks.contains_key(&successor) {
                continue;
            }
            let changed = if let Some(existing) = incoming.get(&successor) {
                let merged = existing.merge(&outgoing_state);
                if &merged != existing {
                    incoming.insert(successor, merged);
                    true
                } else {
                    false
                }
            } else {
                incoming.insert(successor, outgoing_state.clone());
                true
            };
            if changed && queued.insert(successor) {
                queue.push_back(successor);
            }
        }
    }

    if result.truncated {
        // A partial worklist cannot certify any edge pruning: retain every
        // original CFG successor for every branch already observed.
        for observation in result.branch_observations.values_mut() {
            observation.outcome_taken = None;
            if let Some(block) = blocks.values().find(|block| {
                block.instruction_range.clone().any(|index| instructions.get(index).map(|insn| insn.ptr) == Some(observation.pc))
            }) {
                observation.retained_successors = block.successors.iter().copied().collect();
            }
        }
    }
    Ok(result)
}

#[cfg(test)]
mod cfg_reachability_tests {
    use super::*;
    use solana_sbpf::ebpf;

    fn insn(ptr: usize, opc: u8, dst: u8, src: u8, off: i16, imm: i32) -> ebpf::Insn {
        ebpf::Insn { ptr, opc, dst, src, off, imm: imm.into() }
    }

    fn block(start: usize, end: usize, successors: &[usize]) -> CfgBlock {
        CfgBlock { instruction_range: start..end, successors: successors.to_vec() }
    }

    #[test]
    fn candidate_instruction_data_bytes_resolve_only_the_proven_discriminator_word() {
        let instructions = vec![
            insn(0, 0x61, 1, 2, 4, 0), // LDXW r1, [r2 + 4]
            insn(1, ebpf::JEQ64_IMM, 1, 0, 1, 0x14afc431),
            insn(2, ebpf::EXIT, 0, 0, 0, 0),
            insn(3, ebpf::EXIT, 0, 0, 0, 0),
        ];
        let blocks = BTreeMap::from([
            (0, block(0, 2, &[2, 3])),
            (2, block(2, 3, &[])),
            (3, block(3, 4, &[])),
        ]);
        let candidate_data = [0xbb, 0x64, 0xfa, 0xcc, 0x31, 0xc4, 0xaf, 0x14];
        let mut entry = AbstractState::default();
        entry.registers[1] = AbstractValue::InputDataPointer(0);
        entry.registers[2] = AbstractValue::InstructionDataPointer(0);

        let result = analyze_cfg_with_entry(
            &instructions, &blocks, 0, SBPFVersion::V0, 32, entry, Some(&candidate_data),
        ).unwrap();
        let branch = &result.branch_observations[&1];
        assert_eq!(branch.outcome_taken, Some(true));
        assert_eq!(branch.retained_successors, BTreeSet::from([3]));
        assert!(result.reachable_blocks.contains(&3));
        assert!(!result.reachable_blocks.contains(&2));
    }

    #[test]
    fn resolved_call_imm_visits_internal_callee_and_preserves_argument_facts() {
        let instructions = vec![
            insn(0, ebpf::CALL_IMM, 0, 0, 0, 77),
            insn(1, ebpf::EXIT, 0, 0, 0, 0),
            insn(10, ebpf::JEQ64_IMM, 1, 0, 1, 7),
            insn(11, ebpf::EXIT, 0, 0, 0, 0),
            insn(12, ebpf::EXIT, 0, 0, 0, 0),
        ];
        let blocks = BTreeMap::from([
            (0, block(0, 1, &[1])),
            (1, block(1, 2, &[])),
            (10, block(2, 3, &[11, 12])),
            (11, block(3, 4, &[])),
            (12, block(4, 5, &[])),
        ]);
        let mut entry = AbstractState::default();
        entry.registers[1] = AbstractValue::Constant(7);
        entry.registers[6] = AbstractValue::Constant(66);
        entry.registers[10] = AbstractValue::StackPointer(0);
        let targets = BTreeMap::from([(0, 10)]);
        let result = analyze_cfg_with_calls(
            &instructions, &blocks, 0, SBPFVersion::V0, 64, entry, None, &targets,
        ).unwrap();
        assert!(result.reachable_blocks.contains(&10));
        assert!(result.reachable_blocks.contains(&1));
        assert_eq!(result.call_observations[&0].kind, "internal");
        assert_eq!(result.call_observations[&0].target_pc, Some(10));
        assert_eq!(result.branch_observations[&10].outcome_taken, Some(true));
        assert_eq!(result.branch_observations[&10].retained_successors, BTreeSet::from([11]));
    }

    #[test]
    fn indirect_call_is_reported_unresolved_and_clobbers_caller_saved_state() {
        let instructions = vec![
            insn(0, ebpf::CALL_REG, 0, 0, 0, 0),
            insn(1, ebpf::JEQ64_IMM, 1, 0, 1, 7),
            insn(2, ebpf::EXIT, 0, 0, 0, 0),
            insn(3, ebpf::EXIT, 0, 0, 0, 0),
        ];
        let blocks = BTreeMap::from([
            (0, block(0, 1, &[1])),
            (1, block(1, 2, &[2, 3])),
            (2, block(2, 3, &[])),
            (3, block(3, 4, &[])),
        ]);
        let mut entry = AbstractState::default();
        entry.registers[1] = AbstractValue::Constant(7);
        let result = analyze_cfg_with_calls(
            &instructions, &blocks, 0, SBPFVersion::V0, 64, entry, None, &BTreeMap::new(),
        ).unwrap();
        assert_eq!(result.call_observations[&0].kind, "indirect-unresolved");
        assert_eq!(result.branch_observations[&1].outcome_taken, None);
        assert!(result.reachable_blocks.contains(&2));
        assert!(result.reachable_blocks.contains(&3));
    }

    #[test]
    fn constant_taken_branch_prunes_only_the_unreachable_fallthrough() {
        let instructions = vec![
            insn(0, 0xb7, 1, 0, 0, 5),
            insn(1, ebpf::JEQ64_IMM, 1, 0, 1, 5),
            insn(2, ebpf::EXIT, 0, 0, 0, 0),
            insn(3, ebpf::EXIT, 0, 0, 0, 0),
        ];
        let blocks = BTreeMap::from([
            (0, block(0, 2, &[2, 3])),
            (2, block(2, 3, &[])),
            (3, block(3, 4, &[])),
        ]);
        let result = analyze_cfg(&instructions, &blocks, 0, SBPFVersion::V0, 32).unwrap();
        let branch = &result.branch_observations[&1];
        assert_eq!(branch.outcome_taken, Some(true));
        assert_eq!(branch.retained_successors, BTreeSet::from([3]));
        assert!(!result.reachable_blocks.contains(&2));
        assert!(result.reachable_blocks.contains(&3));
        assert!(!result.truncated);
    }

    #[test]
    fn constant_false_immediate_branch_retains_only_fallthrough() {
        let instructions = vec![
            insn(0, 0xb7, 1, 0, 0, 5),
            insn(1, ebpf::JEQ64_IMM, 1, 0, 1, 6),
            insn(2, ebpf::EXIT, 0, 0, 0, 0),
            insn(3, ebpf::EXIT, 0, 0, 0, 0),
        ];
        let blocks = BTreeMap::from([
            (0, block(0, 2, &[2, 3])),
            (2, block(2, 3, &[])),
            (3, block(3, 4, &[])),
        ]);
        let result = analyze_cfg(&instructions, &blocks, 0, SBPFVersion::V0, 32).unwrap();
        let branch = &result.branch_observations[&1];
        assert_eq!(branch.outcome_taken, Some(false));
        assert_eq!(branch.retained_successors, BTreeSet::from([2]));
        assert!(result.reachable_blocks.contains(&2));
        assert!(!result.reachable_blocks.contains(&3));
    }

    #[test]
    fn signed_register_comparison_false_keeps_only_fallthrough() {
        let instructions = vec![
            insn(0, 0xb7, 1, 0, 0, -1),
            insn(1, 0xb7, 2, 0, 0, 1),
            insn(2, 0x6d, 1, 2, 1, 0), // JSGT64_REG: -1 > 1 is false.
            insn(3, ebpf::EXIT, 0, 0, 0, 0),
            insn(4, ebpf::EXIT, 0, 0, 0, 0),
        ];
        let blocks = BTreeMap::from([
            (0, block(0, 3, &[3, 4])),
            (3, block(3, 4, &[])),
            (4, block(4, 5, &[])),
        ]);
        let result = analyze_cfg(&instructions, &blocks, 0, SBPFVersion::V0, 32).unwrap();
        let branch = &result.branch_observations[&2];
        assert_eq!(branch.outcome_taken, Some(false));
        assert_eq!(branch.retained_successors, BTreeSet::from([3]));
        assert!(result.reachable_blocks.contains(&3));
        assert!(!result.reachable_blocks.contains(&4));
    }

    #[test]
    fn unsupported_instruction_invalidates_constants_before_branch() {
        let instructions = vec![
            insn(0, 0xb7, 1, 0, 0, 5),
            insn(1, 0x04, 1, 0, 0, 1), // Unsupported ADD32 K transfer.
            insn(2, ebpf::JEQ64_IMM, 1, 0, 1, 5),
            insn(3, ebpf::EXIT, 0, 0, 0, 0),
            insn(4, ebpf::EXIT, 0, 0, 0, 0),
        ];
        let blocks = BTreeMap::from([
            (0, block(0, 3, &[3, 4])),
            (3, block(3, 4, &[])),
            (4, block(4, 5, &[])),
        ]);
        let result = analyze_cfg(&instructions, &blocks, 0, SBPFVersion::V0, 32).unwrap();
        let branch = &result.branch_observations[&2];
        assert_eq!(branch.outcome_taken, None);
        assert_eq!(branch.retained_successors, BTreeSet::from([3, 4]));
        assert!(result.reachable_blocks.contains(&3));
        assert!(result.reachable_blocks.contains(&4));
    }

    #[test]
    fn unknown_branch_retains_both_cfg_successors() {
        let instructions = vec![
            insn(0, ebpf::JEQ64_IMM, 1, 0, 1, 5),
            insn(1, ebpf::EXIT, 0, 0, 0, 0),
            insn(2, ebpf::EXIT, 0, 0, 0, 0),
        ];
        let blocks = BTreeMap::from([
            (0, block(0, 1, &[1, 2])),
            (1, block(1, 2, &[])),
            (2, block(2, 3, &[])),
        ]);
        let result = analyze_cfg(&instructions, &blocks, 0, SBPFVersion::V0, 32).unwrap();
        let branch = &result.branch_observations[&0];
        assert_eq!(branch.outcome_taken, None);
        assert_eq!(branch.retained_successors, BTreeSet::from([1, 2]));
        assert!(result.reachable_blocks.contains(&1));
        assert!(result.reachable_blocks.contains(&2));
    }

    #[test]
    fn conflicting_predecessor_constants_merge_to_unknown_at_join() {
        let instructions = vec![
            insn(0, ebpf::JEQ64_IMM, 0, 0, 1, 0),
            insn(1, 0xb7, 1, 0, 0, 5),
            insn(2, 0xb7, 1, 0, 0, 6),
            insn(3, ebpf::JEQ64_IMM, 1, 0, 1, 5),
            insn(4, ebpf::EXIT, 0, 0, 0, 0),
            insn(5, ebpf::EXIT, 0, 0, 0, 0),
        ];
        let blocks = BTreeMap::from([
            (0, block(0, 1, &[1, 2])),
            (1, block(1, 2, &[3])),
            (2, block(2, 3, &[3])),
            (3, block(3, 4, &[4, 5])),
            (4, block(4, 5, &[])),
            (5, block(5, 6, &[])),
        ]);
        let result = analyze_cfg(&instructions, &blocks, 0, SBPFVersion::V0, 64).unwrap();
        let joined = &result.branch_observations[&3];
        assert_eq!(joined.outcome_taken, None);
        assert_eq!(joined.retained_successors, BTreeSet::from([4, 5]));
    }

    #[test]
    fn loop_fixpoint_widens_changing_constant_to_unknown() {
        let instructions = vec![
            insn(0, 0xb7, 1, 0, 0, 0),
            insn(1, 0x07, 1, 0, 0, 1),
            insn(2, ebpf::JA, 0, 0, -2, 0),
        ];
        let blocks = BTreeMap::from([
            (0, block(0, 1, &[1])),
            (1, block(1, 3, &[1])),
        ]);
        let result = analyze_cfg(&instructions, &blocks, 0, SBPFVersion::V0, 32).unwrap();
        assert!(!result.truncated);
        assert!(result.reachable_blocks.contains(&1));
        assert!(result.work_items < 10);
    }

    #[test]
    fn exhausted_work_budget_disables_all_observed_pruning() {
        let instructions = vec![
            insn(0, 0xb7, 1, 0, 0, 5),
            insn(1, ebpf::JEQ64_IMM, 1, 0, 1, 5),
            insn(2, ebpf::EXIT, 0, 0, 0, 0),
            insn(3, ebpf::EXIT, 0, 0, 0, 0),
        ];
        let blocks = BTreeMap::from([
            (0, block(0, 2, &[2, 3])),
            (2, block(2, 3, &[])),
            (3, block(3, 4, &[])),
        ]);
        let result = analyze_cfg(&instructions, &blocks, 0, SBPFVersion::V0, 1).unwrap();
        assert!(result.truncated);
        let branch = &result.branch_observations[&1];
        assert_eq!(branch.outcome_taken, None);
        assert_eq!(branch.retained_successors, BTreeSet::from([2, 3]));
    }
}
