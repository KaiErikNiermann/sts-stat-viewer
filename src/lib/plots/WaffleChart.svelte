<script lang="ts">
  import * as Plot from '@observablehq/plot';
  import { onMount } from 'svelte';
  import type { PlotOptions } from './types';
  import { isDarkMode } from '$lib/stores/theme';
  import { createDebouncedResizeObserver, calculatePlotDimensions, calculateTickCount } from '$lib/utils';

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
  let wrapper: HTMLDivElement;
  let containerWidth = $state(350);
  let containerHeight = $state(300);

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

    // WaffleChart needs extra space for summary stats below
    const { width: plotWidth, height: plotHeight } = calculatePlotDimensions(
      containerWidth, containerHeight, { hasTitle: !!title, titleHeight: 60, padding: 16 }
    );
    
    const yTicks = calculateTickCount(plotHeight);

    const plot = Plot.plot({
      width: options.width ?? plotWidth,
      height: options.height ?? Math.max(100, plotHeight - 40),
      marginTop: options.marginTop ?? 15,
      marginRight: options.marginRight ?? 30,
      marginBottom: options.marginBottom ?? 50,
      marginLeft: options.marginLeft ?? 50,
      style: {
        background: 'transparent',
        color: $isDarkMode ? '#e2e8f0' : '#1e293b',
        fontSize: '11px',
      },
      y: { 
        label: 'Count',
        tickFormat: (d: number) => String(Math.round(d)),
        ticks: yTicks,
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
    let cleanup: (() => void) | undefined;
    
    if (wrapper) {
      cleanup = createDebouncedResizeObserver(wrapper, ({ width, height }) => {
        containerWidth = width;
        containerHeight = height;
      }, { debounceMs: 150 });
    }

    renderPlot();

    return () => {
      cleanup?.();
      if (container) container.innerHTML = '';
    };
  });

  $effect(() => {
    data;
    options;
    $isDarkMode;
    containerWidth;
    containerHeight;
    renderPlot();
  });
</script>

<div class="waffle-chart" bind:this={wrapper}>
  {#if title}
    <h3 class="plot-title mb-1">{title}</h3>
  {/if}
  <div bind:this={container} class="chart-container"></div>
  <!-- Summary stats below the chart -->
  {#if data.length > 0}
    {@const total = data.reduce((sum, d) => sum + d.value, 0)}
    <div class="summary-stats">
      <p>Each square = {unit} run{unit > 1 ? 's' : ''} · Total: {total} runs</p>
      <div class="stats-row">
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
  .waffle-chart {
    padding: 0.75rem;
    border-radius: 0.5rem;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  }
  
  .chart-container {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .plot-title {
    color: #e2e8f0;
    flex-shrink: 0;
  }
  
  :global(.light) .plot-title {
    color: #1e293b;
  }
  
  .summary-stats {
    margin-top: 0.5rem;
    text-align: center;
    font-size: 0.75rem;
    color: #94a3b8;
    flex-shrink: 0;
  }
  
  :global(.light) .summary-stats {
    color: #64748b;
  }
  
  .stats-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.25rem 1rem;
    margin-top: 0.25rem;
  }
  
  .chart-container :global(svg) {
    display: block;
    max-width: 100%;
    max-height: 100%;
  }
</style>
