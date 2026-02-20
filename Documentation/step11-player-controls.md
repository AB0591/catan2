# Step 11: Player Controls

## New Components

### `DevCardHand` (`src/ui/devCardHand/DevCardHand.tsx`)

Renders a player's development cards with play buttons. Cards purchased this turn cannot be played.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `cards` | `DevelopmentCard[]` | Player's dev cards |
| `currentTurn` | `number` | Current turn number (for turnBought check) |
| `canPlay` | `boolean` | Whether player can play a card this turn |
| `onPlayCard` | `(index, payload) => void` | Callback when card is played |

Supported card types and their payloads:
- **Knight**: `{}` → triggers robber phase
- **Year of Plenty**: `{ resource1, resource2 }` → two resource dropdowns
- **Monopoly**: `{ resource }` → one resource dropdown
- **Road Building**: `{}` → enter road-building mode (place 2 roads)
- **Victory Point**: shown but not playable

### `DiscardDialog` (`src/ui/discardDialog/DiscardDialog.tsx`)

Modal dialog shown when a player rolls 7 and has >7 cards. Lets them select exactly `floor(total/2)` cards to discard.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `player` | `PlayerState` | Player who must discard |
| `mustDiscard` | `number` | Number of cards to discard |
| `onDiscard` | `(resources) => void` | Callback with selected resources |

### `TradeDialog` (`src/ui/tradeDialog/TradeDialog.tsx`)

Stub component — full implementation in Step 12.

## Game Phase Flow

The App.tsx handles all game phases:

| Phase | UI behaviour |
|-------|-------------|
| `setup` (even setupOrderIndex) | Highlight valid settlement vertices |
| `setup` (odd setupOrderIndex) | Highlight valid road edges |
| `playing / preRoll` | Show Roll Dice button |
| `playing / robber` | Highlight hexes, click hex to move robber |
| `playing / discarding` | Show DiscardDialog modal |
| `playing / postRoll` | Show BuildMenu, DevCardHand, End Turn button |
| `finished` | Show winner banner |

## Store Helpers

`gameStore.ts` additions:
- `getCurrentPlayer()` — returns `PlayerState` for current player or null
- `getValidPlacements()` — returns `{ vertices, edges }` based on current phase and `selectedAction`
- `lastPlacedSettlementVertexId` — tracks last settlement for road adjacency during setup
- `aiPlayerIds` — list of AI-controlled player IDs (used in Step 13)

## Tests

`src/ui/__tests__/gameStore.test.ts`:
1. `startGame` creates a game with correct player count and names
2. `dispatch` updates game state (places settlement)
3. `getCurrentPlayer` returns the player at `currentPlayerIndex`
