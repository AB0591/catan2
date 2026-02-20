import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../../store/gameStore';

describe('gameStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useGameStore.setState({
      gameState: null,
      selectedAction: null,
      lastPlacedSettlementVertexId: null,
      aiPlayerIds: [],
    });
  });

  it('startGame creates a game with correct player count', () => {
    useGameStore.getState().startGame(['Alice', 'Bob', 'Charlie']);
    const { gameState } = useGameStore.getState();
    expect(gameState).not.toBeNull();
    expect(gameState!.players).toHaveLength(3);
    expect(gameState!.players[0].name).toBe('Alice');
    expect(gameState!.players[1].name).toBe('Bob');
    expect(gameState!.players[2].name).toBe('Charlie');
  });

  it('dispatch updates game state', () => {
    useGameStore.getState().startGame(['Alice', 'Bob']);
    const { gameState: initial } = useGameStore.getState();
    expect(initial).not.toBeNull();

    // Place a settlement at a valid vertex during setup
    const validVertices = useGameStore.getState().getValidPlacements().vertices;
    expect(validVertices.length).toBeGreaterThan(0);

    const vertexId = validVertices[0];
    useGameStore.getState().dispatch({
      type: 'PLACE_SETTLEMENT',
      playerId: 'player_0',
      payload: { vertexId },
      timestamp: Date.now(),
    });

    const { gameState: after } = useGameStore.getState();
    expect(after!.board.buildings[vertexId]).toBeDefined();
    expect(after!.board.buildings[vertexId].playerId).toBe('player_0');
  });

  it('getCurrentPlayer returns correct player', () => {
    useGameStore.getState().startGame(['Alice', 'Bob']);
    const player = useGameStore.getState().getCurrentPlayer();
    expect(player).not.toBeNull();
    expect(player!.name).toBe('Alice');
    expect(player!.id).toBe('player_0');
  });
});
