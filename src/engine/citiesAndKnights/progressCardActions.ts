import type { GameAction, GameState, ProgressCard, ProgressDeckType } from '../../state/gameState';
import type { CommodityType, ResourceType } from '../../state/playerState';
import { addCommodities, addResources } from '../resources/resourceDistribution';

const MAX_PROGRESS_HAND_SIZE = 4;

function getProgressHands(state: GameState): Record<string, ProgressCard[]> {
  return state.ck?.progressHands ?? {};
}

function getProgressDecks(state: GameState): NonNullable<GameState['ck']>['progressDecks'] | null {
  return state.ck?.progressDecks ?? null;
}

function withProgressState(
  state: GameState,
  updater: (hands: Record<string, ProgressCard[]>, decks: NonNullable<GameState['ck']>['progressDecks']) => {
    hands: Record<string, ProgressCard[]>;
    decks: NonNullable<GameState['ck']>['progressDecks'];
  }
): GameState {
  if (state.expansionRules !== 'cities_and_knights' || !state.ck) return state;
  const result = updater(getProgressHands(state), getProgressDecks(state)!);
  return {
    ...state,
    ck: {
      ...state.ck,
      progressHands: result.hands,
      progressDecks: result.decks,
    },
  };
}

function removeCardFromHand(
  hands: Record<string, ProgressCard[]>,
  playerId: string,
  cardId: string
): { hands: Record<string, ProgressCard[]>; card: ProgressCard | null } {
  const hand = hands[playerId] ?? [];
  const idx = hand.findIndex(card => card.id === cardId);
  if (idx === -1) return { hands, card: null };
  const card = hand[idx];
  return {
    hands: {
      ...hands,
      [playerId]: hand.filter((_, i) => i !== idx),
    },
    card,
  };
}

function drawCard(
  hands: Record<string, ProgressCard[]>,
  decks: NonNullable<GameState['ck']>['progressDecks'],
  playerId: string,
  deckType: ProgressDeckType
): { hands: Record<string, ProgressCard[]>; decks: NonNullable<GameState['ck']>['progressDecks']; card: ProgressCard | null } {
  const hand = hands[playerId] ?? [];
  if (hand.length >= MAX_PROGRESS_HAND_SIZE) return { hands, decks, card: null };
  const deck = decks[deckType];
  if (!deck || deck.length === 0) return { hands, decks, card: null };

  const [card, ...remaining] = deck;
  return {
    hands: {
      ...hands,
      [playerId]: [...hand, card],
    },
    decks: {
      ...decks,
      [deckType]: remaining,
    },
    card,
  };
}

function preferredDeckForPlayer(state: GameState, playerId: string): ProgressDeckType[] {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return ['politics', 'science', 'trade'];

  const sorted = ([
    { deck: 'politics' as const, level: player.cityImprovements.politics },
    { deck: 'science' as const, level: player.cityImprovements.science },
    { deck: 'trade' as const, level: player.cityImprovements.trade },
  ]).sort((a, b) => b.level - a.level || a.deck.localeCompare(b.deck));

  return sorted.map(item => item.deck);
}

export function grantProgressCardReward(state: GameState, playerId: string): GameState {
  if (state.expansionRules !== 'cities_and_knights' || !state.ck) return state;
  const deckOrder = preferredDeckForPlayer(state, playerId);

  let resultState = state;
  let drawn = false;
  for (const deck of deckOrder) {
    if (!resultState.ck) return state;
    const beforeDeckLength = resultState.ck.progressDecks[deck].length;
    const beforeHandLength = (resultState.ck.progressHands[playerId] ?? []).length;
    resultState = withProgressState(resultState, (hands, decks) => {
      const { hands: nextHands, decks: nextDecks } = drawCard(hands, decks, playerId, deck);
      return { hands: nextHands, decks: nextDecks };
    });
    if (!resultState.ck) return state;
    const afterDeckLength = resultState.ck.progressDecks[deck].length;
    const afterHandLength = (resultState.ck.progressHands[playerId] ?? []).length;
    if (afterDeckLength < beforeDeckLength || afterHandLength > beforeHandLength) {
      drawn = true;
      break;
    }
  }

  return drawn ? resultState : state;
}

function stealProgressCard(
  hands: Record<string, ProgressCard[]>,
  fromPlayerId: string,
  toPlayerId: string
): Record<string, ProgressCard[]> {
  const fromHand = hands[fromPlayerId] ?? [];
  const toHand = hands[toPlayerId] ?? [];
  if (fromHand.length === 0 || toHand.length >= MAX_PROGRESS_HAND_SIZE) return hands;
  const [stolen, ...rest] = [...fromHand].sort((a, b) => a.id.localeCompare(b.id));
  return {
    ...hands,
    [fromPlayerId]: rest,
    [toPlayerId]: [...toHand, stolen],
  };
}

export function handlePlayProgressCard(state: GameState, action: GameAction): GameState {
  if (state.expansionRules !== 'cities_and_knights' || !state.ck) return state;
  const { cardId, targetPlayerId, resource, commodity } = action.payload as {
    cardId?: string;
    targetPlayerId?: string;
    resource?: ResourceType;
    commodity?: CommodityType;
  };
  if (!cardId) return state;

  const { hands: removedHands, card } = removeCardFromHand(state.ck.progressHands, action.playerId, cardId);
  if (!card) return state;

  let nextState: GameState = {
    ...state,
    ck: {
      ...state.ck,
      progressHands: removedHands,
    },
  };

  const playerIndex = nextState.players.findIndex(p => p.id === action.playerId);
  if (playerIndex === -1) return state;

  switch (card.type) {
    case 'warlord': {
      const knights = { ...nextState.board.knights };
      for (const [knightId, knight] of Object.entries(knights)) {
        if (knight.ownerId === action.playerId) {
          knights[knightId] = { ...knight, active: true };
        }
      }
      nextState = { ...nextState, board: { ...nextState.board, knights } };
      break;
    }

    case 'constitution': {
      const updatedPlayers = nextState.players.map((p, idx) => (
        idx === playerIndex ? { ...p, ckVictoryPoints: p.ckVictoryPoints + 1 } : p
      ));
      nextState = { ...nextState, players: updatedPlayers };
      break;
    }

    case 'spy': {
      const targetId = targetPlayerId
        ?? nextState.players.find(p => p.id !== action.playerId && (nextState.ck?.progressHands[p.id]?.length ?? 0) > 0)?.id;
      if (targetId) {
        nextState = {
          ...nextState,
          ck: {
            ...nextState.ck!,
            progressHands: stealProgressCard(nextState.ck!.progressHands, targetId, action.playerId),
          },
        };
      }
      break;
    }

    case 'deserter': {
      const opponentKnights = Object.values(nextState.board.knights)
        .filter(k => k.ownerId !== action.playerId)
        .sort((a, b) => b.level - a.level || a.id.localeCompare(b.id));
      const targetKnight = opponentKnights[0];
      if (targetKnight) {
        const updatedKnights = { ...nextState.board.knights };
        if (targetKnight.level === 1) {
          delete updatedKnights[targetKnight.id];
        } else {
          updatedKnights[targetKnight.id] = { ...targetKnight, level: (targetKnight.level - 1) as 1 | 2 | 3 };
        }
        nextState = { ...nextState, board: { ...nextState.board, knights: updatedKnights } };
      }
      break;
    }

    case 'irrigation': {
      const updatedPlayers = nextState.players.map((p, idx) => (
        idx === playerIndex ? addResources(p, { wheat: 2 }) : p
      ));
      nextState = { ...nextState, players: updatedPlayers };
      break;
    }

    case 'mining': {
      const updatedPlayers = nextState.players.map((p, idx) => (
        idx === playerIndex ? addResources(p, { ore: 2 }) : p
      ));
      nextState = { ...nextState, players: updatedPlayers };
      break;
    }

    case 'engineer': {
      const eligible = Object.entries(nextState.board.buildings)
        .filter(([vertexId, b]) => b.playerId === action.playerId && b.type === 'city' && !nextState.board.cityWalls[vertexId])
        .map(([vertexId]) => vertexId)
        .sort();
      const targetVertexId = eligible[0];
      if (targetVertexId) {
        nextState = {
          ...nextState,
          board: {
            ...nextState.board,
            cityWalls: {
              ...nextState.board.cityWalls,
              [targetVertexId]: action.playerId,
            },
          },
        };
      }
      break;
    }

    case 'chemist': {
      const updatedPlayers = nextState.players.map((p, idx) => (
        idx === playerIndex ? addCommodities(p, { paper: 1, coin: 1 }) : p
      ));
      nextState = { ...nextState, players: updatedPlayers };
      break;
    }

    case 'tradeMonopoly': {
      const chosenCommodity = commodity ?? 'cloth';
      let totalTaken = 0;
      const updatedPlayers = nextState.players.map(p => {
        if (p.id === action.playerId) return p;
        const amount = p.commodities[chosenCommodity];
        totalTaken += amount;
        return {
          ...p,
          commodities: {
            ...p.commodities,
            [chosenCommodity]: 0,
          },
        };
      });
      updatedPlayers[playerIndex] = addCommodities(updatedPlayers[playerIndex], { [chosenCommodity]: totalTaken });
      nextState = { ...nextState, players: updatedPlayers };
      break;
    }

    case 'resourceMonopoly': {
      const chosenResource = resource ?? 'wood';
      let totalTaken = 0;
      const updatedPlayers = nextState.players.map(p => {
        if (p.id === action.playerId) return p;
        const amount = p.resources[chosenResource];
        totalTaken += amount;
        return {
          ...p,
          resources: {
            ...p.resources,
            [chosenResource]: 0,
          },
        };
      });
      updatedPlayers[playerIndex] = addResources(updatedPlayers[playerIndex], { [chosenResource]: totalTaken });
      nextState = { ...nextState, players: updatedPlayers };
      break;
    }

    case 'merchantGift': {
      const updatedPlayers = nextState.players.map((p, idx) => (
        idx === playerIndex ? addCommodities(p, { cloth: 1, coin: 1, paper: 1 }) : p
      ));
      nextState = { ...nextState, players: updatedPlayers };
      break;
    }

    case 'merchantFleet': {
      const chosenResource = resource ?? 'wood';
      const updatedPlayers = nextState.players.map((p, idx) => (
        idx === playerIndex ? addResources(p, { [chosenResource]: 2 }) : p
      ));
      nextState = { ...nextState, players: updatedPlayers };
      break;
    }

    default:
      break;
  }

  return nextState;
}
