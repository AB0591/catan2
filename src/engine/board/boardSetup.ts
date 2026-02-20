import { hexesInRange } from './hexGrid';
import type { ResourceType, HexTile, BoardGraph } from './boardTypes';
import { buildVertexGraph } from './vertexGraph';
import { buildEdgeGraph } from './edgeGraph';

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const TILE_DISTRIBUTION: ResourceType[] = [
  'wood', 'wood', 'wood', 'wood',
  'sheep', 'sheep', 'sheep', 'sheep',
  'wheat', 'wheat', 'wheat', 'wheat',
  'brick', 'brick', 'brick',
  'ore', 'ore', 'ore',
  'desert',
];

const NUMBER_TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

export function createBoard(seed: number): BoardGraph {
  const rng = mulberry32(seed);
  const hexCoords = hexesInRange({ q: 0, r: 0 }, 2);

  const shuffledResources = shuffle(TILE_DISTRIBUTION, rng);
  const shuffledTokens = shuffle(NUMBER_TOKENS, rng);

  let tokenIndex = 0;
  const hexes: HexTile[] = hexCoords.map((coord, i) => {
    const resource = shuffledResources[i];
    const numberToken = resource === 'desert' ? null : shuffledTokens[tokenIndex++];
    return { coord, resource, numberToken };
  });

  const desertHex = hexes.find(h => h.resource === 'desert')!;

  const { vertices, hexVertexIds } = buildVertexGraph(hexCoords);
  const edges = buildEdgeGraph(hexCoords, vertices, hexVertexIds);

  return {
    hexes,
    vertices,
    edges,
    robberHex: desertHex.coord,
  };
}

export function createDefaultBoard(): BoardGraph {
  return createBoard(42);
}
