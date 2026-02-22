import type { FC } from 'react';
import type { BarbarianAttackSummary } from '../../state/gameState';
import type { PlayerState } from '../../state/playerState';

type CkBarbarianModalProps = {
  summary: BarbarianAttackSummary;
  players: PlayerState[];
  onClose: () => void;
};

function playerName(players: PlayerState[], playerId: string): string {
  return players.find(p => p.id === playerId)?.name ?? playerId;
}

export const CkBarbarianModal: FC<CkBarbarianModalProps> = ({ summary, players, onClose }) => {
  const defended = summary.defenseStrength >= summary.cityStrength;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2200,
        background: 'radial-gradient(circle at center, rgba(239,68,68,0.2), rgba(2,6,23,0.85) 60%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Barbarian attack resolution"
    >
      <div
        style={{
          width: 560,
          maxWidth: '92vw',
          borderRadius: 16,
          border: defended ? '2px solid #22c55e' : '2px solid #ef4444',
          background: '#020617',
          color: '#e2e8f0',
          padding: 24,
          boxShadow: '0 24px 54px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ fontSize: 12, letterSpacing: 1.2, color: '#fca5a5', fontWeight: 700 }}>
          BARBARIAN ATTACK
        </div>
        <h2 style={{ marginTop: 6, marginBottom: 10, fontSize: 24 }}>
          {defended ? 'Catan Defended!' : 'Barbarians Breached Catan'}
        </h2>
        <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
          <div style={{ flex: 1, background: 'rgba(239,68,68,0.15)', border: '1px solid #7f1d1d', borderRadius: 10, padding: 10 }}>
            <div style={{ fontSize: 11, color: '#fecaca' }}>Barbarian Strength</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{summary.cityStrength}</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(59,130,246,0.14)', border: '1px solid #1e40af', borderRadius: 10, padding: 10 }}>
            <div style={{ fontSize: 11, color: '#bfdbfe' }}>Knight Defense</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{summary.defenseStrength}</div>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd', marginBottom: 6 }}>Contributions</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 6 }}>
            {Object.entries(summary.contributions).map(([playerId, strength]) => (
              <div key={playerId} style={{ display: 'contents' }}>
                <div style={{ background: 'rgba(15,23,42,0.85)', borderRadius: 6, padding: '6px 8px' }}>{playerName(players, playerId)}</div>
                <div style={{ background: 'rgba(15,23,42,0.85)', borderRadius: 6, padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{strength}</div>
              </div>
            ))}
          </div>
        </div>

        {!defended && summary.citiesDowngraded.length > 0 && (
          <div style={{ marginBottom: 10, color: '#fecaca', fontSize: 12 }}>
            Lost Cities: {summary.citiesDowngraded.map(item => `${playerName(players, item.playerId)} (${item.vertexId})`).join(', ')}
          </div>
        )}
        {defended && summary.rewarded.length > 0 && (
          <div style={{ marginBottom: 10, color: '#bbf7d0', fontSize: 12 }}>
            Rewards: {summary.rewarded.map(playerId => playerName(players, playerId)).join(', ')}
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: 8,
            border: 'none',
            borderRadius: 8,
            padding: '10px 0',
            background: defended ? '#22c55e' : '#ef4444',
            color: '#0f172a',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

