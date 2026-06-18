# Task 2-d — PCMG Phygital Cross-Membrane Gateway Module

## Files Created
- `/home/z/my-project/src/lib/contracts/pcmg.ts` — Pure TS mirror of PhygitalGateway.sol
- `/home/z/my-project/src/app/api/pcmg/bridge/route.ts` — POST bridge intent
- `/home/z/my-project/src/app/api/pcmg/submit-proof/route.ts` — POST submit multimodal proof
- `/home/z/my-project/src/app/api/pcmg/list/route.ts` — GET intents + avatars
- `/home/z/my-project/src/components/modules/pcmg-panel.tsx` — Full interactive panel (REPLACED stub)

## Key Decisions
- Two-threshold validation mirrors Solidity exactly:
  - `require(isPhysicalValid && fidelityScore > 8000)` — strict `>`, reverts 400 BEFORE ECE check
  - `if (isResonant && resonanceScore > 7500)` — strict `>`, else Slashed
- On require-revert, the in-memory intent status is rolled back to `Executing` (mirrors Solidity tx revert semantics); the API returns 400 with the exact Solidity error message.
- On Completed: `rewardReleased = afcEscrowAmount`, creator reputation +1 (Prisma increment).
- On Slashed: `slashReason = "Emotional dissonance or physical violation"`, slashAmount = afcEscrowAmount (refund recorded in result payload; no $AFC wallet model in this module).
- `intentHash` is computed client-side via a deterministic FNV-1a hash (`hashIntent(creatorAvatarId, description)`), so the panel can preview the hash before bridging.
- `/api/pcmg/list` returns `{ intents, avatars }` so the panel can populate both the intent table and avatar `<select>`s in one call (no separate avatars endpoint needed).
- `verifyPhysicsProof` and `verifyEmotionalResonance` are pure functions exported from the contract module for unit-level reuse.
- The 4-phase flow is implemented as a flex row (lg) / column (mobile) of 4 cards with `ArrowRight`/`ArrowDown` separators.
- Sliders use shadcn Slider with custom `[&_[data-slot=slider-range]]:bg-emerald-500` color overrides for pass/fail visual feedback.
- framer-motion animates: phase card entry, fidelity/resonance meters (spring), and Phase 4 result transitions (AnimatePresence).

## Lint Result
- `bun run lint` passes CLEAN (0 errors, 0 warnings) after fixing a JSX parse error (`/>}` typo in Phase 2 ternary close).

## End-to-End Verification (curl tests against live dev server)
- Scenario 1 "Perfect Latte" (fid=9500, res=8800) → `status=Completed, rewardReleased=5 $AFC, slashed=false` ✓
- Scenario 2 "Cold Coffee Dissonance" (fid=9200, res=3000) → `status=Slashed, slashReason="Emotional dissonance or physical violation"` ✓
- Scenario 3 "Forged Proof" (fid=6500, res=9000) → HTTP 400 `"PCMG: Physical proof invalid or low fidelity"` (rejects BEFORE ECE check) ✓
- Boundary: fid=8000 → 400 (strict `> 8000`) ✓
- Boundary: fid=8001 res=7501 → Completed ✓
- Boundary: fid=9000 res=7500 → Slashed (strict `> 7500`) ✓
- Status guard: re-submitting proof to a Slashed intent → 400 `"PCMG: Invalid status (Slashed)"` ✓

## Issues / Notes
- The other agent's `cognitive-dag.ts` initially showed lint errors but they resolved once my panel's parse error was fixed (cascading parser state). No changes were made to other agents' files.
- The PCMG panel uses rose accent (per `MODULES` config); emerald = success/Completed, rose = Slashed/error, amber = Executing, cyan = Verifying, violet = ECE.
- `serializeForJson` is used on every API response; `parseFromJson` is used on every client fetch to restore BigInt fields (e.g. `afcEscrowAmount`, `rewardReleased`).
