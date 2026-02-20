import { useState } from 'react';
import type { FC } from 'react';
import type { DevelopmentCard } from '../../state/playerState';
import type { ResourceType } from '../../state/playerState';

export type DevCardHandProps = {
  cards: DevelopmentCard[];
  currentTurn: number;
  canPlay: boolean;
  onPlayCard: (cardIndex: number, payload: Record<string, unknown>) => void;
};

const RESOURCE_OPTIONS: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];

const CARD_LABELS: Record<string, string> = {
  knight: '⚔️ Knight',
  victoryPoint: '⭐ Victory Point',
  roadBuilding: '🛣️ Road Building',
  yearOfPlenty: '🎁 Year of Plenty',
  monopoly: '💰 Monopoly',
};

function KnightPayload({ onConfirm }: { onConfirm: (payload: Record<string, unknown>) => void }) {
  return (
    <button
      onClick={() => onConfirm({})}
      style={{ fontSize: 11, padding: '2px 6px', background: '#7e22ce', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}
    >
      Play
    </button>
  );
}

function YearOfPlentyPayload({ onConfirm }: { onConfirm: (payload: Record<string, unknown>) => void }) {
  const [res1, setRes1] = useState<ResourceType>('wood');
  const [res2, setRes2] = useState<ResourceType>('brick');

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
      <select
        value={res1}
        onChange={e => setRes1(e.target.value as ResourceType)}
        style={{ fontSize: 10, background: '#333', color: '#fff', border: '1px solid #555', borderRadius: 3 }}
      >
        {RESOURCE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
      </select>
      <select
        value={res2}
        onChange={e => setRes2(e.target.value as ResourceType)}
        style={{ fontSize: 10, background: '#333', color: '#fff', border: '1px solid #555', borderRadius: 3 }}
      >
        {RESOURCE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
      </select>
      <button
        onClick={() => onConfirm({ resource1: res1, resource2: res2 })}
        style={{ fontSize: 11, padding: '2px 6px', background: '#7e22ce', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}
      >
        Play
      </button>
    </div>
  );
}

function MonopolyPayload({ onConfirm }: { onConfirm: (payload: Record<string, unknown>) => void }) {
  const [res, setRes] = useState<ResourceType>('wood');

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <select
        value={res}
        onChange={e => setRes(e.target.value as ResourceType)}
        style={{ fontSize: 10, background: '#333', color: '#fff', border: '1px solid #555', borderRadius: 3 }}
      >
        {RESOURCE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
      </select>
      <button
        onClick={() => onConfirm({ resource: res })}
        style={{ fontSize: 11, padding: '2px 6px', background: '#7e22ce', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}
      >
        Play
      </button>
    </div>
  );
}

export const DevCardHand: FC<DevCardHandProps> = ({ cards, currentTurn, canPlay, onPlayCard }) => {
  if (cards.length === 0) {
    return <div style={{ fontSize: 12, color: '#666', padding: '4px 0' }}>No dev cards</div>;
  }

  return (
    <div>
      {cards.map((card, i) => {
        const isPlayable =
          canPlay &&
          !card.playedThisTurn &&
          card.type !== 'victoryPoint' &&
          card.turnBought < currentTurn;

        return (
          <div
            key={i}
            style={{
              background: 'rgba(126,34,206,0.2)',
              border: '1px solid #7e22ce',
              borderRadius: 4,
              padding: '4px 6px',
              marginBottom: 4,
              fontSize: 12,
            }}
          >
            <div style={{ marginBottom: isPlayable ? 4 : 0 }}>
              {CARD_LABELS[card.type] ?? card.type}
            </div>
            {isPlayable && (
              <>
                {card.type === 'knight' && (
                  <KnightPayload onConfirm={(p) => onPlayCard(i, p)} />
                )}
                {card.type === 'yearOfPlenty' && (
                  <YearOfPlentyPayload onConfirm={(p) => onPlayCard(i, p)} />
                )}
                {card.type === 'monopoly' && (
                  <MonopolyPayload onConfirm={(p) => onPlayCard(i, p)} />
                )}
                {card.type === 'roadBuilding' && (
                  <button
                    onClick={() => onPlayCard(i, {})}
                    style={{ fontSize: 11, padding: '2px 6px', background: '#7e22ce', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}
                  >
                    Play (place 2 roads)
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};
