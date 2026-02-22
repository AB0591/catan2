# Cities & Knights Phase 7-8 Implementation

## Scope
This update completes **Phase 7 (UI upgrades)** and **Phase 8 (polish/regression)** from `CITIES_AND_KNIGHTS_SPEC.md`.

## Phase 7: UI Upgrades Completed
- Added **progress card parameter modal** (`CkProgressDialog`) for cards that need player input:
  - `resourceMonopoly`
  - `tradeMonopoly`
  - `merchantFleet`
  - `spy`
- Added **barbarian attack cinematic modal** (`CkBarbarianModal`) showing:
  - city strength vs knight defense
  - per-player contributions
  - rewards or city downgrades
- Updated right sidebar progress card UX:
  - cards grouped by deck (**Politics / Science / Trade**)
  - deck-accented styling for faster scanning
  - proper disabled-state messaging when cards cannot be played

## Phase 8: Polish + Regression Completed
- Added in-game **keyboard shortcut system** with a toggleable help panel (`?` key):
  - `R` roll, `E` end turn, `1/2/3` build modes
  - `K` knight mode, `W` city wall mode, `Esc` clear modes
- Added accessibility improvements:
  - phase/status banner now uses `role="status"` and `aria-live="polite"`
  - CK modal dialogs use semantic dialog attributes
- Added regression tests for new CK UI components:
  - `src/ui/ckProgressDialog/__tests__/CkProgressDialog.test.tsx`
  - `src/ui/ckBarbarianModal/__tests__/CkBarbarianModal.test.tsx`

## Validation
All checks pass:
- `npm run lint`
- `npm run build`
- `npm test`

## Notes
- Base game behavior remains unchanged; all existing tests continue to pass.
- `CITIES_AND_KNIGHTS_SPEC.md` is still present in the working tree as an untracked reference file.
