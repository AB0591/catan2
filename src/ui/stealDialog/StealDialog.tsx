import type { PlayerState } from '../../state/playerState';

const PLAYER_CSS_COLORS: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  orange: '#f97316',
  white: '#e5e7eb',
};

type StealDialogProps = {
  targets: PlayerState[];
  onSteal: (targetPlayerId: string) => void;
};

export function StealDialog({ targets, onSteal }: StealDialogProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: '#1e293b', borderRadius: 12, padding: 28, minWidth: 280,
        border: '2px solid #f97316', textAlign: 'center',
      }}>
        <h2 style={{ color: '#ffd700', marginTop: 0, marginBottom: 8, fontSize: 20 }}>🤜 Steal a Resource</h2>
        <p style={{ color: '#aaa', fontSize: 13, marginBottom: 20 }}>
          Choose a player to steal one resource card from.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {targets.map(player => (
            <button
              key={player.id}
              onClick={() => onSteal(player.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px', borderRadius: 8, cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)',
                border: `2px solid ${PLAYER_CSS_COLORS[player.color] ?? '#fff'}`,
                color: '#fff', fontSize: 14, fontWeight: 'bold',
              }}
            >
              <span style={{
                width: 14, height: 14, borderRadius: '50%',
                background: PLAYER_CSS_COLORS[player.color] ?? '#fff',
                flexShrink: 0,
              }} />
              {player.name}
              <span style={{ marginLeft: 'auto', color: '#aaa', fontWeight: 'normal', fontSize: 12 }}>
                {Object.values(player.resources).reduce((a, b) => a + b, 0)} cards
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
