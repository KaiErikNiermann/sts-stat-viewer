import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

// Available numeric fields from RunMetrics for plotting
export const PLOT_FIELDS = [
  { key: 'floor_reached', label: 'Floor Reached' },
  { key: 'score', label: 'Score' },
  { key: 'ascension_level', label: 'Ascension Level' },
  { key: 'deck_size', label: 'Deck Size' },
  { key: 'attack_count', label: 'Attack Cards' },
  { key: 'skill_count', label: 'Skill Cards' },
  { key: 'power_count', label: 'Power Cards' },
  { key: 'upgraded_cards', label: 'Upgraded Cards' },
  { key: 'cards_removed', label: 'Cards Removed' },
  { key: 'relic_count', label: 'Relics' },
  { key: 'elites_killed', label: 'Elites Killed' },
  { key: 'bosses_killed', label: 'Bosses Killed' },
  { key: 'campfires_rested', label: 'Campfires Rested' },
  { key: 'campfires_upgraded', label: 'Campfires Upgraded' },
  { key: 'shops_visited', label: 'Shops Visited' },
  { key: 'cards_purchased', label: 'Cards Purchased' },
  { key: 'potions_used', label: 'Potions Used' },
  { key: 'total_damage_taken', label: 'Total Damage Taken' },
  { key: 'max_hp_at_end', label: 'Max HP at End' },
] as const;

export type PlotFieldKey = typeof PLOT_FIELDS[number]['key'];

export type GraphType = 
  | 'scatter' 
  | 'histogram' 
  | 'bar' 
  | 'survival'
  | 'boxplot'
  | 'regression'
  | 'winrate-waffle'
  | 'density'
  | 'relic-table'
  | 'card-table';

// Boss floor markers (act transitions)
export const BOSS_FLOORS = [
  { floor: 17, label: 'Act 1 Boss' },
  { floor: 34, label: 'Act 2 Boss' },
  { floor: 51, label: 'Act 3 Boss' },
  { floor: 57, label: 'Heart' },
] as const;

export interface GraphConfig {
  id: string;
  type: GraphType;
  title: string;
  xField: PlotFieldKey;
  yField: PlotFieldKey;
  xLabel: string;
  yLabel: string;
  // Grid position properties
  x: number;
  y: number;
  w: number;
  h: number;
  // For histogram, only xField is used (as value field)
  bins?: number;
  // For survival curves, optionally group by character
  groupByCharacter?: boolean;
  // For boxplot, use xField as value and yField as category basis
  // For regression, show confidence interval
  showConfidence?: boolean;
  // For density plots
  bandwidth?: number;
  // Show boss floor reference lines when floor is on axis
  showBossFloors?: boolean;
  // For histograms, show normal distribution curve overlay
  showNormalCurve?: boolean;
}

// Default graphs for overview tab
export const DEFAULT_OVERVIEW_GRAPHS: GraphConfig[] = [
  {
    id: 'overview-1',
    type: 'scatter',
    title: 'Score vs Floor Reached',
    xField: 'floor_reached',
    yField: 'score',
    xLabel: 'Floor Reached',
    yLabel: 'Score',
    x: 0,
    y: 0,
    w: 1,
    h: 1,
  },
  {
    id: 'overview-2',
    type: 'histogram',
    title: 'Floor Reached Distribution',
    xField: 'floor_reached',
    yField: 'floor_reached',
    xLabel: 'Floor',
    yLabel: 'Count',
    bins: 15,
    x: 1,
    y: 0,
    w: 1,
    h: 1,
  },
  {
    id: 'overview-4',
    type: 'regression',
    title: 'Deck Size vs Floor (with Trend)',
    xField: 'deck_size',
    yField: 'floor_reached',
    xLabel: 'Deck Size',
    yLabel: 'Floor Reached',
    showConfidence: true,
    x: 0,
    y: 1,
    w: 1,
    h: 1,
  },
  {
    id: 'overview-5',
    type: 'winrate-waffle',
    title: 'Win/Loss Distribution',
    xField: 'floor_reached',
    yField: 'floor_reached',
    xLabel: '',
    yLabel: '',
    x: 1,
    y: 1,
    w: 1,
    h: 1,
  },
  {
    id: 'overview-6',
    type: 'density',
    title: 'Score vs Floor Density',
    xField: 'floor_reached',
    yField: 'score',
    xLabel: 'Floor Reached',
    yLabel: 'Score',
    bandwidth: 15,
    x: 0,
    y: 2,
    w: 1,
    h: 1,
  },
  {
    id: 'overview-7',
    type: 'relic-table',
    title: 'Relic Performance (Avg Floor Reached)',
    xField: 'floor_reached',
    yField: 'floor_reached',
    xLabel: '',
    yLabel: '',
    x: 1,
    y: 2,
    w: 1,
    h: 1,
  },
];

// Default graphs for character tabs
export const DEFAULT_CHARACTER_GRAPHS: GraphConfig[] = [
  {
    id: 'char-1',
    type: 'scatter',
    title: 'Deck Size vs Floor Reached',
    xField: 'deck_size',
    yField: 'floor_reached',
    xLabel: 'Deck Size',
    yLabel: 'Floor Reached',
    x: 0,
    y: 0,
    w: 1,
    h: 1,
  },
  {
    id: 'char-2',
    type: 'histogram',
    title: 'Floor Reached Distribution',
    xField: 'floor_reached',
    yField: 'floor_reached',
    xLabel: 'Floor',
    yLabel: 'Count',
    bins: 15,
    x: 1,
    y: 0,
    w: 1,
    h: 1,
  },
  {
    id: 'char-3',
    type: 'scatter',
    title: 'Elites Killed vs Floor Reached',
    xField: 'elites_killed',
    yField: 'floor_reached',
    xLabel: 'Elites Killed',
    yLabel: 'Floor Reached',
    x: 0,
    y: 1,
    w: 1,
    h: 1,
  },
  {
    id: 'char-4',
    type: 'scatter',
    title: 'Relics vs Floor Reached',
    xField: 'relic_count',
    yField: 'floor_reached',
    xLabel: 'Relics',
    yLabel: 'Floor Reached',
    x: 1,
    y: 1,
    w: 1,
    h: 1,
  },
  {
    id: 'char-5',
    type: 'relic-table',
    title: 'Relic Performance',
    xField: 'floor_reached',
    yField: 'floor_reached',
    xLabel: '',
    yLabel: '',
    x: 0,
    y: 2,
    w: 2,
    h: 1,
  },
];

const STORAGE_KEY_OVERVIEW = 'sts-graphs-overview';
const STORAGE_KEY_CHARACTER = 'sts-graphs-character';

// Helper to find next available position in a 2-column grid
function findNextPosition(graphs: GraphConfig[], cols: number = 2): { x: number; y: number } {
  if (graphs.length === 0) return { x: 0, y: 0 };
  
  // Find the maximum y + h to get the next row
  let maxY = 0;
  for (const g of graphs) {
    const bottom = g.y + g.h;
    if (bottom > maxY) maxY = bottom;
  }
  
  // Try to find a gap in existing rows first
  for (let y = 0; y < maxY; y++) {
    for (let x = 0; x < cols; x++) {
      const occupied = graphs.some(g => 
        x >= g.x && x < g.x + g.w && y >= g.y && y < g.y + g.h
      );
      if (!occupied) return { x, y };
    }
  }
  
  // No gap found, add to next row
  return { x: 0, y: maxY };
}

function createGraphStore(storageKey: string, defaults: GraphConfig[]) {
  // Load from localStorage or use defaults
  let initial = defaults;
  if (browser) {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Migrate old data without grid positions
        initial = parsed.map((g: GraphConfig, i: number) => ({
          ...g,
          x: g.x ?? (i % 2),
          y: g.y ?? Math.floor(i / 2),
          w: g.w ?? 1,
          h: g.h ?? 1,
        }));
      } catch {
        initial = defaults;
      }
    }
  }

  const { subscribe, set, update } = writable<GraphConfig[]>(initial);

  return {
    subscribe,
    set: (graphs: GraphConfig[]) => {
      set(graphs);
      if (browser) {
        localStorage.setItem(storageKey, JSON.stringify(graphs));
      }
    },
    add: (config: Omit<GraphConfig, 'id' | 'x' | 'y' | 'w' | 'h'>) => {
      update(graphs => {
        const position = findNextPosition(graphs);
        const newGraph: GraphConfig = {
          ...config,
          id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ...position,
          w: 1,
          h: 1,
        };
        const updated = [...graphs, newGraph];
        if (browser) {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        }
        return updated;
      });
    },
    remove: (id: string) => {
      update(graphs => {
        const updated = graphs.filter(g => g.id !== id);
        if (browser) {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        }
        return updated;
      });
    },
    updateGraph: (id: string, changes: Partial<Omit<GraphConfig, 'id' | 'type'>>) => {
      update(graphs => {
        const updated = graphs.map(g => 
          g.id === id ? { ...g, ...changes } : g
        );
        if (browser) {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        }
        return updated;
      });
    },
    updatePosition: (id: string, x: number, y: number, w: number, h: number) => {
      update(graphs => {
        const updated = graphs.map(g =>
          g.id === id ? { ...g, x, y, w, h } : g
        );
        if (browser) {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        }
        return updated;
      });
    },
    reset: () => {
      set(defaults);
      if (browser) {
        localStorage.removeItem(storageKey);
      }
    },
    save: () => {
      if (browser) {
        localStorage.setItem(storageKey, JSON.stringify(get({ subscribe })));
      }
    },
  };
}

export const overviewGraphs = createGraphStore(STORAGE_KEY_OVERVIEW, DEFAULT_OVERVIEW_GRAPHS);
export const characterGraphs = createGraphStore(STORAGE_KEY_CHARACTER, DEFAULT_CHARACTER_GRAPHS);

// Helper to get field label
export function getFieldLabel(key: PlotFieldKey): string {
  return PLOT_FIELDS.find(f => f.key === key)?.label ?? key;
}
