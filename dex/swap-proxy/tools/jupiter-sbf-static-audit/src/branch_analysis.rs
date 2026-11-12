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
