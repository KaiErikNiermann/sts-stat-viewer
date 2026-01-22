<script lang="ts">
  import * as Plot from '@observablehq/plot';
  import { onMount } from 'svelte';
  import type { PlotOptions } from './types';
  import { isDarkMode } from '$lib/stores/theme';

  export interface WaffleData {
    category: string;
    value: number;
    color?: string;
  }

  interface Props {
    data: WaffleData[];
    title?: string;
    unit?: number;
    options?: PlotOptions;
  }

  let { 
    data, 
    title,
    unit = 1,
    options = {} 
  }: Props = $props();

  let container: HTMLDivElement;

  function renderPlot() {
    if (!container || !data.length) return;
    
    container.innerHTML = '';

    const colorScheme = [
      '#22c55e', // green - victories
      '#ef4444', // red - defeats
      '#3b82f6', // blue
      '#f59e0b', // amber
      '#8b5cf6', // purple
      '#06b6d4', // cyan
      '#ec4899', // pink
      '#84cc16', // lime
    ];

    const plot = Plot.plot({
      width: options.width ?? 350,
      height: options.height ?? 300,
      marginTop: options.marginTop ?? 20,
      marginRight: options.marginRight ?? 20,
      marginBottom: options.marginBottom ?? 60,
      marginLeft: options.marginLeft ?? 50,
      style: {
        background: 'transparent',
        color: $isDarkMode ? '#e2e8f0' : '#1e293b',
        fontSize: '12px',
      },
      y: { 
        label: 'Count',
        tickFormat: (d: number) => String(Math.round(d)),
      },
      color: {
        domain: data.map(d => d.category),
        range: data.map((d, i) => d.color ?? colorScheme[i % colorScheme.length]),
        legend: true,
      },
      marks: [
        Plot.waffleY(data, {
          y: 'value',
          fill: 'category',
          unit,
          rx: 2,
          gap: 2,
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
  <!-- Summary stats below the chart -->
  {#if data.length > 0}
    {@const total = data.reduce((sum, d) => sum + d.value, 0)}
    <div class="mt-2 text-xs text-center space-y-1" class:text-slate-400={$isDarkMode} class:text-slate-500={!$isDarkMode}>
      <p>Each square = {unit} run{unit > 1 ? 's' : ''} · Total: {total} runs</p>
      <div class="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {#each data as d}
          <span>
            <span class="font-medium" style="color: {d.color ?? '#888'}">{d.category}:</span>
            {d.value} ({((d.value / total) * 100).toFixed(1)}%)
          </span>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .plot-container {
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  }
</style>
