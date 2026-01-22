<script lang="ts">
  import { ScatterPlot, Histogram, LineChart, BoxPlot, RegressionPlot, WaffleChart, DensityPlot, ItemTable } from '$lib/plots';
  import { isDarkMode } from '$lib/stores/theme';
  import type { GraphConfig } from '$lib/stores/graphs';
  import type { RunMetrics } from '$lib/api/sts-client';
  import EditGraphModal from './EditGraphModal.svelte';

  // Character colors for survival curves
  const CHARACTER_COLORS: Record<string, string> = {
    'IRONCLAD': '#ef4444',
    'THE_SILENT': '#22c55e', 
    'DEFECT': '#3b82f6',
    'WATCHER': '#a855f7',
  };

  interface Props {
    config: GraphConfig;
    runs: RunMetrics[];
    onDelete: () => void;
    onUpdate: (changes: Partial<Omit<GraphConfig, 'id' | 'type'>>) => void;
    colorFn?: (run: RunMetrics) => string;
  }

  let { config, runs, onDelete, onUpdate, colorFn }: Props = $props();

  // Transform data for histogram
  function getHistogramData() {
    return runs.map(r => ({
      value: r[config.xField as keyof RunMetrics] as number,
    }));
  }

  // Transform data for scatter plot
  function getScatterData() {
    return runs.map(r => ({
      x: r[config.xField as keyof RunMetrics] as number,
      y: r[config.yField as keyof RunMetrics] as number,
      color: colorFn ? colorFn(r) : (r.victory ? '#22c55e' : '#ef4444'),
    }));
  }

  // Calculate survival percentage at each floor
  function getSurvivalData() {
    if (config.groupByCharacter) {
      // Group runs by character
      const byCharacter = new Map<string, RunMetrics[]>();
      for (const run of runs) {
        const existing = byCharacter.get(run.character) ?? [];
        existing.push(run);
        byCharacter.set(run.character, existing);
      }

      // Calculate survival for each character
      const result: { x: number; y: number; series: string }[] = [];
      
      for (const [character, charRuns] of byCharacter) {
        const maxFloor = Math.max(...charRuns.map(r => r.floor_reached));
        const totalRuns = charRuns.length;
        const displayName = character.replace('THE_', '').replace('_', ' ');
        
        for (let floor = 1; floor <= maxFloor; floor++) {
          const survivedToFloor = charRuns.filter(r => r.floor_reached >= floor).length;
          const survivalPct = (survivedToFloor / totalRuns) * 100;
          result.push({ x: floor, y: survivalPct, series: displayName });
        }
      }
      
      return result;
    } else {
      // Overall survival curve
      const maxFloor = Math.max(...runs.map(r => r.floor_reached));
      const totalRuns = runs.length;
      const result: { x: number; y: number; series?: string }[] = [];
      
      for (let floor = 1; floor <= maxFloor; floor++) {
        const survivedToFloor = runs.filter(r => r.floor_reached >= floor).length;
        const survivalPct = (survivedToFloor / totalRuns) * 100;
        result.push({ x: floor, y: survivalPct });
      }
      
      return result;
    }
  }

  // Get series colors for survival chart
  function getSurvivalColors(): Record<string, string> {
    if (!config.groupByCharacter) return {};
    
    return {
      'IRONCLAD': CHARACTER_COLORS['IRONCLAD'] ?? '#ef4444',
      'SILENT': CHARACTER_COLORS['THE_SILENT'] ?? '#22c55e',
      'DEFECT': CHARACTER_COLORS['DEFECT'] ?? '#3b82f6',
      'WATCHER': CHARACTER_COLORS['WATCHER'] ?? '#a855f7',
    };
  }

  // Transform data for box plot (grouped by ascending level, character, etc.)
  function getBoxPlotData() {
    return runs.map(r => ({
      category: String(r[config.yField as keyof RunMetrics]),
      value: r[config.xField as keyof RunMetrics] as number,
    }));
  }

  // Transform data for regression plot
  function getRegressionData() {
    return runs.map(r => ({
      x: r[config.xField as keyof RunMetrics] as number,
      y: r[config.yField as keyof RunMetrics] as number,
    }));
  }

  // Transform data for waffle chart (win/loss counts)
  function getWaffleData() {
    const wins = runs.filter(r => r.victory).length;
    const losses = runs.length - wins;
    return [
      { category: 'Victories', value: wins, color: '#22c55e' },
      { category: 'Defeats', value: losses, color: '#ef4444' },
    ];
  }

  // Transform data for density plot
  function getDensityData() {
    return runs.map(r => ({
      x: r[config.xField as keyof RunMetrics] as number,
      y: r[config.yField as keyof RunMetrics] as number,
    }));
  }

  // Transform data for item table - calculate average floor for each item (relic or card)
  function getItemTableData(mode: 'relics' | 'cards') {
    const itemStats = new Map<string, { totalFloor: number; count: number }>();
    
    for (const run of runs) {
      const items = mode === 'cards' ? (run.master_deck ?? []) : (run.relics ?? []);
      for (const item of items) {
        const existing = itemStats.get(item) ?? { totalFloor: 0, count: 0 };
        existing.totalFloor += run.floor_reached;
        existing.count += 1;
        itemStats.set(item, existing);
      }
    }

    return Array.from(itemStats.entries()).map(([item, stats]) => ({
      item,
      avgFloor: stats.totalFloor / stats.count,
      count: stats.count,
    }));
  }

  // Determine if boss floor markers should be shown on X or Y axis
  const showXBossFloors = $derived(Boolean(config.showBossFloors && config.xField === 'floor_reached'));
  const showYBossFloors = $derived(Boolean(config.showBossFloors && config.yField === 'floor_reached'));

  let showDeleteConfirm = $state(false);
  let showEditModal = $state(false);
</script>

<div class="graph-card relative group">
  <!-- Action buttons -->
  <div class="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
    <!-- Edit button -->
    <button
      class="p-1.5 rounded-md"
      class:bg-slate-700={$isDarkMode}
      class:hover:bg-blue-600={$isDarkMode}
      class:bg-slate-200={!$isDarkMode}
      class:hover:bg-blue-500={!$isDarkMode}
      class:text-slate-300={$isDarkMode}
      class:hover:text-white={$isDarkMode}
      class:text-slate-600={!$isDarkMode}
      onclick={() => showEditModal = true}
      title="Edit graph"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </button>

    <!-- Delete button -->
    <button
      class="p-1.5 rounded-md"
      class:bg-slate-700={$isDarkMode}
      class:hover:bg-red-600={$isDarkMode}
      class:bg-slate-200={!$isDarkMode}
      class:hover:bg-red-500={!$isDarkMode}
      class:text-slate-300={$isDarkMode}
      class:hover:text-white={$isDarkMode}
      class:text-slate-600={!$isDarkMode}
      onclick={() => showDeleteConfirm = true}
      title="Delete graph"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>

  <!-- Delete confirmation overlay -->
  {#if showDeleteConfirm}
    <div 
      class="absolute inset-0 z-20 flex items-center justify-center rounded-lg"
      style:background={$isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)'}
    >
      <div class="text-center p-4">
        <p class="mb-3 text-sm" class:text-slate-200={$isDarkMode} class:text-slate-700={!$isDarkMode}>
          Delete this graph?
        </p>
        <div class="flex gap-2 justify-center">
          <button
            class="px-3 py-1.5 text-sm rounded-md bg-red-600 hover:bg-red-500 text-white"
            onclick={() => { onDelete(); showDeleteConfirm = false; }}
          >
            Delete
          </button>
          <button
            class="px-3 py-1.5 text-sm rounded-md"
            class:bg-slate-700={$isDarkMode}
            class:hover:bg-slate-600={$isDarkMode}
            class:text-slate-200={$isDarkMode}
            class:bg-slate-200={!$isDarkMode}
            class:hover:bg-slate-300={!$isDarkMode}
            class:text-slate-700={!$isDarkMode}
            onclick={() => showDeleteConfirm = false}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Graph content -->
  {#if config.type === 'histogram'}
    <Histogram
      data={getHistogramData()}
      title={config.title}
      xLabel={config.xLabel}
      yLabel={config.yLabel}
      bins={config.bins ?? 15}
      showXBossFloors={showXBossFloors}
    />
  {:else if config.type === 'scatter'}
    <ScatterPlot
      data={getScatterData()}
      title={config.title}
      xLabel={config.xLabel}
      yLabel={config.yLabel}
      showXBossFloors={showXBossFloors}
      showYBossFloors={showYBossFloors}
    />
  {:else if config.type === 'survival'}
    <LineChart
      data={getSurvivalData()}
      title={config.title}
      xLabel="Floor"
      yLabel="Survival %"
      seriesColors={getSurvivalColors()}
      showXBossFloors={config.showBossFloors ?? false}
    />
  {:else if config.type === 'boxplot'}
    <BoxPlot
      data={getBoxPlotData()}
      title={config.title}
      xLabel={config.xLabel}
      yLabel={config.yLabel}
    />
  {:else if config.type === 'regression'}
    <RegressionPlot
      data={getRegressionData()}
      title={config.title}
      xLabel={config.xLabel}
      yLabel={config.yLabel}
      showConfidence={config.showConfidence ?? true}
      showXBossFloors={showXBossFloors}
      showYBossFloors={showYBossFloors}
    />
  {:else if config.type === 'winrate-waffle'}
    <WaffleChart
      data={getWaffleData()}
      title={config.title}
      unit={Math.max(1, Math.floor(runs.length / 100))}
    />
  {:else if config.type === 'density'}
    <DensityPlot
      data={getDensityData()}
      title={config.title}
      xLabel={config.xLabel}
      yLabel={config.yLabel}
      bandwidth={config.bandwidth ?? 20}
      showXBossFloors={showXBossFloors}
      showYBossFloors={showYBossFloors}
    />
  {:else if config.type === 'relic-table'}
    <ItemTable
      data={getItemTableData('relics')}
      title={config.title}
      height={350}
      mode="relics"
    />
  {:else if config.type === 'card-table'}
    <ItemTable
      data={getItemTableData('cards')}
      title={config.title}
      height={350}
      mode="cards"
    />
  {/if}

  <!-- Edit Modal -->
  {#if showEditModal}
    <EditGraphModal
      {config}
      onSave={onUpdate}
      onClose={() => showEditModal = false}
    />
  {/if}
</div>

<style>
  .graph-card {
    position: relative;
    cursor: grab;
  }
  
  .graph-card:active {
    cursor: grabbing;
  }
</style>
