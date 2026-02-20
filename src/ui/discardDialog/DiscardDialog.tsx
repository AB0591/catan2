import { useState } from 'react';
import type { FC } from 'react';
import type { PlayerState, ResourceType } from '../../state/playerState';

export type DiscardDialogProps = {
  player: PlayerState;
  mustDiscard: number;
  onDiscard: (resources: Partial<Record<ResourceType, number>>) => void;
};

const RESOURCES: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
const RESOURCE_LABELS: Record<ResourceType, string> = {
  wood: '🌲 Wood',
  brick: '🧱 Brick',
  sheep: '🐑 Sheep',
  wheat: '🌾 Wheat',
  ore: '⛰️ Ore',
};

export const DiscardDialog: FC<DiscardDialogProps> = ({ player, mustDiscard, onDiscard }) => {
  const [selected, setSelected] = useState<Record<ResourceType, number>>({
    wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0,
  });

  const totalSelected = Object.values(selected).reduce((a, b) => a + b, 0);
  const isValid = totalSelected === mustDiscard;

  const adjust = (res: ResourceType, delta: number) => {
    const current = selected[res];
    const max = player.resources[res];
    const newVal = Math.max(0, Math.min(max, current + delta));
    setSelected({ ...selected, [res]: newVal });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{ background: '#1e293b', border: '2px solid #f97316', borderRadius: 12, padding: 24, minWidth: 300 }}>
        <h3 style={{ color: '#f97316', marginTop: 0, marginBottom: 12 }}>
          ⚠️ {player.name}: Discard {mustDiscard} cards
        </h3>
        <div style={{ color: '#aaa', fontSize: 12, marginBottom: 16 }}>
          Selected: {totalSelected} / {mustDiscard}
        </div>

        {RESOURCES.map(res => (
          player.resources[res] > 0 && (
            <div key={res} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ flex: 1, fontSize: 13 }}>{RESOURCE_LABELS[res]} ({player.resources[res]})</span>
              <button onClick={() => adjust(res, -1)} disabled={selected[res] === 0}
                style={{ width: 24, height: 24, background: '#374151', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>-</button>
              <span style={{ width: 20, textAlign: 'center', fontSize: 13 }}>{selected[res]}</span>
              <button onClick={() => adjust(res, 1)} disabled={selected[res] >= player.resources[res] || totalSelected >= mustDiscard}
                style={{ width: 24, height: 24, background: '#374151', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>+</button>
            </div>
          )
        ))}

        <button
          onClick={() => onDiscard(selected)}
          disabled={!isValid}
          style={{
            width: '100%', marginTop: 16, padding: '10px 0',
            background: isValid ? '#f97316' : '#374151', color: isValid ? '#fff' : '#666',
            border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 'bold', cursor: isValid ? 'pointer' : 'not-allowed',
          }}
        >
          Discard {mustDiscard} cards
        </button>
      </div>
    </div>
  );
};
