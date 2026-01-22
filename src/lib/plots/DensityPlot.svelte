<script lang="ts">
  import * as Plot from '@observablehq/plot';
  import { onMount } from 'svelte';
  import type { PlotOptions } from './types';
  import { isDarkMode } from '$lib/stores/theme';

  export interface DensityData {
    x: number;
    y: number;
    category?: string;
  }

  // Boss floor markers
  const BOSS_FLOORS = [17, 34, 51, 57];

  interface Props {
    data: DensityData[];
    xLabel?: string;
    yLabel?: string;
    title?: string;
    bandwidth?: number;
    thresholds?: number;
    showXBossFloors?: boolean;
    showYBossFloors?: boolean;
    options?: PlotOptions;
  }

  let { 
    data, 
    xLabel = 'X', 
    yLabel = 'Y', 
    title,
    bandwidth = 20,
    thresholds = 10,
    showXBossFloors = false,
    showYBossFloors = false,
    options = {} 
  }: Props = $props();

  let container: HTMLDivElement;

  function renderPlot() {
    if (!container || !data.length) return;
    
    container.innerHTML = '';

    const hasCategories = data.some(d => d.category);

    // Calculate data extent and add padding to show density near edges
    const xValues = data.map(d => d.x);
    const yValues = data.map(d => d.y);
    const xMin = Math.min(...xValues);
    const yMin = Math.min(...yValues);
    const xMax = Math.max(...xValues);
    const yMax = Math.max(...yValues);
    const xPadding = (xMax - xMin) * 0.2 || 5;
    const yPadding = (yMax - yMin) * 0.2 || 5;

    const plotOptions: Parameters<typeof Plot.plot>[0] = {
      width: options.width ?? 600,
      height: options.height ?? 400,
      marginTop: options.marginTop ?? 40,
      marginRight: options.marginRight ?? 40,
      marginBottom: options.marginBottom ?? 50,
      marginLeft: options.marginLeft ?? 60,
      style: {
        background: 'transparent',
        color: $isDarkMode ? '#e2e8f0' : '#1e293b',
        fontSize: '12px',
      },
      x: { label: xLabel, grid: true, domain: [xMin - xPadding, xMax + xPadding] },
      y: { label: yLabel, grid: true, domain: [yMin - yPadding, yMax + yPadding] },
      marks: [
        // Boss floor reference lines
        ...(showXBossFloors ? BOSS_FLOORS.map(f => Plot.ruleX([f], {
          stroke: $isDarkMode ? '#64748b' : '#94a3b8',
          strokeWidth: 1,
          strokeDasharray: '4,4',
        })) : []),
        ...(showYBossFloors ? BOSS_FLOORS.map(f => Plot.ruleY([f], {
          stroke: $isDarkMode ? '#64748b' : '#94a3b8',
          strokeWidth: 1,
          strokeDasharray: '4,4',
        })) : []),
        Plot.density(data, {
          x: 'x',
          y: 'y',
          stroke: hasCategories ? 'category' : ($isDarkMode ? '#94a3b8' : '#3b82f6'),
          fill: hasCategories ? 'category' : ($isDarkMode ? '#94a3b8' : '#3b82f6'),
          fillOpacity: 0.1,
          strokeWidth: 1,
          bandwidth,
          thresholds,
        }),
        Plot.dot(data, {
          x: 'x',
          y: 'y',
          fill: hasCategories ? 'category' : ($isDarkMode ? '#94a3b8' : '#64748b'),
          fillOpacity: 0.4,
          r: 2,
          tip: true,
        }),
      ],
    };

    if (hasCategories) {
      plotOptions.color = { legend: true };
    }

    const plot = Plot.plot(plotOptions);

    container.appendChild(plot);
  }

  onMount(() => {
    renderPlot();
    return () => {
      if (container) container.innerHTML = '';
    };
  });

  $effect(() => {
    data;
    options;
    $isDarkMode;
    renderPlot();
  });
</script>

<div class="plot-container rounded-lg p-4" class:bg-slate-800={$isDarkMode} class:bg-white={!$isDarkMode}>
  {#if title}
    <h3 class="text-sm font-medium mb-2 text-center" class:text-slate-200={$isDarkMode} class:text-slate-700={!$isDarkMode}>
      {title}
    </h3>
  {/if}
  <div bind:this={container}></div>
</div>

<style>
  .plot-container {
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  }
  
  .plot-container :global([aria-label="tip"] path) {
    fill: white;
    stroke: #334155;
  }
  
  .plot-container :global([aria-label="tip"] text) {
    fill: #1e293b;
  }
</style>
