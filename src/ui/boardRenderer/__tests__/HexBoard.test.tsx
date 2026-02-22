import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../../../state/gameStateFactory';
import { HexBoard } from '../HexBoard';

function makeBoardState() {
  const state = createInitialGameState(
    [
      { id: 'player_0', name: 'Alice', color: 'red' },
      { id: 'player_1', name: 'Bob', color: 'blue' },
    ],
    42,
    'base'
  );

  const playerColors = Object.fromEntries(
    state.players.map(player => [player.id, player.color === 'red' ? '#ef4444' : '#3b82f6'])
  );

  return { state, playerColors };
}

describe('HexBoard valid vertex highlighting', () => {
  it('renders empty-vertex marker for valid empty vertices', () => {
    const { state, playerColors } = makeBoardState();
    const vertexId = Array.from(state.board.graph.vertices.keys())[0];
    expect(vertexId).toBeDefined();
    if (!vertexId) return;

    render(
      <HexBoard
        boardState={state.board}
        validVertices={[vertexId]}
        playerColors={playerColors}
      />
    );

    expect(screen.getByTestId(`valid-empty-${vertexId}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`valid-upgrade-ring-${vertexId}`)).not.toBeInTheDocument();
  });

  it('renders settlement upgrade ring for valid settlement vertices', () => {
    const { state, playerColors } = makeBoardState();
    const vertexId = Array.from(state.board.graph.vertices.keys())[0];
    expect(vertexId).toBeDefined();
    if (!vertexId) return;

    const boardWithSettlement = {
      ...state.board,
      buildings: {
        ...state.board.buildings,
        [vertexId]: {
          type: 'settlement' as const,
          playerId: 'player_0',
        },
      },
    };

    render(
      <HexBoard
        boardState={boardWithSettlement}
        validVertices={[vertexId]}
        playerColors={playerColors}
      />
    );

    expect(screen.getByTestId(`valid-upgrade-ring-${vertexId}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`valid-empty-${vertexId}`)).not.toBeInTheDocument();
  });

  it('does not render upgrade ring for non-valid settlement vertices', () => {
    const { state, playerColors } = makeBoardState();
    const vertexId = Array.from(state.board.graph.vertices.keys())[0];
    expect(vertexId).toBeDefined();
    if (!vertexId) return;

    const boardWithSettlement = {
      ...state.board,
      buildings: {
        ...state.board.buildings,
        [vertexId]: {
          type: 'settlement' as const,
          playerId: 'player_0',
        },
      },
    };

    render(
      <HexBoard
        boardState={boardWithSettlement}
        validVertices={[]}
        playerColors={playerColors}
      />
    );

    expect(screen.queryByTestId(`valid-upgrade-ring-${vertexId}`)).not.toBeInTheDocument();
  });

  it('renders city highlight ring for valid city vertices', () => {
    const { state, playerColors } = makeBoardState();
    const vertexId = Array.from(state.board.graph.vertices.keys())[0];
    expect(vertexId).toBeDefined();
    if (!vertexId) return;

    const boardWithCity = {
      ...state.board,
      buildings: {
        ...state.board.buildings,
        [vertexId]: {
          type: 'city' as const,
          playerId: 'player_0',
        },
      },
    };

    render(
      <HexBoard
        boardState={boardWithCity}
        validVertices={[vertexId]}
        playerColors={playerColors}
      />
    );

    expect(screen.getByTestId(`valid-city-ring-${vertexId}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`valid-empty-${vertexId}`)).not.toBeInTheDocument();
  });
});
