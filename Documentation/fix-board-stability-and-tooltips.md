# UX Fixes: Board Stability & Resource Tooltips

## Original TODO.md Contents

```
1) Prevent the gameboard from moving on the screen when notifications such as 'Player 2 is thinking' appear.  This probably happens for multiple types of notifications, please find a fix them all
2) Add a tooltip over the resource icons to display text that identifies which resource they are
3)
```

---

## Fix 1: Board Layout Stability

### Problem

The game board shifted up and down whenever notifications appeared or disappeared in the center panel (AI message, resource distribution banner, steal outcome banner). This happened because all these elements sat in a `display: flex; flexDirection: column; justifyContent: center` container — as elements entered/exited the flow, the board was re-centered, causing visible movement.

### Root Cause

The center column rendered the phase label, then conditionally three different notification divs, then the `<HexBoard>` SVG. Each notification had its own `marginBottom`. When any of them appeared or disappeared, the total height of content above the board changed, causing `justifyContent: center` to reposition everything.

### Fix (`src/App.tsx`)

Replaced the ad-hoc notification divs with a **fixed-height reserved notification area** (120px tall) that sits permanently above the board. Notifications render inside this container using `justifyContent: flex-end` so they stack up from the bottom edge. The board position is now constant regardless of whether 0, 1, or 2 notifications are visible.

```tsx
{/* Fixed-height notification area — reserved space so the board never moves */}
<div style={{ height: 120, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'flex-end',
              width: '100%', paddingBottom: 4 }}>
  {/* phase label always rendered */}
  {/* AI message, distribution banner, steal banner — only one shown at a time */}
</div>

<HexBoard ... />
```

Additional improvement: when an AI message is showing, the distribution and steal banners are suppressed (they don't stack). This prevents overflow of the fixed-height area.

### Notifications Fixed

| Notification | Trigger |
|---|---|
| Phase label | Always visible |
| 🤖 AI message | During AI turn (thinking, rolled, built, etc.) |
| 📦 Resources produced | After non-7 dice roll, `turnPhase === 'postRoll'` |
| 🦹 Steal outcome | After STEAL_RESOURCE resolves, `turnPhase === 'postRoll'` |

---

## Fix 2: Resource Icon Tooltips

### Problem

The resource icons in the player panel showed emoji only (🌲🧱🐑🌾⛰️). New players couldn't tell which resource was which without memorizing the icons.

### Fix (`src/ui/playerPanel/PlayerPanel.tsx`)

Added a `RESOURCE_NAMES` lookup map and applied it as a `title` attribute on each resource card div. The browser renders this as a native tooltip on hover.

```ts
const RESOURCE_NAMES: Record<string, string> = {
  wood:  'Wood (Lumber)',
  brick: 'Brick (Grain)',
  sheep: 'Sheep (Wool)',
  wheat: 'Wheat (Grain)',
  ore:   'Ore',
};
```

```tsx
<div key={res} title={RESOURCE_NAMES[res] ?? res} style={{ ... }}>
```

---

## Files Changed

| File | Change |
|---|---|
| `src/App.tsx` | Notification area replaced with fixed-height 120px container; only one notification shown at a time |
| `src/ui/playerPanel/PlayerPanel.tsx` | Added `RESOURCE_NAMES` map; `title` tooltip on each resource icon |
