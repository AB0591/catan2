import React, { useMemo } from 'react';
import type { BoardState } from '../../state/boardState';
import type { VertexId, EdgeId } from '../../engine/board/boardTypes';
import type { HexCoord } from '../../engine/board/hexGrid';
import { hexCornerPositions } from '../../engine/board/vertexGraph';

const HEX_SIZE = 60;
const BOARD_CENTER_X = 400;
const BOARD_CENTER_Y = 350;

const HEX_COLORS: Record<string, string> = {
  wood: '#2d6a2d',
  brick: '#c1440e',
  sheep: '#90c040',
  wheat: '#f4c430',
  ore: '#808080',
  desert: '#f5deb3',
};

const PLAYER_COLORS: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  orange: '#f97316',
  white: '#e5e7eb',
};

export type HexBoardProps = {
  boardState: BoardState;
  validVertices?: VertexId[];
  validEdges?: EdgeId[];
  selectedKnightId?: string | null;
  validKnightIds?: string[];
  metropolisByVertex?: Record<string, 'politics' | 'science' | 'trade'>;
  onVertexClick?: (vertexId: VertexId) => void;
  onEdgeClick?: (edgeId: EdgeId) => void;
  onKnightClick?: (knightId: string) => void;
  onHexClick?: (coord: HexCoord) => void;
  validHexes?: HexCoord[];
  playerColors: Record<string, string>;
};

/** Build a map from vertex ID (v0, v1, ...) to screen pixel position. */
function buildVertexPositionMap(
  boardState: BoardState
): Map<VertexId, [number, number]> {
  const posMap = new Map<VertexId, [number, number]>();
  let counter = 0;
  const pixelKeyToCounter = new Map<string, number>();

  for (const hex of boardState.graph.hexes) {
    const corners = hexCornerPositions(hex.coord.q, hex.coord.r);
    for (const [vx, vy] of corners) {
      const key = `${vx},${vy}`;
      if (!pixelKeyToCounter.has(key)) {
        pixelKeyToCounter.set(key, counter++);
      }
    }
  }

  const counterToPos = new Map<number, [number, number]>();
  for (const [key, idx] of pixelKeyToCounter) {
    const [x, y] = key.split(',').map(Number);
    counterToPos.set(idx, [x, y]);
  }

  for (const vid of boardState.graph.vertices.keys()) {
    const idx = parseInt(vid.substring(1), 10);
    const pos = counterToPos.get(idx);
    if (pos) {
      posMap.set(vid, [
        BOARD_CENTER_X + pos[0] * HEX_SIZE,
        BOARD_CENTER_Y + pos[1] * HEX_SIZE,
      ]);
    }
  }

  return posMap;
}

/** Compute screen center of a hex. */
function hexCenter(q: number, r: number): [number, number] {
  const cx = HEX_SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const cy = HEX_SIZE * (1.5 * r);
  return [BOARD_CENTER_X + cx, BOARD_CENTER_Y + cy];
}

/** Compute all 6 pointy-top corners of a hex on screen. */
function hexScreenCorners(q: number, r: number): [number, number][] {
  const [cx, cy] = hexCenter(q, r);
  const corners: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (30 + 60 * i);
    corners.push([cx + HEX_SIZE * Math.cos(angle), cy + HEX_SIZE * Math.sin(angle)]);
  }
  return corners;
}

export const HexBoard: React.FC<HexBoardProps> = ({
  boardState,
  validVertices = [],
  validEdges = [],
  selectedKnightId = null,
  validKnightIds = [],
  metropolisByVertex = {},
  onVertexClick,
  onEdgeClick,
  onKnightClick,
  onHexClick,
  validHexes = [],
  playerColors,
}) => {
  const vertexPosMap = useMemo(() => buildVertexPositionMap(boardState), [boardState]);

  const validVertexSet = useMemo(() => new Set(validVertices), [validVertices]);
  const validEdgeSet = useMemo(() => new Set(validEdges), [validEdges]);
  const validKnightSet = useMemo(() => new Set(validKnightIds), [validKnightIds]);

  const getPlayerColor = (playerId: string) =>
    playerColors[playerId] ?? PLAYER_COLORS[playerId] ?? '#fff';

  return (
    <svg width={800} height={700} style={{ display: 'block', margin: '0 auto' }}>
      {/* Hexes */}
      {boardState.graph.hexes.map((hex) => {
        const corners = hexScreenCorners(hex.coord.q, hex.coord.r);
        const points = corners.map(([x, y]) => `${x},${y}`).join(' ');
        const [cx, cy] = hexCenter(hex.coord.q, hex.coord.r);
        const color = HEX_COLORS[hex.resource] ?? '#ccc';
        const isRobber =
          boardState.robberHex.q === hex.coord.q &&
          boardState.robberHex.r === hex.coord.r;
        const isValidHex = validHexes.some(
          (h) => h.q === hex.coord.q && h.r === hex.coord.r
        );

        return (
          <g
            key={`${hex.coord.q},${hex.coord.r}`}
            onClick={() => onHexClick && onHexClick(hex.coord)}
            style={{ cursor: onHexClick ? 'pointer' : 'default' }}
          >
            <polygon
              points={points}
              fill={color}
              stroke={isValidHex ? '#ffff00' : '#333'}
              strokeWidth={isValidHex ? 3 : 1.5}
            />
            {/* Number token */}
            {hex.numberToken !== null && (
              <>
                <circle cx={cx} cy={cy} r={16} fill="rgba(245,230,180,0.9)" stroke="#999" strokeWidth={1} />
                <text
                  x={cx}
                  y={cy + 5}
                  textAnchor="middle"
                  fontSize={14}
                  fontWeight="bold"
                  fill={hex.numberToken === 6 || hex.numberToken === 8 ? 'red' : '#222'}
                >
                  {hex.numberToken}
                </text>
              </>
            )}
            {/* Robber */}
            {isRobber && (
              <circle cx={cx} cy={cy + (hex.numberToken ? -22 : 0)} r={10} fill="#1a1a1a" stroke="#555" strokeWidth={1} />
            )}
          </g>
        );
      })}

      {/* Roads (edges) */}
      {Array.from(boardState.graph.edges.entries()).map(([edgeId, edge]) => {
        const posA = vertexPosMap.get(edge.vertices[0]);
        const posB = vertexPosMap.get(edge.vertices[1]);
        if (!posA || !posB) return null;

        const road = boardState.roads[edgeId];
        const isValid = validEdgeSet.has(edgeId);
        const [mx, my] = [(posA[0] + posB[0]) / 2, (posA[1] + posB[1]) / 2];

        return (
          <g key={edgeId}>
            {road ? (
              <line
                x1={posA[0]}
                y1={posA[1]}
                x2={posB[0]}
                y2={posB[1]}
                stroke={getPlayerColor(road.playerId)}
                strokeWidth={6}
                strokeLinecap="round"
              />
            ) : isValid ? (
              <line
                x1={posA[0]}
                y1={posA[1]}
                x2={posB[0]}
                y2={posB[1]}
                stroke="rgba(255,255,0,0.5)"
                strokeWidth={4}
                strokeLinecap="round"
                onClick={() => onEdgeClick && onEdgeClick(edgeId)}
                style={{ cursor: 'pointer' }}
              />
            ) : null}
            {/* Invisible wider clickable area */}
            {isValid && (
              <line
                x1={posA[0]}
                y1={posA[1]}
                x2={posB[0]}
                y2={posB[1]}
                stroke="transparent"
                strokeWidth={14}
                onClick={() => onEdgeClick && onEdgeClick(edgeId)}
                style={{ cursor: 'pointer' }}
              />
            )}
            {/* Midpoint label for valid edges */}
            {isValid && (
              <circle
                cx={mx}
                cy={my}
                r={6}
                fill="rgba(255,255,0,0.7)"
                onClick={() => onEdgeClick && onEdgeClick(edgeId)}
                style={{ cursor: 'pointer' }}
              />
            )}
          </g>
        );
      })}

      {/* Vertices (settlements/cities/valid spots) */}
      {Array.from(boardState.graph.vertices.entries()).map(([vertexId]) => {
        const pos = vertexPosMap.get(vertexId);
        if (!pos) return null;

        const building = boardState.buildings[vertexId];
        const isValid = validVertexSet.has(vertexId);

        if (!building && !isValid) return null;

        return (
          <g
            key={vertexId}
            onClick={() => onVertexClick && onVertexClick(vertexId)}
            style={{ cursor: isValid ? 'pointer' : 'default' }}
          >
            {building?.type === 'settlement' && (
              <circle
                cx={pos[0]}
                cy={pos[1]}
                r={9}
                fill={getPlayerColor(building.playerId)}
                stroke="#fff"
                strokeWidth={2}
              />
            )}
            {isValid && building?.type === 'settlement' && (
              <>
                <circle
                  cx={pos[0]}
                  cy={pos[1]}
                  r={13}
                  fill="rgba(255,255,0,0.22)"
                  stroke="none"
                  data-testid={`valid-upgrade-glow-${vertexId}`}
                />
                <circle
                  cx={pos[0]}
                  cy={pos[1]}
                  r={13}
                  fill="none"
                  stroke="#ffff00"
                  strokeWidth={3}
                  data-testid={`valid-upgrade-ring-${vertexId}`}
                />
              </>
            )}
            {building?.type === 'city' && (
              <rect
                x={pos[0] - 9}
                y={pos[1] - 9}
                width={18}
                height={18}
                fill={getPlayerColor(building.playerId)}
                stroke="#fff"
                strokeWidth={2}
              />
            )}
            {isValid && building?.type === 'city' && (
              <>
                <rect
                  x={pos[0] - 14}
                  y={pos[1] - 14}
                  width={28}
                  height={28}
                  fill="rgba(255,255,0,0.22)"
                  stroke="none"
                  data-testid={`valid-city-glow-${vertexId}`}
                />
                <rect
                  x={pos[0] - 14}
                  y={pos[1] - 14}
                  width={28}
                  height={28}
                  fill="none"
                  stroke="#ffff00"
                  strokeWidth={3}
                  data-testid={`valid-city-ring-${vertexId}`}
                />
              </>
            )}
            {building?.type === 'city' && boardState.cityWalls[vertexId] && (
              <rect
                x={pos[0] - 13}
                y={pos[1] - 13}
                width={26}
                height={26}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="4 2"
              />
            )}
            {metropolisByVertex[vertexId] && (
              <text
                x={pos[0]}
                y={pos[1] - 14}
                textAnchor="middle"
                fontSize={12}
                fontWeight="bold"
                fill={metropolisByVertex[vertexId] === 'politics' ? '#60a5fa' : metropolisByVertex[vertexId] === 'science' ? '#4ade80' : '#facc15'}
              >
                ★
              </text>
            )}
            {isValid && !building && (
              <circle
                cx={pos[0]}
                cy={pos[1]}
                r={8}
                fill="rgba(255,255,0,0.7)"
                stroke="#ffff00"
                strokeWidth={2}
                data-testid={`valid-empty-${vertexId}`}
              />
            )}
          </g>
        );
      })}

      {/* Knights */}
      {Object.values(boardState.knights).map(knight => {
        const pos = vertexPosMap.get(knight.vertexId);
        if (!pos) return null;
        const isSelected = selectedKnightId === knight.id;
        const isValidKnight = validKnightSet.has(knight.id);
        const strokeColor = knight.active ? '#93c5fd' : '#9ca3af';
        const fillColor = getPlayerColor(knight.ownerId);
        const ringColor = isSelected ? '#fde047' : isValidKnight ? '#facc15' : strokeColor;
        return (
          <g
            key={knight.id}
            onClick={() => onKnightClick && onKnightClick(knight.id)}
            style={{ cursor: onKnightClick ? 'pointer' : 'default' }}
          >
            <circle
              cx={pos[0]}
              cy={pos[1]}
              r={12}
              fill={fillColor}
              stroke={ringColor}
              strokeWidth={isSelected || isValidKnight ? 3 : 2}
              opacity={knight.active ? 1 : 0.72}
            />
            <text
              x={pos[0]}
              y={pos[1] + 4}
              textAnchor="middle"
              fontSize={10}
              fontWeight="bold"
              fill="#111827"
            >
              {knight.level}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
