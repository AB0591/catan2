import { useMemo, useState } from 'react';
import type { FC } from 'react';
import type { CommodityType, ResourceType, PlayerState } from '../../state/playerState';
import type { ProgressCard } from '../../state/gameState';

type CkProgressDialogProps = {
  card: ProgressCard;
  players: PlayerState[];
  currentPlayerId: string;
  progressHandCounts: Record<string, number>;
  onCancel: () => void;
  onConfirm: (params: { resource?: ResourceType; commodity?: CommodityType; targetPlayerId?: string }) => void;
};

const RESOURCE_OPTIONS: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
const COMMODITY_OPTIONS: CommodityType[] = ['cloth', 'coin', 'paper'];

function deckAccent(deck: ProgressCard['deck']): string {
  if (deck === 'politics') return '#60a5fa';
  if (deck === 'science') return '#4ade80';
  return '#facc15';
}

function cardHelp(type: ProgressCard['type']): string {
  switch (type) {
    case 'resourceMonopoly':
      return 'Choose one resource type. Take all of that resource from opponents.';
    case 'tradeMonopoly':
      return 'Choose one commodity type. Take all of that commodity from opponents.';
    case 'merchantFleet':
      return 'Choose one resource type to gain immediately.';
    case 'spy':
      return 'Choose an opponent and steal one progress card.';
    default:
      return 'Play this progress card now.';
  }
}

export const CkProgressDialog: FC<CkProgressDialogProps> = ({
  card,
  players,
  currentPlayerId,
  progressHandCounts,
  onCancel,
  onConfirm,
}) => {
  const [resource, setResource] = useState<ResourceType>('wood');
  const [commodity, setCommodity] = useState<CommodityType>('cloth');
  const opponentOptions = useMemo(
    () => players.filter(p => p.id !== currentPlayerId && (progressHandCounts[p.id] ?? 0) > 0),
    [players, currentPlayerId, progressHandCounts]
  );
  const [targetPlayerId, setTargetPlayerId] = useState<string>(opponentOptions[0]?.id ?? '');

  const requiresResource = card.type === 'resourceMonopoly' || card.type === 'merchantFleet';
  const requiresCommodity = card.type === 'tradeMonopoly';
  const requiresTarget = card.type === 'spy';
  const canConfirm = !requiresTarget || targetPlayerId.length > 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2,6,23,0.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2100,
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Play progress card ${card.type}`}
    >
      <div
        style={{
          width: 360,
          maxWidth: '90vw',
          borderRadius: 14,
          border: `2px solid ${deckAccent(card.deck)}`,
          background: '#0f172a',
          boxShadow: '0 20px 40px rgba(0,0,0,0.45)',
          padding: 20,
        }}
      >
        <div style={{ fontSize: 12, color: deckAccent(card.deck), fontWeight: 700, marginBottom: 4 }}>
          {card.deck.toUpperCase()} PROGRESS CARD
        </div>
        <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: 18, textTransform: 'capitalize' }}>{card.type}</h3>
        <p style={{ marginTop: 8, marginBottom: 14, color: '#94a3b8', fontSize: 12 }}>{cardHelp(card.type)}</p>

        {requiresResource && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>Resource</label>
            <select
              value={resource}
              onChange={e => setResource(e.target.value as ResourceType)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #334155', background: '#111827', color: '#fff' }}
            >
              {RESOURCE_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        )}

        {requiresCommodity && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>Commodity</label>
            <select
              value={commodity}
              onChange={e => setCommodity(e.target.value as CommodityType)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #334155', background: '#111827', color: '#fff' }}
            >
              {COMMODITY_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        )}

        {requiresTarget && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>Target Opponent</label>
            {opponentOptions.length === 0 ? (
              <div style={{ fontSize: 12, color: '#fca5a5' }}>No opponent has progress cards to steal.</div>
            ) : (
              <select
                value={targetPlayerId}
                onChange={e => setTargetPlayerId(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #334155', background: '#111827', color: '#fff' }}
              >
                {opponentOptions.map(opponent => (
                  <option key={opponent.id} value={opponent.id}>
                    {opponent.name} ({progressHandCounts[opponent.id] ?? 0} cards)
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '9px 0',
              borderRadius: 6,
              border: '1px solid #475569',
              background: '#1e293b',
              color: '#cbd5e1',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm({
              resource: requiresResource ? resource : undefined,
              commodity: requiresCommodity ? commodity : undefined,
              targetPlayerId: requiresTarget ? targetPlayerId : undefined,
            })}
            disabled={!canConfirm}
            style={{
              flex: 1,
              padding: '9px 0',
              borderRadius: 6,
              border: 'none',
              background: canConfirm ? deckAccent(card.deck) : '#374151',
              color: canConfirm ? '#0f172a' : '#9ca3af',
              fontWeight: 700,
              cursor: canConfirm ? 'pointer' : 'not-allowed',
            }}
          >
            Play Card
          </button>
        </div>
      </div>
    </div>
  );
};

