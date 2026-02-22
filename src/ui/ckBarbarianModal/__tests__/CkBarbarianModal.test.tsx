import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createPlayer } from '../../../state/playerState';
import { CkBarbarianModal } from '../CkBarbarianModal';

describe('CkBarbarianModal', () => {
  it('renders defended state and rewards', () => {
    const p1 = createPlayer('p1', 'Alice', 'red');
    const p2 = createPlayer('p2', 'Bob', 'blue');

    render(
      <CkBarbarianModal
        summary={{
          cityStrength: 5,
          defenseStrength: 6,
          contributions: { p1: 3, p2: 3 },
          losers: [],
          rewarded: ['p2'],
          citiesDowngraded: [],
        }}
        players={[p1, p2]}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: /Catan Defended!/i })).toBeInTheDocument();
    expect(screen.getByText(/Rewards: Bob/i)).toBeInTheDocument();
  });

  it('renders breach state and closes on continue', () => {
    const p1 = createPlayer('p1', 'Alice', 'red');
    const p2 = createPlayer('p2', 'Bob', 'blue');
    const onClose = vi.fn();

    render(
      <CkBarbarianModal
        summary={{
          cityStrength: 7,
          defenseStrength: 4,
          contributions: { p1: 2, p2: 2 },
          losers: ['p1'],
          rewarded: [],
          citiesDowngraded: [{ playerId: 'p1', vertexId: 'v_0_0' }],
        }}
        players={[p1, p2]}
        onClose={onClose}
      />
    );

    expect(screen.getByRole('heading', { name: /Barbarians Breached Catan/i })).toBeInTheDocument();
    expect(screen.getByText(/Lost Cities: Alice \(v_0_0\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
