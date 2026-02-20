export type ResourceType = 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore';

export type ResourceCards = Record<ResourceType, number>;

export type DevelopmentCardType = 'knight' | 'victoryPoint' | 'roadBuilding' | 'yearOfPlenty' | 'monopoly';

export type DevelopmentCard = {
  type: DevelopmentCardType;
  playedThisTurn: boolean;
};

export type PlayerColor = 'red' | 'blue' | 'orange' | 'white';

export type PlayerState = {
  id: string;
  name: string;
  color: PlayerColor;
  resources: ResourceCards;
  developmentCards: DevelopmentCard[];
  settlements: number;      // remaining to place (starts at 5, minus 2 placed = 3 available after setup)
  cities: number;           // remaining to place (starts at 4)
  roads: number;            // remaining to place (starts at 15, minus 2 placed = 13 available after setup)
  victoryPoints: number;    // public VP (settlements + cities + special cards)
  knightsPlayed: number;
  hasLargestArmy: boolean;
  hasLongestRoad: boolean;
};

export function createPlayer(id: string, name: string, color: PlayerColor): PlayerState {
  return {
    id,
    name,
    color,
    resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
    developmentCards: [],
    settlements: 5,
    cities: 4,
    roads: 15,
    victoryPoints: 0,
    knightsPlayed: 0,
    hasLargestArmy: false,
    hasLongestRoad: false,
  };
}

export function calculateVictoryPoints(player: PlayerState): number {
  // settlements placed = 5 - player.settlements
  // cities placed = 4 - player.cities
  const settlementsPlaced = 5 - player.settlements;
  const citiesPlaced = 4 - player.cities;
  const vpCards = player.developmentCards.filter(c => c.type === 'victoryPoint').length;
  const specialPoints = (player.hasLargestArmy ? 2 : 0) + (player.hasLongestRoad ? 2 : 0);
  return settlementsPlaced + citiesPlaced * 2 + vpCards + specialPoints;
}
