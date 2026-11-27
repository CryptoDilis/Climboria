# Jarrell's Peak — physical-device NPC acceptance

Status: test protocol, NOT completed device testing. 2026-11-28 PHT. Game only. Do not enable public NPC spawning or expand the public population based on CI. Source baseline: paired core merged #1023; final camera/priority #1030, performance #1031 and gait #1032 are candidates at this checkpoint.

## Preconditions
- Use an authorized private/local static preview of the exact candidate revision with dependencies/assets available. Do not run smoke controls on the public production site or a real authenticated room. No wallet, real account, or economy transaction is required.
- Record exact commit, browser version, phone model, OS, memory if known, viewport/orientation, refresh rate, power/thermal state, and network conditions. Test at least an ordinary Android phone and desktop; iOS separately before broad release. Use hardware rendering, not SwiftShader. Keep resolution, camera position and settings identical within a comparison. Disable screen recording during sampling if it changes load.
- Open game/play.html?smoke=1 in that preview using the existing local saved-hero fixture. Wait for normal game boot. Use Chrome desktop DevTools for desktop and USB remote debugging for Android. Keep the test tab foreground, no actual peers. If the exact revision lacks these smoke functions, abort rather than modifying the live game.
- Run once to warm assets, then run three complete measured passes. Record individual passes and medians, not only the best result. Keep phone at ordinary operating temperature; report throttling rather than discarding poor runs. Stop if device overheats or the game becomes unusable.

## Private console sampling
The snippet below uses existing explicitly smoke-only controls. It measures real requestAnimationFrame intervals, not simulation time. No external requests or credentials. Before running, create the local test hero using the existing preview fixture/normal hero creation. If the console reports a missing API or failed start, stop and record the exact revision/error.

```js
(async () => {
  const w = window.__climboriaJarrellsPeak;
  const peers = window.__CLIMBORIA_GAME_PEERS;
  if (!new URLSearchParams(location.search).has('smoke') ||
      !window.__climboriaGameReady || !w?.npcPairSmokeView ||
      !w.npcContinuousStart || !w.npcPairContinuousStart || !peers?.audit)
    throw Error('Authorized smoke preview not ready');
  if (document.hidden || peers.count() !== 0)
    throw Error('Foreground isolated fixture required');
  const state = () => ({
    single: w.npcContinuousAudit(),
    pair: w.npcPairContinuousAudit(),
    peer: peers.audit()
  });
  const empty = () => {
    const s = state();
    if (s.peer.peers || s.peer.loading || s.peer.resident ||
        s.single.attached || s.pair.visuals.some(v => v.attached))
      throw Error('Previous allocation not fully released');
  };
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  async function sample(label) {
    const before = state();
    const times = [];
    for (let i = 0; i < 10; i++) await frame();
    let prev = await frame();
    for (let i = 0; i < 120; i++) {
      if (document.hidden) throw Error('Tab hidden during measurement');
      const now = await frame();
      times.push(now - prev); prev = now;
      if (times.reduce((a,b) => a+b, 0) > 90000)
        throw Error('Sample exceeded 90s; record as performance failure');
    }
    const sorted = [...times].sort((a,b) => a-b);
    const total = times.reduce((a,b) => a+b, 0);
    const q = p => sorted[Math.ceil(sorted.length*p)-1];
    const after = state();
    if (after.peer.peers || after.peer.loading+after.peer.resident > after.peer.budget-1)
      throw Error('Presence or reserved slot invariant failed');
    return {label, samples: times.length, fps: 1000*times.length/total,
      p50: q(.5), p95: q(.95), max: sorted.at(-1),
      over50: times.filter(t=>t>50).length,
      over100: times.filter(t=>t>100).length, before, after};
  }
  const results = [];
  try {
    empty();
    if (!w.npcPairSmokeView()) throw Error('Fixture view unavailable');
    results.push(await sample('0'));
    if (!w.npcPairSmokeView() || !await w.npcContinuousStart()) throw Error('Single unavailable');
    const one = await sample('1'); results.push(one);
    if (one.after.single.session?.closed || !one.after.single.attached ||
        one.after.single.draws <= one.before.single.draws)
      throw Error('Single actor not actively rendered');
    w.npcContinuousStop(); empty();
    if (!w.npcPairSmokeView() || !await w.npcPairContinuousStart()) throw Error('Pair unavailable');
    const two = await sample('2'); results.push(two);
    if (two.after.pair.session?.closed ||
        two.after.pair.normalPairDrawFrames <= two.before.pair.normalPairDrawFrames ||
        !two.after.pair.visuals.every(v=>v.attached && v.visible))
      throw Error('Paired actors not actively rendered');
    w.npcPairContinuousStop(); empty();
    if (!w.npcPairSmokeView()) throw Error('Fixture view unavailable');
    results.push(await sample('0-recovered'));
    console.log('NPC_PHYSICAL_SAMPLE', JSON.stringify({results,
      userAgent:navigator.userAgent, viewport:[innerWidth,innerHeight],
      devicePixelRatio, physicalDeviceMustBeRecordedManually:true}));
  } finally { w.npcContinuousStop(); w.npcPairContinuousStop(); }
})();
```

## Visual and interaction checks
Observe both NPCs from ordinary player camera, move around and away without smoke teleport except initial fixture setup, check NPC nameplates, non-looping displacement, limb movement (gait candidate only), no wall clipping, no stuck/persistent mannequins, and graceful distance despawn. Confirm normal controls, chat, map, camera and player movement unchanged. Separate the local renderer fixture evidence from actual authenticated multiplayer acceptance. Verify no real inventory, reward, or presence effect. Capture screenshots/video outside sampling and note observed defects.

## Proposed advancement criteria (engineering guardrails, not owner-approved product FPS guarantees)
- All functional invariants pass; both NPCs visibly move, no crashes, no persistent blank scene, no page errors, no unexpected human count, no slot leaks, no resource creep after repeated start/stop. Existing GLB budget unchanged.
- For a practical 30 FPS target, pair median frame time at most 33.3ms, p95 at most 50ms; if baseline already misses these, prioritize base-world optimization rather than increasing density. Pair median p95 across three runs should not exceed baseline median p95 by more than 20%; recovered baseline should return within 20%. Evaluate persistent >100ms frames and user-observed stutter even if medians pass. These are proposed conservative engineering thresholds and can be refined with measured hardware evidence, not automatic public release approval.
- If one phone fails, retain lower density or pause additional NPC visuals; do not remove checks or increase heavy GLB cap.
- Test three actors only in a separately gated fixture after pair acceptance; maintain real-peer reserve and independently verify spacing, movement, lightweight animation, preemption and cleanup. Repeat equivalent benchmark and physical checks before four/five. Production authority, real-account shared state, and economy remain separately gated.

## Record template
Commit / device / browser / orientation / renderer / pass number / stage / sample count / p50 / p95 / max / FPS / long frames / active draws / GLB loading-resident-budget / cleanup / defects / GO-NO-GO / evidence link. Save raw JSON and any failure logs privately; summarize exact evidence in GAME_DEVELOPMENT_RECORD.md. No fabricated device results.
