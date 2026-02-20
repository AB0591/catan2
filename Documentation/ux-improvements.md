# UX Improvements: Feedback, AI Messaging & Visual Enhancements

**Commit:** `82043a5`
**Date:** 2026-02-20

---

## Overview

This change addressed six usability gaps identified during first-play testing. The improvements fall into three categories: **resource feedback**, **AI transparency**, and **visual clarity**.

---

## Changes by Area

### 1. Resource Distribution Feedback (TODO #1, #3)

**Problem:** After rolling dice, resources were silently distributed. Players had no way to see what they (or opponents) received.

**Engine change — `src/engine/resources/resourceDistribution.ts`:**
- `distributeResources` now stores per-player gains in `state.lastDistribution`
- `lastDistribution` is a `Record<playerId, Partial<ResourceCards>>` — a plain object (JSON-serializable) mapping each player who received resources to what they got
- Set to `null` on a roll of 7 (no production)

**State change — `src/state/gameState.ts`:**
- Added `lastDistribution: ResourceGains | null` to `GameState`
- Added `ResourceGains` type alias: `Record<string, Partial<ResourceCards>>`
- `lastDistribution` is cleared to `null` on `END_TURN`

**UI — `src/App.tsx`:**
- After a roll (when `turnPhase === 'postRoll'`), a green **"📦 Resources produced"** banner appears in the center panel
- Lists every player who received at least one resource, with their name (in their player color) and what they got (e.g. "Alice: 2 ore, 1 wheat")
- Hidden when no resources were produced or after turn ends

---

### 2. Steal Outcome Display (TODO #4, #6)

**Problem:** After the Robber resolved (whether by human or AI), there was no feedback showing what resource was stolen or from whom.

**Engine change — `src/engine/robber/robberActions.ts`:**
- `handleStealResource` now sets `state.lastSteal` when a resource is stolen
- `lastSteal` contains: `{ thiefId, victimId, resource }`
- Set to `null` if the target had no resources

**State change — `src/state/gameState.ts`:**
- Added `lastSteal: StealEvent | null` to `GameState`
- Added `StealEvent` type: `{ thiefId: string; victimId: string; resource: ResourceType }`
- `lastSteal` is cleared to `null` on `END_TURN`

**UI — `src/App.tsx`:**
- When `lastSteal` is set and `turnPhase === 'postRoll'`, a red **"🦹 [Thief] stole 1 [resource] from [Victim]"** banner appears
- Player names are shown in their respective colors

---

### 3. AI Thinking Indicator & Action Messages (TODO #2, #3, #6)

**Problem:** AI turns ran synchronously and instantly, with no indication to the human player of what the AI was doing.

**Store change — `src/store/gameStore.ts`:**
- Replaced the synchronous `runAITurnsIfNeeded` with an async `runAITurnsAsync` function
- Added `isAIThinking: boolean` to the store (drives the UI indicator)
- Added `aiMessage: string | null` to `GameState` — the AI writes a human-readable description of each action it takes

**Delays:**
| Action | Pause |
|--------|-------|
| Between most AI actions | 700ms |
| After `ROLL_DICE` (to display distribution) | 1200ms |

**AI messages written for each action type:**

| Action | Message |
|--------|---------|
| `ROLL_DICE` | "Bob rolled 9 (4+5) — got 1 sheep" |
| `ROLL_DICE` (total 7) | "Bob rolled 7 (4+3) — 🦹 Robber!" |
| `MOVE_ROBBER` | "Bob moved the robber" |
| `STEAL_RESOURCE` | "Bob stole 1 ore from Alice" |
| `BUILD_SETTLEMENT` | "Bob built a settlement" |
| `BUILD_CITY` | "Bob built a city" |
| `BUILD_ROAD` | "Bob built a road" |
| `PLAY_KNIGHT` | "Bob played a Knight" |
| Thinking (any turn start) | "Bob is thinking..." |
| Discarding | "Bob is discarding..." |

**State change — `src/state/gameState.ts`:**
- Added `aiMessage: string | null` to `GameState`
- Cleared to `null` on `END_TURN`

**UI — `src/App.tsx`:**
- Blue **"🤖 [message]"** banner in center panel shows the current AI message
- Yellow **"🤖 AI is thinking…"** indicator in right sidebar shown while `isAIThinking === true`

---

### 4. Larger Resource Icons (TODO #5)

**Problem:** Resource counts in the player panel used small 11px text pills that were hard to read.

**Change — `src/ui/playerPanel/PlayerPanel.tsx`:**
- Replaced horizontal text pills with vertical card layout
- Each resource now shows an **18px emoji** on top with the **count below** in 12px bold text
- Cards with 0 resources are dimmed (40% opacity) rather than hidden
- Layout: `display: flex; flexDirection: column; alignItems: center` per resource type

---

## New Types Added

```ts
// src/state/gameState.ts

export type ResourceGains = Record<string, Partial<ResourceCards>>;

export type StealEvent = {
  thiefId: string;
  victimId: string;
  resource: ResourceType;
};

// Added to GameState:
lastDistribution: ResourceGains | null;
lastSteal: StealEvent | null;
aiMessage: string | null;
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/state/gameState.ts` | `ResourceGains`, `StealEvent` types; 3 new `GameState` fields |
| `src/state/gameStateFactory.ts` | Initialize new fields to `null` |
| `src/engine/resources/resourceDistribution.ts` | Set `lastDistribution` on returned state |
| `src/engine/turnManager/turnManager.ts` | Clear new fields on `END_TURN` |
| `src/engine/robber/robberActions.ts` | Set `lastSteal` when steal resolves |
| `src/engine/ai/aiPlayer.ts` | Exported `getAIAction` for use by store |
| `src/store/gameStore.ts` | Async AI loop, `isAIThinking`, per-action messages |
| `src/ui/playerPanel/PlayerPanel.tsx` | Larger resource icon cards |
| `src/App.tsx` | Distribution banner, steal banner, AI message banner, AI thinking indicator |
