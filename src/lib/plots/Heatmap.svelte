<script lang="ts">
  import * as Plot from '@observablehq/plot';
  import type { ColorScheme } from '@observablehq/plot';
  import { onMount } from 'svelte';
  import type { PlotOptions } from './types';
  import { isDarkMode } from '$lib/stores/theme';

  export interface HeatmapData {
    x: string | number;
    y: string | number;
    value: number;
  }

  interface Props {
    data: HeatmapData[];
    xLabel?: string;
    yLabel?: string;
    title?: string;
    colorScheme?: ColorScheme;
    options?: PlotOptions;
  }

  let { 
    data, 
    xLabel = 'X', 
    yLabel = 'Y', 
    title,
    colorScheme = 'turbo' as ColorScheme,
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
      marginRight: options.marginRight ?? 80,
      marginBottom: options.marginBottom ?? 50,
      marginLeft: options.marginLeft ?? 60,
      padding: 0,
      style: {
        background: 'transparent',
        color: $isDarkMode ? '#e2e8f0' : '#1e293b',
        fontSize: '12px',
      },
      x: { label: xLabel },
      y: { label: yLabel },
      color: { 
        scheme: colorScheme,
        legend: true,
        label: 'Value',
      },
      marks: [
        Plot.cell(data, {
          x: 'x',
          y: 'y',
          fill: 'value',
          inset: 0.5,
          tip: true,
        }),
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
  <div bind:this={container} class="flex justify-center"></div>
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
