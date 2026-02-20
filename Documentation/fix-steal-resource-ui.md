# Fix: Steal Resource UI

**Commit:** `c5b6bc5`
**Date:** 2026-02-20

---

## Problem

When a player rolled a 7 and moved the Robber onto a hex containing opponent buildings, the game engine correctly transitioned `turnPhase` to `'stealing'`. The UI displayed the label **"🤜 Steal a resource"**, but provided no interactive element to complete the action. The game was permanently stuck — no button, dialog, or click handler existed to dispatch a `STEAL_RESOURCE` action.

---

## Root Cause

The engine handler `handleStealResource` in `src/engine/robber/robberActions.ts` was fully implemented and expected a `STEAL_RESOURCE` action with payload `{ targetPlayerId: string }`. However, nothing in the UI ever constructed or dispatched that action during the `'stealing'` turn phase.

The private helper `getAdjacentOpponents` (used internally within `robberActions.ts`) was the only way to determine which opponents were eligible to steal from — but it was not accessible to the UI layer.

---

## Fix

### `src/engine/robber/robberActions.ts`

Extracted and exported `getAdjacentOpponents` as a new public function `getStealTargets`:

```ts
export function getStealTargets(state: GameState, currentPlayerId: string): string[] {
  return getAdjacentOpponents(state, state.board.robberHex, currentPlayerId);
}
```

This allows the UI to determine the list of stealable opponents without duplicating engine logic.

### `src/ui/stealDialog/StealDialog.tsx` *(new file)*

A modal overlay component that renders when `turnPhase === 'stealing'`. It:
- Lists each eligible opponent by name and color dot
- Shows each opponent's current card count
- Provides a per-player **Steal** button
- On click, calls `onSteal(targetPlayerId)`

### `src/ui/stealDialog/index.ts` *(new file)*

Barrel export for the component.

### `src/App.tsx`

- Imported `StealDialog` and `getStealTargets`
- Added a conditional overlay that renders `<StealDialog>` when `turnPhase === 'stealing'`
- On opponent selection, dispatches `STEAL_RESOURCE` with `{ targetPlayerId }`
- The engine then picks a random resource from the target's hand (using seeded RNG) and transitions to `'postRoll'`

---

## Flow After Fix

```
ROLL_DICE(7)
  → turnPhase = 'discarding'  (if any player has >7 cards)
  → DISCARD_RESOURCES (per player)
  → turnPhase = 'robber'
  → Player clicks hex on board → MOVE_ROBBER dispatched
  → turnPhase = 'stealing'    (if opponents adjacent to new hex)
  → StealDialog appears listing eligible opponents    ← NEW
  → Player clicks opponent → STEAL_RESOURCE dispatched ← NEW
  → Engine randomly picks 1 resource from target
  → turnPhase = 'postRoll'
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/engine/robber/robberActions.ts` | Added exported `getStealTargets()` |
| `src/ui/stealDialog/StealDialog.tsx` | New component |
| `src/ui/stealDialog/index.ts` | New barrel export |
| `src/App.tsx` | Renders `StealDialog` overlay during `'stealing'` phase |
