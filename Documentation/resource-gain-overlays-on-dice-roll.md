# Resource Gain Overlays on Dice Roll

## Summary
Added a new visual cue so resource gains are immediately obvious after a dice roll.  
When resources are distributed, each affected player now gets a floating, mid-size “resource card” stack rendered above their status panel in the left sidebar.

## Behavior
- Trigger: `gameState.lastDistribution` during `postRoll`.
- Scope: only players with positive gains show overlays.
- Duration: `2500ms` fade animation.
- Existing center-top text distribution banner remains in place.

## Implementation Details

### New Component
- `src/ui/resourceGainOverlay/ResourceGainOverlay.tsx`
  - Renders card-like chips with:
    - resource icon
    - `+N` gain count
  - Uses keyframe animation for fade-in/hold/fade-out.
  - Ignores zero-value gains.

### Integration
- `src/App.tsx`
  - Imports and renders `ResourceGainOverlay` above each `PlayerPanel`.
  - Adds helper `hasPositiveGains(...)`.
  - Uses a roll-scoped key (`currentTurn + dice values`) so overlays trigger per roll event.
  - Adds sidebar top padding while overlay is visible to avoid overlap.

## Testing
- Added:
  - `src/ui/resourceGainOverlay/__tests__/ResourceGainOverlay.test.tsx`
- Covered cases:
  - renders for positive gains
  - does not render when gains are all zero

## Validation
- `npm run lint` passed
- `npm test` passed (`21` files, `158` tests)
