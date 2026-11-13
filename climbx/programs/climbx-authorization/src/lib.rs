use anchor_lang::prelude::*;

// DEVELOPMENT SCAFFOLD ONLY. Replace this placeholder program ID before any deployment.
// NO swap, token custody, or trade execution instruction is implemented.
declare_id!("11111111111111111111111111111111");

#[program]
pub mod climbx_authorization {
    use super::*;

    pub fn create_grant(
        ctx: Context<CreateGrant>,
        grant_id: u64,
        executor: Pubkey,
        allowed_mints: Vec<Pubkey>,
        expires_at: i64,
        per_order_cap: u64,
        cumulative_cap: u64,
    ) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        require!(allowed_mints.len() >= 1 && allowed_mints.len() <= 5, GrantError::InvalidMintCount);
        require!(expires_at > now, GrantError::InvalidExpiry);
        require!(per_order_cap > 0 && cumulative_cap >= per_order_cap, GrantError::InvalidCap);
        require!(executor != Pubkey::default(), GrantError::InvalidExecutor);
        for (index, mint) in allowed_mints.iter().enumerate() {
            require!(*mint != Pubkey::default(), GrantError::InvalidMint);
            require!(!allowed_mints[..index].contains(mint), GrantError::DuplicateMint);
        }
        let grant = &mut ctx.accounts.grant;
        grant.owner = ctx.accounts.owner.key();
        grant.executor = executor;
        grant.grant_id = grant_id;
        grant.allowed_mints = allowed_mints;
        grant.expires_at = expires_at;
        grant.per_order_cap = per_order_cap;
        grant.cumulative_cap = cumulative_cap;
        grant.spent = 0;
        grant.next_nonce = 0;
        grant.revoked = false;
        grant.bump = ctx.bumps.grant;
        Ok(())
    }

    pub fn revoke_grant(ctx: Context<RevokeGrant>) -> Result<()> {
        ctx.accounts.grant.revoked = true;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(grant_id: u64)]
pub struct CreateGrant<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        init,
        payer = owner,
        space = 8 + Grant::MAX_SIZE,
        seeds = [b"grant", owner.key().as_ref(), &grant_id.to_le_bytes()],
        bump
    )]
    pub grant: Account<'info, Grant>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeGrant<'info> {
    pub owner: Signer<'info>,
    #[account(
        mut,
        has_one = owner,
        seeds = [b"grant", owner.key().as_ref(), &grant.grant_id.to_le_bytes()],
        bump = grant.bump
    )]
    pub grant: Account<'info, Grant>,
}

#[account]
pub struct Grant {
    pub owner: Pubkey,
    pub executor: Pubkey,
    pub grant_id: u64,
    pub allowed_mints: Vec<Pubkey>,
    pub expires_at: i64,
    pub per_order_cap: u64,
    pub cumulative_cap: u64,
    pub spent: u64,
    pub next_nonce: u64,
    pub revoked: bool,
    pub bump: u8,
}
impl Grant {
    // 2 Pubkeys + grant_id + vector length + up to five Pubkeys +
    // expiry + four u64 fields + revoked + bump.
    pub const MAX_SIZE: usize = 32 + 32 + 8 + 4 + 5 * 32 + 8 + 8 + 8 + 8 + 8 + 1 + 1;
}

#[error_code]
pub enum GrantError {
    #[msg("Grant must contain between one and five mints")]
    InvalidMintCount,
    #[msg("Grant expiry must be in the future")]
    InvalidExpiry,
    #[msg("Invalid spend caps")]
    InvalidCap,
    #[msg("Invalid executor")]
    InvalidExecutor,
    #[msg("Invalid token mint")]
    InvalidMint,
    #[msg("Duplicate token mint")]
    DuplicateMint,
}
