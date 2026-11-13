"use client";

import React from "react";

/**
 * CLIMBX informational beta preview.
 * No wallet connection, signing, authorization, routing, or order execution.
 * DEX owner may integrate this component into the DEX navigation separately.
 */
export default function ClimbxBetaPreview() {
  return (
    <section aria-labelledby="climbx-beta-title" className="mx-auto w-full max-w-4xl rounded-2xl border border-white/15 bg-slate-950 p-6 text-white shadow-xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-amber-400/50 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">COMING SOON · BETA PREVIEW</span>
        <span className="text-xs text-slate-400">No real-money trading</span>
      </div>
      <h2 id="climbx-beta-title" className="text-3xl font-bold tracking-tight">CLIMBX by Climboria</h2>
      <p className="mt-2 text-slate-300">You Dictate. It Climbs. It Learns.</p>
      <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-300">
        Your personal automated trading bot, designed for Climboria Signature DEX.
        The interface is a preview only. Trading, wallet authorization, and strategy execution are not available.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-sm font-semibold">One bot per wallet</p><p className="mt-1 text-xs text-slate-400">Planned free access</p></div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-sm font-semibold">Up to five assets</p><p className="mt-1 text-xs text-slate-400">Planned portfolio limit</p></div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-sm font-semibold">DEX-exclusive</p><p className="mt-1 text-xs text-slate-400">Planned Signature DEX execution only</p></div>
      </div>
      <div className="mt-6 rounded-xl border border-amber-400/25 bg-amber-400/5 p-4 text-sm text-amber-100" role="status">
        Preview only — no deposits, signatures, live trades, performance claims, or guaranteed returns.
      </div>
      <button type="button" disabled aria-disabled="true" className="mt-5 cursor-not-allowed rounded-xl bg-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 opacity-70">
        Launch Bot — Unavailable
      </button>
    </section>
  );
}
