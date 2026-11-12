use std::collections::BTreeMap;

/// Abstract value used by the bounded SBPF data-flow prototype.
/// Unknown is top: merges never discard a feasible value.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AbstractValue {
    Unknown,
    Constant(u64),
    InputDataPointer(i64),
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
    Some(match condition {
        BranchCondition::Equal => left == right,
        BranchCondition::NotEqual => left != right,
        BranchCondition::UnsignedGreater => left > right,
        BranchCondition::UnsignedGreaterOrEqual => left >= right,
        BranchCondition::UnsignedLess => left < right,
        BranchCondition::UnsignedLessOrEqual => left <= right,
        BranchCondition::SignedGreater => (left as i64) > (right as i64),
        BranchCondition::SignedGreaterOrEqual => (left as i64) >= (right as i64),
        BranchCondition::SignedLess => (left as i64) < (right as i64),
        BranchCondition::SignedLessOrEqual => (left as i64) <= (right as i64),
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
    fn constant_branch_comparison_is_width_and_signedness_aware() {
        assert_eq!(evaluate_constant_branch(BranchCondition::Equal, AbstractValue::Constant(0x1_0000_0001), AbstractValue::Constant(1), 32), Some(true));
        assert_eq!(evaluate_constant_branch(BranchCondition::SignedLess, AbstractValue::Constant(u64::MAX), AbstractValue::Constant(0), 64), Some(true));
        assert_eq!(evaluate_constant_branch(BranchCondition::UnsignedGreater, AbstractValue::Constant(u64::MAX), AbstractValue::Constant(0), 64), Some(true));
        assert_eq!(evaluate_constant_branch(BranchCondition::BitSet, AbstractValue::Constant(0b1000), AbstractValue::Constant(0b1010), 64), Some(true));
        assert_eq!(evaluate_constant_branch(BranchCondition::Equal, AbstractValue::Constant(1), AbstractValue::Constant(1), 16), None);
    }
}
