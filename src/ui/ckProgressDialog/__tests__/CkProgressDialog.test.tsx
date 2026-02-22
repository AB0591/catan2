import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createPlayer } from '../../../state/playerState';
import { CkProgressDialog } from '../CkProgressDialog';

describe('CkProgressDialog', () => {
  it('collects selected resource and confirms play', () => {
    const p1 = createPlayer('p1', 'Alice', 'red');
    const p2 = createPlayer('p2', 'Bob', 'blue');
    const onConfirm = vi.fn();

    render(
      <CkProgressDialog
        card={{ id: 'trade_resourceMonopoly_1', deck: 'trade', type: 'resourceMonopoly' }}
        players={[p1, p2]}
        currentPlayerId="p1"
        progressHandCounts={{ p1: 1, p2: 2 }}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ore' } });
    fireEvent.click(screen.getByRole('button', { name: /play card/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0][0]).toMatchObject({ resource: 'ore' });
  });

  it('disables spy confirm when no valid opponent has progress cards', () => {
    const p1 = createPlayer('p1', 'Alice', 'red');
    const p2 = createPlayer('p2', 'Bob', 'blue');

    render(
      <CkProgressDialog
        card={{ id: 'politics_spy_1', deck: 'politics', type: 'spy' }}
        players={[p1, p2]}
        currentPlayerId="p1"
        progressHandCounts={{ p1: 1, p2: 0 }}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText(/No opponent has progress cards to steal/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /play card/i })).toBeDisabled();
  });
});
