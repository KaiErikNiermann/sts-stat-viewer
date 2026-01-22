<script lang="ts">
  import * as Plot from '@observablehq/plot';
  import { onMount } from 'svelte';
  import type { PlotOptions } from './types';
  import { isDarkMode } from '$lib/stores/theme';

  export interface BoxPlotData {
    category: string;
    value: number;
    color?: string;
  }

  interface Props {
    data: BoxPlotData[];
    xLabel?: string;
    yLabel?: string;
    title?: string;
    horizontal?: boolean;
    categoryColors?: Record<string, string>;
    options?: PlotOptions;
  }

  let { 
    data, 
    xLabel = 'Category', 
    yLabel = 'Value', 
    title,
    horizontal = false,
    categoryColors = {},
    options = {} 
  }: Props = $props();

  let container: HTMLDivElement;

  function renderPlot() {
    if (!container || !data.length) return;
    
    container.innerHTML = '';

    const hasColors = Object.keys(categoryColors).length > 0;

    // Build plot options, avoiding undefined for color
    const plotOptions: Parameters<typeof Plot.plot>[0] = {
      width: options.width ?? 600,
      height: options.height ?? 400,
      marginTop: options.marginTop ?? 40,
      marginRight: options.marginRight ?? 40,
      marginBottom: options.marginBottom ?? 50,
      marginLeft: options.marginLeft ?? 80,
      style: {
        background: 'transparent',
        color: $isDarkMode ? '#e2e8f0' : '#1e293b',
        fontSize: '12px',
      },
      x: { label: horizontal ? yLabel : xLabel, grid: horizontal },
      y: { label: horizontal ? xLabel : yLabel, grid: !horizontal },
      marks: [
        horizontal
          ? Plot.boxX(data, { 
              x: 'value', 
              y: 'category',
              fill: hasColors ? 'category' : '#3b82f6',
              fillOpacity: 0.6,
            })
          : Plot.boxY(data, { 
              x: 'category', 
              y: 'value',
              fill: hasColors ? 'category' : '#3b82f6',
              fillOpacity: 0.6,
            }),
      ],
    };
    
    if (hasColors) {
      plotOptions.color = {
        domain: Object.keys(categoryColors),
        range: Object.values(categoryColors),
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
    // Re-render when data, options, or theme changes
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
