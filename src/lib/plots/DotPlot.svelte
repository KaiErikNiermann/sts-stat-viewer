<script lang="ts">
  import * as Plot from '@observablehq/plot';
  import { onMount } from 'svelte';
  import type { PlotOptions } from './types';
  import { isDarkMode } from '$lib/stores/theme';

  interface DotPlotData {
    category: string;
    value: number;
    color?: string;
  }

  interface Props {
    data: DotPlotData[];
    xLabel?: string;
    yLabel?: string;
    title?: string;
    options?: PlotOptions;
  }

  let { 
    data, 
    xLabel = 'Value', 
    yLabel = 'Category', 
    title,
    options = {} 
  }: Props = $props();

  let container: HTMLDivElement;

  function renderPlot() {
    if (!container || !data.length) return;
    
    container.innerHTML = '';

    const plot = Plot.plot({
      width: options.width ?? 600,
      height: options.height ?? Math.max(300, data.length * 30),
      marginTop: options.marginTop ?? 40,
      marginRight: options.marginRight ?? 20,
      marginBottom: options.marginBottom ?? 50,
      marginLeft: options.marginLeft ?? 120,
      style: {
        background: 'transparent',
        color: $isDarkMode ? '#e2e8f0' : '#1e293b',
        fontSize: '12px',
      },
      x: { label: xLabel, grid: true },
      y: { label: yLabel },
      marks: [
        Plot.dot(data, {
          x: 'value',
          y: 'category',
          fill: (d: DotPlotData) => d.color ?? '#3b82f6',
          r: 8,
          sort: { y: '-x' },
          tip: true,
        }),
        Plot.ruleX([0], { stroke: '#475569' }),
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
    $isDarkMode;
    renderPlot();
  });
</script>

<div class="dot-plot">
  {#if title}
    <h3 class="text-lg font-semibold mb-2 plot-title">{title}</h3>
  {/if}
  <div bind:this={container} class="plot-container flex justify-center"></div>
</div>

<style>
  .dot-plot {
    padding: 1rem;
    border-radius: 0.5rem;
  }
  
  :global(.dark) .dot-plot {
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(71, 85, 105, 0.5);
  }
  
  :global(.light) .dot-plot {
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
