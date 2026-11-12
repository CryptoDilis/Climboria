use std::collections::BTreeMap;

const ACCOUNT_COUNT_BYTES: u64 = 8;
const ACCOUNT_PREFIX_BYTES: u64 = 88;
const REALLOC_RESERVE_BYTES: u64 = 10_240;
const RENT_EPOCH_BYTES: u64 = 8;
const DUPLICATE_RECORD_BYTES: u64 = 8;
const INSTRUCTION_DATA_LENGTH_BYTES: u64 = 8;
const PROGRAM_ID_BYTES: u64 = 32;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AccountOccurrence {
    pub position: usize,
    pub transaction_key_index: u16,
    pub address: String,
    pub signer: bool,
    pub writable: bool,
    /// Must be None unless proven at the candidate transaction's slot.
    pub data_len: Option<u64>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SerializedAccountRecord {
    pub position: usize,
    pub transaction_key_index: u16,
    pub address: String,
    pub duplicate_of: Option<usize>,
    pub signer: bool,
    pub writable: bool,
    pub data_len: Option<u64>,
    pub record_start_min_offset: u64,
    pub record_min_bytes: u64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AbiV1Layout {
    pub records: Vec<SerializedAccountRecord>,
    pub unique_accounts: usize,
    pub duplicate_accounts: usize,
    pub unknown_unique_data_lengths: usize,
    pub instruction_data_length_field_offset_min: u64,
    pub instruction_data_offset_min: u64,
    pub instruction_data_length_field_offset_exact: Option<u64>,
    pub instruction_data_offset_exact: Option<u64>,
    pub program_id_offset_exact: Option<u64>,
    pub instruction_data_len: u64,
}

fn align_to_8(value: u64) -> Result<u64, &'static str> {
    value.checked_add(7).map(|v| v & !7).ok_or("ABI-v1 alignment overflow")
}

fn unique_record_size(data_len: u64) -> Result<u64, &'static str> {
    let data_with_growth = data_len
        .checked_add(REALLOC_RESERVE_BYTES)
        .ok_or("ABI-v1 account data size overflow")?;
    let padded_data = align_to_8(data_with_growth)?;
    ACCOUNT_PREFIX_BYTES
        .checked_add(padded_data)
        .and_then(|v| v.checked_add(RENT_EPOCH_BYTES))
        .ok_or("ABI-v1 account record size overflow")
}

pub fn parse_account_vector_csv(csv: &str) -> Result<Vec<AccountOccurrence>, String> {
    let mut lines = csv.lines();
    let header = lines.next().ok_or("account vector fixture is empty")?;
    if header.trim() != "position,transaction_key_index,address,signer,writable" {
        return Err("account vector fixture header does not match the expected schema".into());
    }

    let mut accounts = Vec::new();
    for (line_index, line) in lines.enumerate() {
        if line.trim().is_empty() {
            continue;
        }
        let fields: Vec<_> = line.split(',').collect();
        if fields.len() != 5 {
            return Err(format!("account vector row {} has {} fields; expected 5", line_index + 2, fields.len()));
        }
        let position: usize = fields[0].parse()
            .map_err(|_| format!("invalid position on account vector row {}", line_index + 2))?;
        if position != accounts.len() {
            return Err(format!("account vector positions must be contiguous; expected {}, got {}", accounts.len(), position));
        }
        let transaction_key_index: u16 = fields[1].parse()
            .map_err(|_| format!("invalid transaction key index on row {}", line_index + 2))?;
        let address = fields[2].trim();
        if address.is_empty() {
            return Err(format!("empty address on account vector row {}", line_index + 2));
        }
        let parse_bool = |value: &str, field: &str| -> Result<bool, String> {
            match value {
                "true" => Ok(true),
                "false" => Ok(false),
                _ => Err(format!("invalid {field} boolean on account vector row {}", line_index + 2)),
            }
        };
        accounts.push(AccountOccurrence {
            position,
            transaction_key_index,
            address: address.to_owned(),
            signer: parse_bool(fields[3], "signer")?,
            writable: parse_bool(fields[4], "writable")?,
            data_len: None,
        });
    }

    if accounts.is_empty() {
        return Err("account vector fixture contains no accounts".into());
    }

    let mut first_by_key = BTreeMap::<u16, &AccountOccurrence>::new();
    for account in &accounts {
        if let Some(first) = first_by_key.get(&account.transaction_key_index) {
            if first.address != account.address
                || first.signer != account.signer
                || first.writable != account.writable
            {
                return Err(format!("duplicate transaction key index {} has inconsistent address or outer privileges", account.transaction_key_index));
            }
        } else {
            first_by_key.insert(account.transaction_key_index, account);
        }
    }

    Ok(accounts)
}

pub fn analyze_abi_v1_layout(
    accounts: &[AccountOccurrence],
    instruction_data_len: u64,
) -> Result<AbiV1Layout, &'static str> {
    if accounts.is_empty() {
        return Err("ABI-v1 input must contain at least one account");
    }

    let mut first_by_key = BTreeMap::<u16, usize>::new();
    let mut first_by_address = BTreeMap::<&str, u16>::new();
    let mut records = Vec::with_capacity(accounts.len());
    let mut cursor_min = ACCOUNT_COUNT_BYTES;
    let mut cursor_exact = Some(ACCOUNT_COUNT_BYTES);
    let mut unique_accounts = 0usize;
    let mut duplicate_accounts = 0usize;
    let mut unknown_unique_data_lengths = 0usize;

    for (expected_position, account) in accounts.iter().enumerate() {
        if account.position != expected_position {
            return Err("ABI-v1 account positions must be contiguous and ordered");
        }
        if let Some(previous_key) = first_by_address.get(account.address.as_str()) {
            if *previous_key != account.transaction_key_index {
                return Err("one address maps to multiple transaction account-key indices");
            }
        } else {
            first_by_address.insert(account.address.as_str(), account.transaction_key_index);
        }

        let duplicate_of = first_by_key.get(&account.transaction_key_index).copied();
        let record_min_bytes = if let Some(first_position) = duplicate_of {
            duplicate_accounts += 1;
            if account.data_len.is_some() {
                return Err("duplicate ABI-v1 records must not carry independent account data lengths");
            }
            if accounts[first_position].address != account.address {
                return Err("duplicate ABI-v1 record address does not match its first occurrence");
            }
            DUPLICATE_RECORD_BYTES
        } else {
            unique_accounts += 1;
            first_by_key.insert(account.transaction_key_index, account.position);
            match account.data_len {
                Some(data_len) => unique_record_size(data_len)?,
                None => {
                    unknown_unique_data_lengths += 1;
                    unique_record_size(0)?
                }
            }
        };

        records.push(SerializedAccountRecord {
            position: account.position,
            transaction_key_index: account.transaction_key_index,
            address: account.address.clone(),
            duplicate_of,
            signer: account.signer,
            writable: account.writable,
            data_len: account.data_len,
            record_start_min_offset: cursor_min,
            record_min_bytes,
        });

        cursor_min = cursor_min.checked_add(record_min_bytes)
            .ok_or("ABI-v1 minimum input offset overflow")?;
        cursor_exact = match (cursor_exact, duplicate_of, account.data_len) {
            (Some(cursor), Some(_), _) => cursor.checked_add(DUPLICATE_RECORD_BYTES),
            (Some(cursor), None, Some(data_len)) => cursor.checked_add(unique_record_size(data_len)?),
            _ => None,
        };
    }

    let instruction_data_length_field_offset_min = cursor_min;
    let instruction_data_offset_min = instruction_data_length_field_offset_min
        .checked_add(INSTRUCTION_DATA_LENGTH_BYTES)
        .ok_or("ABI-v1 instruction-data offset overflow")?;
    let instruction_data_length_field_offset_exact = cursor_exact;
    let instruction_data_offset_exact = cursor_exact
        .and_then(|offset| offset.checked_add(INSTRUCTION_DATA_LENGTH_BYTES));
    let program_id_offset_exact = instruction_data_offset_exact
        .and_then(|offset| offset.checked_add(instruction_data_len));

    Ok(AbiV1Layout {
        records,
        unique_accounts,
        duplicate_accounts,
        unknown_unique_data_lengths,
        instruction_data_length_field_offset_min,
        instruction_data_offset_min,
        instruction_data_length_field_offset_exact,
        instruction_data_offset_exact,
        program_id_offset_exact,
        instruction_data_len,
    })
}

impl AbiV1Layout {
    pub fn to_tsv(&self) -> String {
        let mut output = String::from(
            "position\ttransaction_key_index\taddress\tduplicate_of\tsigner\twritable\tdata_len\trecord_start_min_offset\trecord_min_bytes\n",
        );
        for record in &self.records {
            output.push_str(&format!(
                "{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\n",
                record.position,
                record.transaction_key_index,
                record.address,
                record.duplicate_of.map_or_else(|| "unique".to_owned(), |v| v.to_string()),
                record.signer,
                record.writable,
                record.data_len.map_or_else(|| "unknown".to_owned(), |v| v.to_string()),
                record.record_start_min_offset,
                record.record_min_bytes,
            ));
        }
        output
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const CANDIDATE_ACCOUNT_VECTOR: &str =
        include_str!("../fixtures/jupiter-route-v2-candidate-account-vector.csv");

    #[test]
    fn candidate_vector_preserves_all_positions_and_duplicate_references() {
        let accounts = parse_account_vector_csv(CANDIDATE_ACCOUNT_VECTOR).unwrap();
        let layout = analyze_abi_v1_layout(&accounts, 69).unwrap();
        assert_eq!(accounts.len(), 85);
        assert_eq!(layout.unique_accounts, 51);
        assert_eq!(layout.duplicate_accounts, 34);
        assert_eq!(layout.unknown_unique_data_lengths, 51);
        assert_eq!(layout.instruction_data_offset_min, 527_424);
        assert_eq!(layout.instruction_data_offset_exact, None);
        assert_eq!(layout.program_id_offset_exact, None);
        assert_eq!(layout.records[12].duplicate_of, Some(0));
        assert_eq!(layout.records[24].duplicate_of, Some(23));
        assert_eq!(layout.records[84].duplicate_of, None);
    }

    #[test]
    fn known_lengths_produce_an_exact_aligned_instruction_data_offset() {
        let accounts = vec![
            AccountOccurrence {
                position: 0,
                transaction_key_index: 4,
                address: "account-a".into(),
                signer: true,
                writable: true,
                data_len: Some(3),
            },
            AccountOccurrence {
                position: 1,
                transaction_key_index: 9,
                address: "account-b".into(),
                signer: false,
                writable: false,
                data_len: Some(8),
            },
            AccountOccurrence {
                position: 2,
                transaction_key_index: 4,
                address: "account-a".into(),
                signer: true,
                writable: true,
                data_len: None,
            },
        ];
        let layout = analyze_abi_v1_layout(&accounts, 69).unwrap();
        assert_eq!(layout.unique_accounts, 2);
        assert_eq!(layout.duplicate_accounts, 1);
        assert_eq!(layout.instruction_data_offset_exact, Some(20_712));
        assert_eq!(layout.program_id_offset_exact, Some(20_781));
    }

    #[test]
    fn unknown_account_lengths_never_become_an_exact_offset() {
        let accounts = parse_account_vector_csv(CANDIDATE_ACCOUNT_VECTOR).unwrap();
        let layout = analyze_abi_v1_layout(&accounts, 69).unwrap();
        assert_eq!(layout.instruction_data_length_field_offset_exact, None);
        assert_eq!(layout.instruction_data_offset_exact, None);
    }

    #[test]
    fn duplicate_transaction_key_must_match_first_occurrence() {
        let invalid = "position,transaction_key_index,address,signer,writable\n0,1,account-a,true,false\n1,1,account-b,true,false\n";
        assert!(parse_account_vector_csv(invalid).is_err());
    }

    #[test]
    fn candidate_outer_privileges_are_preserved_but_not_promoted_to_cpi_privileges() {
        let accounts = parse_account_vector_csv(CANDIDATE_ACCOUNT_VECTOR).unwrap();
        assert!(accounts[0].signer && accounts[0].writable);
        assert!(!accounts[1].signer && accounts[1].writable);
        assert!(!accounts[3].signer && !accounts[3].writable);
        // The fixture schema intentionally has no CPI AccountMeta privilege fields.
        assert!(CANDIDATE_ACCOUNT_VECTOR.lines().next().unwrap().contains("signer,writable"));
    }
}
