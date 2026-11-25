// Appended to pinned upstream tests/transfer.rs by CI; local bank only.
// Fixture metadata is constructed directly; mint-to/revoke/lock use actual instructions.
#[tokio::test]
async fn test_climb_metadata_only_revoked_mint_locking() {
    use solana_sdk::{account::Account, rent::Rent};
    use spl_token_2022::{extension::{BaseStateWithExtensions, StateWithExtensions}, state::{Mint as Mint2022, Account as Account2022}};
    use crate::common::setup::{setup_programs, setup_ntt_with_token_program_id};
    use crate::sdk::accounts::{NTT, Governance, Wormhole};

    const CLIMB_TEST_SUPPLY: u64 = 1_000_000_000;
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
    for value in ["CLIMB Devnet Test Only", "CLIMBTEST", "https://example.invalid/climb-testnet.json"] {
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
        &program, &mint.pubkey(), &user_token_account, &mint_authority.pubkey(), &[], CLIMB_TEST_SUPPLY
    ).unwrap().submit_with_signers(&[&mint_authority], &mut ctx).await.unwrap();
    spl_token_2022::instruction::set_authority(
        &program, &mint.pubkey(), None, spl_token_2022::instruction::AuthorityType::MintTokens,
        &mint_authority.pubkey(), &[]
    ).unwrap().submit_with_signers(&[&mint_authority], &mut ctx).await.unwrap();
    let mint_before = ctx.banks_client.get_account(mint.pubkey()).await.unwrap().unwrap();
    let mint_state = StateWithExtensions::<Mint2022>::unpack(&mint_before.data).unwrap();
    assert_eq!(mint_state.base.decimals, 6);
    assert_eq!(mint_state.base.supply, CLIMB_TEST_SUPPLY);
    assert!(mint_state.base.mint_authority.is_none());
    assert!(mint_state.base.freeze_authority.is_none());
    assert_eq!(mint_state.get_extension_types().unwrap(), vec![
        spl_token_2022::extension::ExtensionType::MetadataPointer,
        spl_token_2022::extension::ExtensionType::TokenMetadata
    ]);

    // Independently compare the verifier's ATA derivation to the pinned SPL SDK.
    // These are public synthetic/local test addresses, never signer key material.
    for (m, h) in [(3u8, 4u8), (7u8, 8u8), (9u8, 10u8)] {
        let vector_mint = solana_sdk::pubkey::Pubkey::new_from_array([m; 32]);
        let vector_holder = solana_sdk::pubkey::Pubkey::new_from_array([h; 32]);
        let vector_ata = spl_associated_token_account::get_associated_token_address_with_program_id(
            &vector_holder, &vector_mint, &program
        );
        println!("CLIMB_ATA_VECTOR {} {} {}", vector_mint, vector_holder, vector_ata);
    }
    let actual_ata = ctx.banks_client.get_account(user_token_account).await.unwrap().unwrap();
    assert_eq!(actual_ata.owner, program);
    assert_eq!(actual_ata.data.len(), 170);
    assert_eq!(StateWithExtensions::<Account2022>::unpack(&actual_ata.data).unwrap().base.amount, CLIMB_TEST_SUPPLY);
    println!("CLIMB_ATA_VECTOR {} {} {}", mint.pubkey(), user.pubkey(), user_token_account);
    // Export public local account bytes only, never keypairs.
    assert_eq!(mint_before.owner, program);
    assert!(!mint_before.executable && !actual_ata.executable);
    assert_eq!(mint_before.data.len(), 391);
    let hex_bytes = |data: &[u8]| data.iter().map(|b| format!("{b:02x}")).collect::<Vec<_>>().join("");
    println!("CLIMB_LOCAL_REVOKED_PAIR {} {} {} {} {}", mint.pubkey(), user.pubkey(),
        user_token_account, hex_bytes(&mint_before.data), hex_bytes(&actual_ata.data));

    let data = TestData {
        ntt: NTT {
            program: example_native_token_transfers::ID,
            wormhole: Wormhole { program: wormhole_anchor_sdk::wormhole::program::ID },
        },
        governance: Governance { program: wormhole_governance::ID },
        program_owner, mint_authority, mint: mint.pubkey(), user, user_token_account,
    };
    setup_ntt_with_token_program_id(&mut ctx, &data, Mode::Locking, &program).await;
    // Override upstream mock peer's seven decimals with CLIMB's six decimals.
    use crate::sdk::instructions::admin::{set_peer, SetPeer};
    use example_native_token_transfers::instructions::SetPeerArgs;
    set_peer(&data.ntt, SetPeer {
        payer, owner: data.program_owner.pubkey(), mint: data.mint,
    }, SetPeerArgs {
        chain_id: ChainId { id: OTHER_CHAIN }, address: OTHER_MANAGER,
        limit: crate::common::setup::INBOUND_LIMIT, token_decimals: 6,
    }).submit_with_signers(&[&data.program_owner], &mut ctx).await.unwrap();
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
    assert_eq!(StateWithExtensions::<Account2022>::unpack(&user_after.data).unwrap().base.amount, CLIMB_TEST_SUPPLY - amount);
    assert_eq!(StateWithExtensions::<Account2022>::unpack(&custody_after.data).unwrap().base.amount, amount);
    assert_eq!(mint_after.data, mint_before.data);
    let outbox_state: OutboxItem = ctx.get_account_data_anchor(outbox.pubkey()).await;
    assert_eq!(outbox_state.amount, TrimmedAmount { amount, decimals: 6 });

    // Simulate the return from the six-decimal mock peer with the upstream local
    // core bridge/guardian fixture. No live Wormhole attestation or Base transaction.
    use anchor_lang::{InstructionData, ToAccountMetas};
    use crate::common::setup::{OTHER_TRANSCEIVER, THIS_CHAIN};
    use crate::sdk::instructions::{post_vaa::post_vaa, redeem::{redeem, Redeem}};
    use crate::sdk::transceivers::wormhole::instructions::receive_message::{receive_message, ReceiveMessage};
    use example_native_token_transfers::{instructions::{RedeemArgs, ReleaseInboundArgs}, queue::inbox::{InboxItem, ReleaseStatus}};
    use solana_sdk::{compute_budget::ComputeBudgetInstruction, instruction::Instruction, transaction::Transaction};
    use wormhole_sdk::{Address, Vaa};

    let message_id = [42u8; 32];
    let manager_message = NttManagerMessage {
        id: message_id,
        sender: [4u8; 32],
        payload: NativeTokenTransfer {
            amount: TrimmedAmount { amount, decimals: 6 },
            source_token: [3u8; 32],
            to_chain: ChainId { id: THIS_CHAIN },
            to: data.user.pubkey().to_bytes(),
            additional_payload: Payload {},
        },
    };
    let message: TransceiverMessage<WormholeTransceiver, NativeTokenTransfer<Payload>> =
        TransceiverMessage::new(OTHER_MANAGER, data.ntt.program.to_bytes(), manager_message.clone(), vec![]);
    let vaa = Vaa {
        version: 1, guardian_set_index: 0, signatures: vec![],
        timestamp: 123232, nonce: 0, emitter_chain: OTHER_CHAIN.into(),
        emitter_address: Address(OTHER_TRANSCEIVER), sequence: 0, consistency_level: 0,
        payload: message,
    };
    let posted_vaa = post_vaa(&data.ntt.wormhole, &mut ctx, vaa).await;
    let inbox = data.ntt.inbox_item(OTHER_CHAIN, manager_message);
    receive_message(&data.ntt, ReceiveMessage {
        payer, peer: data.ntt.transceiver_peer(OTHER_CHAIN), vaa: posted_vaa,
        chain_id: OTHER_CHAIN, id: message_id,
    }).submit(&mut ctx).await.unwrap();
    redeem(&data.ntt, Redeem {
        payer, peer: data.ntt.peer(OTHER_CHAIN), transceiver: data.ntt.program,
        transceiver_message: data.ntt.transceiver_message(OTHER_CHAIN, message_id),
        mint: data.mint, inbox_item: inbox, inbox_rate_limit: data.ntt.inbox_rate_limit(OTHER_CHAIN),
    }, RedeemArgs {}).submit(&mut ctx).await.unwrap();
    let approved: InboxItem = ctx.get_account_data_anchor(inbox).await;
    assert_eq!(approved.amount, amount);
    assert_eq!(approved.recipient_address, data.user.pubkey());
    assert!(matches!(approved.release_status, ReleaseStatus::ReleaseAfter(_)));

    let release_ix = Instruction {
        program_id: data.ntt.program,
        accounts: example_native_token_transfers::accounts::ReleaseInboundUnlock {
            common: example_native_token_transfers::accounts::ReleaseInbound {
                payer, config: example_native_token_transfers::accounts::NotPausedConfig { config: data.ntt.config() },
                inbox_item: inbox, recipient: user_token_account,
                token_authority: data.ntt.token_authority(), mint: data.mint,
                token_program: program, custody,
            },
        }.to_account_metas(None),
        data: example_native_token_transfers::instruction::ReleaseInboundUnlock {
            args: ReleaseInboundArgs { revert_when_not_ready: true },
        }.data(),
    };
    release_ix.clone().submit(&mut ctx).await.unwrap();
    let returned = ctx.banks_client.get_account(user_token_account).await.unwrap().unwrap();
    let empty = ctx.banks_client.get_account(custody).await.unwrap().unwrap();
    let mint_final = ctx.banks_client.get_account(data.mint).await.unwrap().unwrap();
    assert_eq!(StateWithExtensions::<Account2022>::unpack(&returned.data).unwrap().base.amount, CLIMB_TEST_SUPPLY);
    assert_eq!(StateWithExtensions::<Account2022>::unpack(&empty.data).unwrap().base.amount, 0);
    assert_eq!(mint_final.data, mint_before.data);
    let released: InboxItem = ctx.get_account_data_anchor(inbox).await;
    assert_eq!(released.release_status, ReleaseStatus::Released);

    // A distinct transaction (compute budget prefix) avoids a duplicate signature
    // cache hit; require the exact NTT replay rejection from the release instruction.
    let retry = Transaction::new_with_payer(
        &[ComputeBudgetInstruction::set_compute_unit_limit(300_000), release_ix],
        Some(&payer),
    );
    let err = retry.submit(&mut ctx).await.unwrap_err();
    assert_eq!(err.unwrap(), TransactionError::InstructionError(
        1, InstructionError::Custom(NTTError::TransferAlreadyRedeemed.into())
    ));
    let final_user = ctx.banks_client.get_account(user_token_account).await.unwrap().unwrap();
    let final_custody = ctx.banks_client.get_account(custody).await.unwrap().unwrap();
    assert_eq!(final_user.data, returned.data);
    assert_eq!(final_custody.data, empty.data);
}
