# AI Competitive Upgrade Plan (Adaptive Shallow Search)

## Summary
Upgrade AI from static heuristics to adaptive shallow search so it behaves more like a real player while staying performant in-browser.

Default strategy:
- 1-ply search on all post-roll turns.
- Escalate to 2-ply beam search only in critical states.
- Expose 3 difficulty levels (`easy`, `normal`, `hard`).

## Public API and Type Changes
- Add `AIDifficulty = 'easy' | 'normal' | 'hard'`.
- Add `AISearchConfig` (beam width, candidate caps, depth policy, eval weights).
- Add `AIProfile` (`id`, `difficulty`, `config`).
- Extend store state and API:
  - `aiProfilesByPlayerId: Record<string, AIProfile>`
  - `startGame(playerNames, aiPlayerIds, aiDifficulties?)`
  - `setAIDifficulty(playerId, difficulty)`
- Update start screen UI to choose AI difficulty per AI player.

## Core Implementation Design
1. Replace current post-roll heuristic with pipeline:
   - `generateCandidateActions(state, playerId, phase)`
   - `simulateAction(state, action)` (via `dispatchAction`)
   - `scoreState(state, playerId, context)`
   - `searchBestAction(state, playerId, profile)`
2. Adaptive depth policy:
   - Base depth = 1.
   - Depth = 2 when near-win, robber/discard pressure, or major title races (longest road/largest army).
3. Candidate generation includes:
   - Build settlement/city/road (top-N by placement score)
   - Buy dev card
   - Play eligible dev cards
   - Limited bank-trade candidates
   - End turn
4. Evaluation function weighted terms:
   - VP progression
   - Expected production
   - Expansion potential
   - Hand efficiency / discard risk
   - Robber pressure and leader disruption
   - Title race value (longest road/largest army)

## Difficulty Profiles
- `easy`: depth 1, small candidate cap, occasional randomization.
- `normal`: adaptive depth, medium beam, light randomization.
- `hard`: adaptive depth, larger beam, deterministic tie-break.

## Failure Handling and Safeguards
- Fallback to legacy heuristic if search returns no valid action.
- Time/iteration cap with best-so-far action return.
- Loop protection using visited state keys.
- Deterministic hard mode from seed/state.

## Test and Acceptance Criteria
- AI chooses immediate winning move when available.
- AI blocks obvious opponent wins when possible.
- AI uses trades when they unlock high-value builds.
- No illegal actions emitted across all phases.
- Existing full test suite remains green.
- Performance targets (median decision time):
  - `easy` <= 10ms
  - `normal` <= 30ms
  - `hard` <= 60ms

## Rollout Sequence
1. Add config/types and keep legacy fallback path.
2. Implement candidate generation and evaluator.
3. Implement depth-1 search.
4. Implement adaptive depth-2 beam.
5. Wire difficulty controls to UI/store.
6. Tune weights and finalize test/perf coverage.

## Assumptions and Defaults
- Initial search upgrade focuses on `postRoll` decisions.
- Setup/discard/robber phases keep current heuristic behavior initially.
- No ML model; deterministic search + heuristics architecture.
- Design should remain extensible for future Cities & Knights action expansion.
