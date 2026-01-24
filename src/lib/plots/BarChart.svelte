<script lang="ts">
  import * as Plot from '@observablehq/plot';
  import { onMount } from 'svelte';
  import type { BarChartData, PlotOptions } from './types';
  import { isDarkMode } from '$lib/stores/theme';

  interface Props {
    data: BarChartData[];
    xLabel?: string;
    yLabel?: string;
    title?: string;
    horizontal?: boolean;
    options?: PlotOptions;
  }

  let { 
    data, 
    xLabel = 'Category', 
    yLabel = 'Value', 
    title,
    horizontal = false,
    options = {} 
  }: Props = $props();

  let container: HTMLDivElement;

  function renderPlot() {
    if (!container || !data.length) return;
    
    container.innerHTML = '';

    const plot = Plot.plot({
      width: options.width ?? 600,
      height: options.height ?? 400,
      marginTop: options.marginTop ?? 40,
      marginRight: options.marginRight ?? 20,
      marginBottom: options.marginBottom ?? 80,
      marginLeft: options.marginLeft ?? 60,
      style: {
        background: 'transparent',
        color: $isDarkMode ? '#e2e8f0' : '#1e293b',
        fontSize: '12px',
      },
      x: horizontal 
        ? { label: yLabel, grid: true }
        : { label: xLabel, tickRotate: -45 },
      y: horizontal 
        ? { label: xLabel }
        : { label: yLabel, grid: true },
      color: { legend: false },
      marks: horizontal
        ? [
            Plot.barX(data, {
              x: 'value',
              y: 'category',
              fill: (d: BarChartData) => d.color ?? '#3b82f6',
              sort: { y: '-x' },
              tip: true,
            }),
          ]
        : [
            Plot.barY(data, {
              x: 'category',
              y: 'value',
              fill: (d: BarChartData) => d.color ?? '#3b82f6',
              tip: true,
            }),
            Plot.ruleY([0]),
          ],
    });

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
    horizontal;
    $isDarkMode;
    renderPlot();
  });
</script>

<div class="bar-chart">
  {#if title}
    <h3 class="text-lg font-semibold mb-2 plot-title">{title}</h3>
  {/if}
  <div bind:this={container} class="plot-container flex justify-center"></div>
</div>

<style>
  .bar-chart {
    padding: 1rem;
    border-radius: 0.5rem;
  }
  
  :global(.dark) .bar-chart {
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(71, 85, 105, 0.5);
  }
  
  :global(.light) .bar-chart {
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
