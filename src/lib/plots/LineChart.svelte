<script lang="ts">
  import * as Plot from '@observablehq/plot';
  import { onMount } from 'svelte';
  import type { LineChartData, PlotOptions } from './types';
  import { isDarkMode } from '$lib/stores/theme';

  // Boss floor markers
  const BOSS_FLOORS = [17, 34, 51, 57];

  interface Props {
    data: LineChartData[];
    xLabel?: string;
    yLabel?: string;
    title?: string;
    seriesColors?: Record<string, string>;
    showXBossFloors?: boolean;
    options?: PlotOptions;
  }

  let { 
    data, 
    xLabel = 'X', 
    yLabel = 'Y', 
    title,
    seriesColors = {},
    showXBossFloors = false,
    options = {} 
  }: Props = $props();

  let container: HTMLDivElement;

  function renderPlot() {
    if (!container || !data.length) return;
    
    container.innerHTML = '';

    const hasSeries = data.some(d => d.series);
    const hasColors = Object.keys(seriesColors).length > 0;

    const plotOptions: Parameters<typeof Plot.plot>[0] = {
      width: options.width ?? 600,
      height: options.height ?? 400,
      marginTop: options.marginTop ?? 40,
      marginRight: options.marginRight ?? 100,
      marginBottom: options.marginBottom ?? 50,
      marginLeft: options.marginLeft ?? 60,
      style: {
        background: 'transparent',
        color: $isDarkMode ? '#e2e8f0' : '#1e293b',
        fontSize: '12px',
      },
      x: { label: xLabel, grid: true },
      y: { label: yLabel, grid: true },
      marks: [
        // Boss floor reference lines (vertical for X axis)
        ...(showXBossFloors ? BOSS_FLOORS.map(f => Plot.ruleX([f], {
          stroke: $isDarkMode ? '#64748b' : '#94a3b8',
          strokeWidth: 1,
          strokeDasharray: '4,4',
        })) : []),
        Plot.line(data, {
          x: 'x',
          y: 'y',
          stroke: hasSeries ? 'series' : '#3b82f6',
          strokeWidth: 2,
          curve: 'catmull-rom',
        }),
        Plot.dot(data, {
          x: 'x',
          y: 'y',
          fill: hasSeries ? 'series' : '#3b82f6',
          r: 3,
          tip: true,
        }),
      ],
    };

    if (hasSeries) {
      plotOptions.color = { 
        legend: true,
        ...(hasColors ? { domain: Object.keys(seriesColors), range: Object.values(seriesColors) } : {}),
      };
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
    $isDarkMode;
    renderPlot();
  });
</script>

<div class="line-chart">
  {#if title}
    <h3 class="text-lg font-semibold mb-2 plot-title">{title}</h3>
  {/if}
  <div bind:this={container} class="plot-container"></div>
</div>

<style>
  .line-chart {
    padding: 1rem;
    border-radius: 0.5rem;
  }
  
  :global(.dark) .line-chart {
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(71, 85, 105, 0.5);
  }
  
  :global(.light) .line-chart {
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(203, 213, 225, 0.8);
  }
  
  .plot-title {
    color: #e2e8f0;
  }
  
  :global(.light) .plot-title {
    color: #1e293b;
  }
  
  .plot-container :global(svg) {
    display: block;
  }
</style>
