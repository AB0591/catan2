import React from 'react';
import type { PlayerState } from '../../state/playerState';
import type { TurnPhase } from '../../state/gameState';
import { formatResourceCostTooltip } from '../resourceMeta';

export type BuildMenuProps = {
  player: PlayerState;
  turnPhase: TurnPhase;
  onBuildSettlement: () => void;
  onBuildRoad: () => void;
  onBuildCity: () => void;
  onBuyDevCard: () => void;
  disabledReasons?: Partial<Record<'settlement' | 'road' | 'city' | 'devCard', string>>;
};

function canAfford(resources: PlayerState['resources'], cost: Partial<PlayerState['resources']>): boolean {
  return Object.entries(cost).every(([res, amt]) => (resources[res as keyof typeof resources] ?? 0) >= (amt ?? 0));
}

const COSTS = {
  settlement: { brick: 1, wood: 1, sheep: 1, wheat: 1 },
  road: { brick: 1, wood: 1 },
  city: { ore: 3, wheat: 2 },
  devCard: { ore: 1, wheat: 1, sheep: 1 },
} as const;

const BTN_STYLE: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginBottom: 6,
  padding: '7px 10px',
  borderRadius: 5,
  border: 'none',
  fontSize: 13,
  fontWeight: 'bold',
  cursor: 'pointer',
  textAlign: 'left',
};

export const BuildMenu: React.FC<BuildMenuProps> = ({
  player,
  turnPhase,
  onBuildSettlement,
  onBuildRoad,
  onBuildCity,
  onBuyDevCard,
  disabledReasons = {},
}) => {
  const canBuild = turnPhase === 'postRoll';
  const canSettlement = canBuild && canAfford(player.resources, COSTS.settlement) && player.settlements > 0;
  const canRoad = canBuild && canAfford(player.resources, COSTS.road) && player.roads > 0;
  const canCity = canBuild && canAfford(player.resources, COSTS.city) && player.cities > 0;
  const canDev = canBuild && canAfford(player.resources, COSTS.devCard);

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>Build</div>
      <button
        onClick={onBuildSettlement}
        disabled={!canSettlement}
        title={disabledReasons.settlement ? `${formatResourceCostTooltip(COSTS.settlement)}\n${disabledReasons.settlement}` : formatResourceCostTooltip(COSTS.settlement)}
        style={{ ...BTN_STYLE, background: canSettlement ? '#2d6a2d' : '#333', color: canSettlement ? '#fff' : '#666' }}
      >
        🏠 Settlement
        <span style={{ fontSize: 10, display: 'block', fontWeight: 'normal' }}>🧱🌲🐑🌾</span>
      </button>
      {!canSettlement && disabledReasons.settlement && (
        <div style={{ fontSize: 10, color: '#888', marginTop: -4, marginBottom: 6 }}>{disabledReasons.settlement}</div>
      )}
      <button
        onClick={onBuildRoad}
        disabled={!canRoad}
        title={disabledReasons.road ? `${formatResourceCostTooltip(COSTS.road)}\n${disabledReasons.road}` : formatResourceCostTooltip(COSTS.road)}
        style={{ ...BTN_STYLE, background: canRoad ? '#78350f' : '#333', color: canRoad ? '#fff' : '#666' }}
      >
        🛣️ Road
        <span style={{ fontSize: 10, display: 'block', fontWeight: 'normal' }}>🧱🌲</span>
      </button>
      {!canRoad && disabledReasons.road && (
        <div style={{ fontSize: 10, color: '#888', marginTop: -4, marginBottom: 6 }}>{disabledReasons.road}</div>
      )}
      <button
        onClick={onBuildCity}
        disabled={!canCity}
        title={disabledReasons.city ? `${formatResourceCostTooltip(COSTS.city)}\n${disabledReasons.city}` : formatResourceCostTooltip(COSTS.city)}
        style={{ ...BTN_STYLE, background: canCity ? '#1e40af' : '#333', color: canCity ? '#fff' : '#666' }}
      >
        🏙️ City
        <span style={{ fontSize: 10, display: 'block', fontWeight: 'normal' }}>⛰️⛰️⛰️🌾🌾</span>
      </button>
      {!canCity && disabledReasons.city && (
        <div style={{ fontSize: 10, color: '#888', marginTop: -4, marginBottom: 6 }}>{disabledReasons.city}</div>
      )}
      <button
        onClick={onBuyDevCard}
        disabled={!canDev}
        title={disabledReasons.devCard ? `${formatResourceCostTooltip(COSTS.devCard)}\n${disabledReasons.devCard}` : formatResourceCostTooltip(COSTS.devCard)}
        style={{ ...BTN_STYLE, background: canDev ? '#7e22ce' : '#333', color: canDev ? '#fff' : '#666' }}
      >
        🃏 Dev Card
        <span style={{ fontSize: 10, display: 'block', fontWeight: 'normal' }}>⛰️🌾🐑</span>
      </button>
      {!canDev && disabledReasons.devCard && (
        <div style={{ fontSize: 10, color: '#888', marginTop: -4, marginBottom: 6 }}>{disabledReasons.devCard}</div>
      )}
    </div>
  );
};
