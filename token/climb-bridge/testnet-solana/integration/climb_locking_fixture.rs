// Appended to pinned upstream tests/transfer.rs by CI; local bank only.
// Fixture metadata is constructed directly; mint-to/revoke/lock use actual instructions.
#[tokio::test]
async fn test_climb_metadata_only_revoked_mint_locking() {
    use solana_sdk::{account::Account, rent::Rent};
    use spl_token_2022::{extension::{BaseStateWithExtensions, StateWithExtensions}, state::{Mint as Mint2022, Account as Account2022}};
    use crate::common::setup::{setup_programs, setup_ntt_with_token_program_id, MINT_AMOUNT};
    use crate::sdk::accounts::{NTT, Governance, Wormhole};

    let program_owner = Keypair::new();
    let mint = Keypair::new();
    let mint_authority = Keypair::new();
    let user = Keypair::new();
    let program = spl_token_2022::id();

    // SPL Mint 82 bytes + account padding/type + metadata pointer TLV + Borsh metadata TLV.
    // Same extension types as observed CLIMB; no transfer fee/hook or freeze authority.
    let mut raw = vec![0u8; 166];
    raw[0..4].copy_from_slice(&1u32.to_le_bytes());
    raw[4..36].copy_from_slice(mint_authority.pubkey().as_ref());
    raw[44] = 6;
    raw[45] = 1;
    raw[165] = 1;
    raw.extend_from_slice(&18u16.to_le_bytes());
    raw.extend_from_slice(&64u16.to_le_bytes());
    raw.extend_from_slice(&[0u8; 32]);
    raw.extend_from_slice(mint.pubkey().as_ref());
    let mut meta = vec![0u8; 32];
    meta.extend_from_slice(mint.pubkey().as_ref());
    for value in ["CLIMB Local Test", "CLIMBTEST", "https://example.invalid/local.json"] {
        meta.extend_from_slice(&u32::try_from(value.len()).unwrap().to_le_bytes());
        meta.extend_from_slice(value.as_bytes());
    }
    meta.extend_from_slice(&0u32.to_le_bytes());
    raw.extend_from_slice(&19u16.to_le_bytes());
    raw.extend_from_slice(&u16::try_from(meta.len()).unwrap().to_le_bytes());
    raw.extend_from_slice(&meta);
    let mut bank = setup_programs(program_owner.pubkey()).await.unwrap();
    bank.add_account(mint.pubkey(), Account {
        lamports: Rent::default().minimum_balance(raw.len()),
        data: raw, owner: program, executable: false, rent_epoch: 0,
    });
    let mut ctx = bank.start_with_context().await;
    let payer = ctx.payer.pubkey();
    let user_token_account = spl_associated_token_account::get_associated_token_address_with_program_id(
        &user.pubkey(), &mint.pubkey(), &program
    );
    spl_associated_token_account::instruction::create_associated_token_account(
        &payer, &user.pubkey(), &mint.pubkey(), &program
    ).submit(&mut ctx).await.unwrap();
    spl_token_2022::instruction::mint_to(
        &program, &mint.pubkey(), &user_token_account, &mint_authority.pubkey(), &[], MINT_AMOUNT
    ).unwrap().submit_with_signers(&[&mint_authority], &mut ctx).await.unwrap();
    spl_token_2022::instruction::set_authority(
        &program, &mint.pubkey(), None, spl_token_2022::instruction::AuthorityType::MintTokens,
        &mint_authority.pubkey(), &[]
    ).unwrap().submit_with_signers(&[&mint_authority], &mut ctx).await.unwrap();
    let mint_before = ctx.banks_client.get_account(mint.pubkey()).await.unwrap().unwrap();
    let mint_state = StateWithExtensions::<Mint2022>::unpack(&mint_before.data).unwrap();
    assert_eq!(mint_state.base.decimals, 6);
    assert_eq!(mint_state.base.supply, MINT_AMOUNT);
    assert!(mint_state.base.mint_authority.is_none());
    assert!(mint_state.base.freeze_authority.is_none());
    assert_eq!(mint_state.get_extension_types().unwrap(), vec![
        spl_token_2022::extension::ExtensionType::MetadataPointer,
        spl_token_2022::extension::ExtensionType::TokenMetadata
    ]);

    let data = TestData {
        ntt: NTT {
            program: example_native_token_transfers::ID,
            wormhole: Wormhole { program: wormhole_anchor_sdk::wormhole::program::ID },
        },
        governance: Governance { program: wormhole_governance::ID },
        program_owner, mint_authority, mint: mint.pubkey(), user, user_token_account,
    };
    setup_ntt_with_token_program_id(&mut ctx, &data, Mode::Locking, &program).await;
    let custody = data.ntt.custody_with_token_program_id(&data.mint, &program);
    let custody_before = ctx.banks_client.get_account(custody).await.unwrap().unwrap();
    assert_eq!(custody_before.owner, program);
    assert_eq!(StateWithExtensions::<Account2022>::unpack(&custody_before.data).unwrap().base.amount, 0);
    let outbox = Keypair::new();
    let amount = 1050;
    let (accs, args) = init_accs_args(&mut ctx, &data, outbox.pubkey(), amount, false);
    approve_token_authority_with_token_program_id(
        &data.ntt, &data.user_token_account, &data.user.pubkey(), &args, &program
    ).submit_with_signers(&[&data.user], &mut ctx).await.unwrap();
    transfer_with_token_program_id(&data.ntt, accs, args, Mode::Locking, &program)
        .submit_with_signers(&[&outbox], &mut ctx).await.unwrap();
    let user_after = ctx.banks_client.get_account(user_token_account).await.unwrap().unwrap();
    let custody_after = ctx.banks_client.get_account(custody).await.unwrap().unwrap();
    let mint_after = ctx.banks_client.get_account(data.mint).await.unwrap().unwrap();
    assert_eq!(StateWithExtensions::<Account2022>::unpack(&user_after.data).unwrap().base.amount, MINT_AMOUNT - amount);
    assert_eq!(StateWithExtensions::<Account2022>::unpack(&custody_after.data).unwrap().base.amount, amount);
    assert_eq!(mint_after.data, mint_before.data);
    let outbox_state: OutboxItem = ctx.get_account_data_anchor(outbox.pubkey()).await;
    assert_eq!(outbox_state.amount, TrimmedAmount { amount, decimals: 6 });
}
