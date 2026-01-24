<script lang="ts">
  import * as Plot from '@observablehq/plot';
  import { onMount } from 'svelte';
  import type { ScatterPlotData, PlotOptions } from './types';
  import { isDarkMode } from '$lib/stores/theme';

  // Boss floor markers
  const BOSS_FLOORS = [17, 34, 51, 57];

  interface Props {
    data: ScatterPlotData[];
    xLabel?: string;
    yLabel?: string;
    title?: string;
    colorField?: string;
    sizeField?: string;
    showXBossFloors?: boolean;
    showYBossFloors?: boolean;
    options?: PlotOptions;
  }

  let { 
    data, 
    xLabel = 'X', 
    yLabel = 'Y', 
    title,
    colorField,
    sizeField,
    showXBossFloors = false,
    showYBossFloors = false,
    options = {} 
  }: Props = $props();

  let container: HTMLDivElement;

  function renderPlot() {
    if (!container || !data.length) return;
    
    // Clear previous plot
    container.innerHTML = '';

    const plotOptions: Parameters<typeof Plot.plot>[0] = {
      width: options.width ?? 600,
      height: options.height ?? 400,
      marginTop: options.marginTop ?? 40,
      marginRight: options.marginRight ?? 20,
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
        // Boss floor reference lines (vertical for X axis, horizontal for Y axis)
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
        Plot.dot(data, {
          x: 'x',
          y: 'y',
          fill: colorField ?? '#3b82f6',
          r: sizeField ? (d: ScatterPlotData) => d.size ?? 4 : 4,
          opacity: 0.7,
          tip: true,
        }),
        // Add trend line
        Plot.linearRegressionY(data, {
          x: 'x',
          y: 'y',
          stroke: '#f59e0b',
          strokeWidth: 2,
          strokeDasharray: '4,4',
        }),
      ],
    };

    if (colorField) {
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
    // Re-render when data or theme changes
    data;
    $isDarkMode;
    renderPlot();
  });
</script>

<div class="scatter-plot">
  {#if title}
    <h3 class="text-lg font-semibold mb-2 plot-title">{title}</h3>
  {/if}
  <div bind:this={container} class="plot-container flex justify-center"></div>
</div>

<style>
  .scatter-plot {
    padding: 1rem;
    border-radius: 0.5rem;
  }
  
  :global(.dark) .scatter-plot {
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(71, 85, 105, 0.5);
  }
  
  :global(.light) .scatter-plot {
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
