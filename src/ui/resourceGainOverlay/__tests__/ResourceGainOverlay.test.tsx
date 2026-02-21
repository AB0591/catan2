import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResourceGainOverlay } from '../ResourceGainOverlay';

describe('ResourceGainOverlay', () => {
  it('renders cards for positive gains', () => {
    render(
      <ResourceGainOverlay
        gains={{ wood: 2, brick: 0, sheep: 1 }}
        durationMs={2500}
      />
    );

    expect(screen.getByTestId('resource-gain-overlay')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('does not render when gains are empty', () => {
    render(<ResourceGainOverlay gains={{ wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 }} />);
    expect(screen.queryByTestId('resource-gain-overlay')).not.toBeInTheDocument();
  });
});
