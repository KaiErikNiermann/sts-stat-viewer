<script lang="ts">
  import * as Plot from '@observablehq/plot';
  import { onMount } from 'svelte';
  import type { BarChartData, PlotOptions } from './types';
  import { isDarkMode } from '$lib/stores/theme';
  import { createDebouncedResizeObserver, calculatePlotDimensions, calculateTickCount } from '$lib/utils';

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
  let wrapper: HTMLDivElement;
  let containerWidth = $state(600);
  let containerHeight = $state(350);

  function renderPlot() {
    if (!container || !data.length) return;
    
    container.innerHTML = '';

    const { width: plotWidth, height: plotHeight } = calculatePlotDimensions(
      containerWidth, containerHeight, { hasTitle: !!title }
    );
    
    const xTicks = calculateTickCount(plotWidth);
    const yTicks = calculateTickCount(plotHeight);

    const plot = Plot.plot({
      width: options.width ?? plotWidth,
      height: options.height ?? plotHeight,
      marginTop: options.marginTop ?? 30,
      marginRight: options.marginRight ?? 15,
      marginBottom: options.marginBottom ?? 70,
      marginLeft: options.marginLeft ?? 55,
      style: {
        background: 'transparent',
        color: $isDarkMode ? '#e2e8f0' : '#1e293b',
        fontSize: '11px',
      },
      x: horizontal 
        ? { label: yLabel, grid: true, ticks: xTicks }
        : { label: xLabel, tickRotate: -45 },
      y: horizontal 
        ? { label: xLabel }
        : { label: yLabel, grid: true, ticks: yTicks },
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
    horizontal;
    $isDarkMode;
    containerWidth;
    containerHeight;
    renderPlot();
  });
</script>

<div class="bar-chart" bind:this={wrapper}>
  {#if title}
    <h3 class="plot-title mb-1">{title}</h3>
  {/if}
  <div bind:this={container} class="plot-container"></div>
</div>

<style>
  .bar-chart {
    padding: 0.75rem;
    border-radius: 0.5rem;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  }
  
  .plot-container {
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
  
  .plot-container :global(svg) {
    display: block;
    max-width: 100%;
    max-height: 100%;
  }
</style>
