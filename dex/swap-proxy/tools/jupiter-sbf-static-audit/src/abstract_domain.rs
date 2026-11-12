use std::collections::BTreeMap;
use solana_sbpf::program::SBPFVersion;

/// Abstract value used by the bounded SBPF data-flow prototype.
/// Unknown is top: merges never discard a feasible value.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AbstractValue {
    Unknown,
    Constant(u64),
    InputDataPointer(i64),
    InstructionDataPointer(i64),
    StackPointer(i64),
}

impl AbstractValue {
    pub fn merge(self, other: Self) -> Self {
        if self == other { self } else { Self::Unknown }
    }

    pub fn add_signed(self, delta: i64) -> Self {
        match self {
            Self::Constant(value) => Self::Constant(value.wrapping_add(delta as u64)),
            Self::InputDataPointer(offset) => offset.checked_add(delta)
                .map(Self::InputDataPointer).unwrap_or(Self::Unknown),
            Self::InstructionDataPointer(offset) => offset.checked_add(delta)
                .map(Self::InstructionDataPointer).unwrap_or(Self::Unknown),
            Self::StackPointer(offset) => offset.checked_add(delta)
                .map(Self::StackPointer).unwrap_or(Self::Unknown),
            Self::Unknown => Self::Unknown,
        }
    }
}

/// Small explicit state. r10 is initialized by the caller to the stack base;
/// input-data provenance is seeded only after the loader ABI is proven.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AbstractState {
    pub registers: [AbstractValue; 11],
    stack: BTreeMap<i64, AbstractValue>,
}

impl Default for AbstractState {
    fn default() -> Self {
        Self {
            registers: [AbstractValue::Unknown; 11],
            stack: BTreeMap::new(),
        }
    }
}

impl AbstractState {
    pub fn merge(&self, other: &Self) -> Self {
        let mut merged = Self::default();
        for index in 0..11 {
            merged.registers[index] = self.registers[index].merge(other.registers[index]);
        }
        for key in self.stack.keys().chain(other.stack.keys()) {
            let left = self.stack.get(key).copied().unwrap_or(AbstractValue::Unknown);
            let right = other.stack.get(key).copied().unwrap_or(AbstractValue::Unknown);
            let value = left.merge(right);
            if value != AbstractValue::Unknown {
                merged.stack.insert(*key, value);
            }
        }
        merged
    }

    /// Store a whole abstract value at a stack-relative slot. This prototype
    /// deliberately models exact 8-byte spills only; partial/overlapping
    /// stores must invalidate affected slots in the instruction adapter.
    pub fn spill_u64(&mut self, address: AbstractValue, value: AbstractValue) {
        if let AbstractValue::StackPointer(offset) = address {
            if offset % 8 == 0 {
                self.stack.insert(offset, value);
            }
        }
    }

    pub fn reload_u64(&self, address: AbstractValue) -> AbstractValue {
        match address {
            AbstractValue::StackPointer(offset) if offset % 8 == 0 =>
                self.stack.get(&offset).copied().unwrap_or(AbstractValue::Unknown),
            _ => AbstractValue::Unknown,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum BranchCondition {
    Equal,
    NotEqual,
    UnsignedGreater,
    UnsignedGreaterOrEqual,
    UnsignedLess,
    UnsignedLessOrEqual,
    SignedGreater,
    SignedGreaterOrEqual,
    SignedLess,
    SignedLessOrEqual,
    BitSet,
}

/// None means the branch outcome is not provable and BOTH CFG successors must
/// be retained. Some(true) means taken; Some(false) means fallthrough.
pub fn evaluate_constant_branch(
    condition: BranchCondition,
    left: AbstractValue,
    right: AbstractValue,
    width_bits: u8,
) -> Option<bool> {
    let (AbstractValue::Constant(left), AbstractValue::Constant(right)) = (left, right)
        else { return None };
    let (left, right) = if width_bits == 32 {
        (left as u32 as u64, right as u32 as u64)
    } else if width_bits == 64 {
        (left, right)
    } else {
        return None;
    };
    let signed_pair = if width_bits == 32 {
        (left as u32 as i32 as i64, right as u32 as i32 as i64)
    } else {
        (left as i64, right as i64)
    };
    Some(match condition {
        BranchCondition::Equal => left == right,
        BranchCondition::NotEqual => left != right,
        BranchCondition::UnsignedGreater => left > right,
        BranchCondition::UnsignedGreaterOrEqual => left >= right,
        BranchCondition::UnsignedLess => left < right,
        BranchCondition::UnsignedLessOrEqual => left <= right,
        BranchCondition::SignedGreater => signed_pair.0 > signed_pair.1,
        BranchCondition::SignedGreaterOrEqual => signed_pair.0 >= signed_pair.1,
        BranchCondition::SignedLess => signed_pair.0 < signed_pair.1,
        BranchCondition::SignedLessOrEqual => signed_pair.0 <= signed_pair.1,
        BranchCondition::BitSet => (left & right) != 0,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn merge_preserves_only_values_equal_on_both_paths() {
        assert_eq!(AbstractValue::Constant(7).merge(AbstractValue::Constant(7)), AbstractValue::Constant(7));
        assert_eq!(AbstractValue::Constant(7).merge(AbstractValue::Constant(8)), AbstractValue::Unknown);
        assert_eq!(AbstractValue::InputDataPointer(4).merge(AbstractValue::InputDataPointer(8)), AbstractValue::Unknown);
    }

    #[test]
    fn pointer_arithmetic_preserves_region_and_checked_offset() {
        assert_eq!(AbstractValue::InputDataPointer(12).add_signed(-4), AbstractValue::InputDataPointer(8));
        assert_eq!(AbstractValue::StackPointer(0).add_signed(-8), AbstractValue::StackPointer(-8));
        assert_eq!(AbstractValue::StackPointer(i64::MAX).add_signed(1), AbstractValue::Unknown);
    }

    #[test]
    fn exact_stack_spill_and_reload_round_trip() {
        let mut state = AbstractState::default();
        let slot = AbstractValue::StackPointer(-16);
        state.spill_u64(slot, AbstractValue::InputDataPointer(24));
        assert_eq!(state.reload_u64(slot), AbstractValue::InputDataPointer(24));
        assert_eq!(state.reload_u64(AbstractValue::StackPointer(-8)), AbstractValue::Unknown);
        assert_eq!(state.reload_u64(AbstractValue::StackPointer(-15)), AbstractValue::Unknown);
    }

    #[test]
    fn state_merge_keeps_identical_spills_and_drops_conflicting_spills() {
        let mut left = AbstractState::default();
        let mut right = AbstractState::default();
        let slot = AbstractValue::StackPointer(-8);
        left.spill_u64(slot, AbstractValue::Constant(3));
        right.spill_u64(slot, AbstractValue::Constant(3));
        assert_eq!(left.merge(&right).reload_u64(slot), AbstractValue::Constant(3));
        right.spill_u64(slot, AbstractValue::Constant(4));
        assert_eq!(left.merge(&right).reload_u64(slot), AbstractValue::Unknown);
    }

    #[test]
    fn unknown_branch_keeps_both_successors() {
        assert_eq!(
            evaluate_constant_branch(BranchCondition::Equal, AbstractValue::Unknown, AbstractValue::Constant(9), 64),
            None
        );
    }



    #[test]
    fn transfer_models_mov64_add64_and_register_copy() {
        let mut state = AbstractState::default();
        assert!(state.transfer_instruction(0xb7, 1, 0, 0, -1));
        assert_eq!(state.registers[1], AbstractValue::Constant(u64::MAX));
        assert!(state.transfer_instruction(0x07, 1, 0, 0, 2));
        assert_eq!(state.registers[1], AbstractValue::Constant(1));
        assert!(state.transfer_instruction(0xbf, 2, 1, 0, 0));
        assert_eq!(state.registers[2], AbstractValue::Constant(1));
    }

    #[test]
    fn transfer_models_stack_doubleword_spill_reload_and_offset() {
        let mut state = AbstractState::default();
        state.registers[1] = AbstractValue::StackPointer(-16);
        state.registers[2] = AbstractValue::Constant(0xfeed);
        assert!(state.transfer_instruction(0x7b, 1, 2, 0, 0));
        state.registers[3] = AbstractValue::Unknown;
        assert!(state.transfer_instruction(0x79, 3, 1, 0, 0));
        assert_eq!(state.registers[3], AbstractValue::Constant(0xfeed));
        assert!(state.transfer_instruction(0x79, 4, 1, 8, 0));
        assert_eq!(state.registers[4], AbstractValue::Unknown);
    }

    #[test]
    fn unsupported_instruction_invalidates_registers_and_stack_facts() {
        let mut state = AbstractState::default();
        state.registers[1] = AbstractValue::StackPointer(-8);
        state.registers[2] = AbstractValue::Constant(7);
        state.spill_u64(state.registers[1], state.registers[2]);
        assert!(!state.transfer_instruction(0xff, 1, 2, 0, 0));
        assert_eq!(state.registers[2], AbstractValue::Unknown);
        assert_eq!(state.reload_u64(AbstractValue::StackPointer(-8)), AbstractValue::Unknown);
    }

    #[test]
    fn transfer_handles_register_aliasing_and_modular_constant_overflow() {
        let mut state = AbstractState::default();
        state.registers[1] = AbstractValue::Constant(u64::MAX);
        assert!(state.transfer_instruction(0x07, 1, 0, 0, 1));
        assert_eq!(state.registers[1], AbstractValue::Constant(0));
        state.registers[2] = AbstractValue::Constant(5);
        assert!(state.transfer_instruction(0x0f, 2, 2, 0, 0));
        assert_eq!(state.registers[2], AbstractValue::Constant(10));
    }

    #[test]
    fn transfer_rejects_invalid_register_indices_conservatively() {
        let mut state = AbstractState::default();
        state.registers[1] = AbstractValue::Constant(99);
        state.registers[2] = AbstractValue::StackPointer(-8);
        state.spill_u64(state.registers[2], state.registers[1]);
        assert!(!state.transfer_instruction(0xbf, 15, 1, 0, 0));
        assert_eq!(state.registers[1], AbstractValue::Unknown);
        assert_eq!(state.reload_u64(AbstractValue::StackPointer(-8)), AbstractValue::Unknown);
    }

    #[test]
    fn pointer_add_overflow_becomes_unknown() {
        let mut state = AbstractState::default();
        state.registers[1] = AbstractValue::StackPointer(i64::MAX);
        assert!(state.transfer_instruction(0x07, 1, 0, 0, 1));
        assert_eq!(state.registers[1], AbstractValue::Unknown);
    }

    #[test]
    fn aligned_stack_store_overwrites_exact_slot() {
        let mut state = AbstractState::default();
        state.registers[1] = AbstractValue::StackPointer(-8);
        state.registers[2] = AbstractValue::Constant(1);
        assert!(state.transfer_instruction(0x7b, 1, 2, 0, 0));
        state.registers[2] = AbstractValue::Constant(2);
        assert!(state.transfer_instruction(0x7b, 1, 2, 0, 0));
        assert_eq!(state.reload_u64(AbstractValue::StackPointer(-8)), AbstractValue::Constant(2));
    }

    #[test]
    fn unaligned_stack_store_invalidates_every_overlapping_slot() {
        let mut state = AbstractState::default();
        state.spill_u64(AbstractValue::StackPointer(-16), AbstractValue::Constant(1));
        state.spill_u64(AbstractValue::StackPointer(-8), AbstractValue::Constant(2));
        state.registers[1] = AbstractValue::StackPointer(-15);
        state.registers[2] = AbstractValue::Constant(3);
        assert!(state.transfer_instruction(0x7b, 1, 2, 0, 0));
        assert_eq!(state.reload_u64(AbstractValue::StackPointer(-16)), AbstractValue::Unknown);
        assert_eq!(state.reload_u64(AbstractValue::StackPointer(-8)), AbstractValue::Unknown);
    }

    #[test]
    fn unknown_store_base_clears_all_stack_facts() {
        let mut state = AbstractState::default();
        state.spill_u64(AbstractValue::StackPointer(-8), AbstractValue::Constant(1));
        state.registers[1] = AbstractValue::Unknown;
        state.registers[2] = AbstractValue::Constant(2);
        assert!(state.transfer_instruction(0x7b, 1, 2, 0, 0));
        assert_eq!(state.reload_u64(AbstractValue::StackPointer(-8)), AbstractValue::Unknown);
    }

    #[test]
    fn constant_branch_comparison_is_width_and_signedness_aware() {
        assert_eq!(evaluate_constant_branch(BranchCondition::Equal, AbstractValue::Constant(0x1_0000_0001), AbstractValue::Constant(1), 32), Some(true));
        assert_eq!(evaluate_constant_branch(BranchCondition::SignedLess, AbstractValue::Constant(u64::MAX), AbstractValue::Constant(0), 64), Some(true));
        assert_eq!(evaluate_constant_branch(BranchCondition::SignedLess, AbstractValue::Constant(0xffff_ffff), AbstractValue::Constant(0), 32), Some(true));
        assert_eq!(evaluate_constant_branch(BranchCondition::UnsignedGreater, AbstractValue::Constant(u64::MAX), AbstractValue::Constant(0), 64), Some(true));
        assert_eq!(evaluate_constant_branch(BranchCondition::BitSet, AbstractValue::Constant(0b1000), AbstractValue::Constant(0b1010), 64), Some(true));
        assert_eq!(evaluate_constant_branch(BranchCondition::Equal, AbstractValue::Constant(1), AbstractValue::Constant(1), 16), None);
    }
}


// Narrow transfer semantics for the first interpreter increment. Opcode values
// are the stable eBPF encodings used by the pinned SBPF decoder. Control-flow
// instructions are handled by the CFG layer, not by this function.
const BPF_STX_DW_MEM: u8 = 0x7b;

impl AbstractState {
    /// Backward-compatible V0 transfer helper for unit tests and isolated
    /// abstract-domain checks. The production analyzer passes its ELF version
    /// and optional candidate instruction-data bytes explicitly.
    pub fn transfer_instruction(
        &mut self,
        opcode: u8,
        dst: u8,
        src: u8,
        off: i16,
        imm: i32,
    ) -> bool {
        self.transfer_instruction_with_input(opcode, dst, src, off, imm, SBPFVersion::V0, None)
    }

    /// Apply only explicitly modeled instructions. Unknown input memory never
    /// becomes a constant; only the proven instruction-data region is readable
    /// when a candidate payload is supplied.
    pub fn transfer_instruction_with_input(
        &mut self,
        opcode: u8,
        dst: u8,
        src: u8,
        off: i16,
        imm: i32,
        version: SBPFVersion,
        instruction_data: Option<&[u8]>,
    ) -> bool {
        let (Some(dst_index), Some(src_index)) =
            (usize::try_from(dst).ok().filter(|index| *index < 11),
             usize::try_from(src).ok().filter(|index| *index < 11))
        else {
            self.invalidate_all();
            return false;
        };

        let (ldxb, ldxh, ldxw, ldxdw, stxdw) = if version.callx_uses_src_reg() {
            (0x2c, 0x3c, 0x8c, 0x9c, 0x9f)
        } else {
            (0x71, 0x69, 0x61, 0x79, BPF_STX_DW_MEM)
        };

        match opcode {
            // MOV64 K: the immediate is sign-extended from 32 bits.
            0xb7 => {
                self.registers[dst_index] = AbstractValue::Constant(imm as i64 as u64);
                true
            }
            // MOV64 X
            0xbf => {
                self.registers[dst_index] = self.registers[src_index];
                true
            }
            // ADD64 K
            0x07 => {
                self.registers[dst_index] = self.registers[dst_index].add_signed(imm as i64);
                true
            }
            // ADD64 X is precise only for a constant right operand or a
            // pointer plus a representable signed constant.
            0x0f => {
                let right = self.registers[src_index];
                self.registers[dst_index] = match (self.registers[dst_index], right) {
                    (AbstractValue::Constant(left), AbstractValue::Constant(value)) =>
                        AbstractValue::Constant(left.wrapping_add(value)),
                    (base @ AbstractValue::InputDataPointer(_), AbstractValue::Constant(value))
                    | (base @ AbstractValue::InstructionDataPointer(_), AbstractValue::Constant(value))
                    | (base @ AbstractValue::StackPointer(_), AbstractValue::Constant(value)) =>
                        i64::try_from(value).ok().map(|delta| base.add_signed(delta))
                            .unwrap_or(AbstractValue::Unknown),
                    _ => AbstractValue::Unknown,
                };
                true
            }
            opcode if opcode == ldxb || opcode == ldxh || opcode == ldxw || opcode == ldxdw => {
                let width = if opcode == ldxb { 1 } else if opcode == ldxh { 2 } else if opcode == ldxw { 4 } else { 8 };
                let address = self.registers[src_index].add_signed(off as i64);
                self.registers[dst_index] = self.load_memory_value(address, width, instruction_data);
                true
            }
            opcode if opcode == stxdw => {
                let address = self.registers[dst_index].add_signed(off as i64);
                self.store_stack_u64(address, self.registers[src_index]);
                true
            }
            _ => {
                self.invalidate_all();
                false
            }
        }
    }

    fn load_memory_value(
        &self,
        address: AbstractValue,
        width: usize,
        instruction_data: Option<&[u8]>,
    ) -> AbstractValue {
        match address {
            AbstractValue::InstructionDataPointer(offset) => {
                let Some(bytes) = instruction_data else { return AbstractValue::Unknown };
                let Ok(start) = usize::try_from(offset) else { return AbstractValue::Unknown };
                let Some(end) = start.checked_add(width) else { return AbstractValue::Unknown };
                let Some(slice) = bytes.get(start..end) else { return AbstractValue::Unknown };
                let mut value = 0u64;
                for (index, byte) in slice.iter().enumerate() {
                    value |= (*byte as u64) << (index * 8);
                }
                AbstractValue::Constant(value)
            }
            AbstractValue::StackPointer(offset) if width == 8 => self.reload_u64(AbstractValue::StackPointer(offset)),
            // Account records and all other memory regions remain unknown.
            _ => AbstractValue::Unknown,
        }
    }

    fn invalidate_all(&mut self) {
        self.registers = [AbstractValue::Unknown; 11];
        self.stack.clear();
    }

    fn store_stack_u64(&mut self, address: AbstractValue, value: AbstractValue) {
        match address {
            AbstractValue::StackPointer(offset) if offset % 8 == 0 => {
                self.stack.insert(offset, value);
            }
            AbstractValue::StackPointer(offset) => {
                // An unaligned 8-byte store may overlap two tracked slots.
                self.stack.retain(|slot, _| {
                    let store_start = offset as i128;
                    let store_end = store_start + 8;
                    let slot_start = *slot as i128;
                    let slot_end = slot_start + 8;
                    store_end <= slot_start || slot_end <= store_start
                });
            }
            // An unknown store base may alias stack memory.
            AbstractValue::Unknown | AbstractValue::Constant(_) => self.stack.clear(),
            // Input and instruction-data writes cannot alias the separate stack region.
            AbstractValue::InputDataPointer(_) | AbstractValue::InstructionDataPointer(_) => {}
        }
    }
}
