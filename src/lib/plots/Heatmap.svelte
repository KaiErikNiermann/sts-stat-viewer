<script lang="ts">
  import * as Plot from '@observablehq/plot';
  import type { ColorScheme } from '@observablehq/plot';
  import { onMount } from 'svelte';
  import type { PlotOptions } from './types';
  import { isDarkMode } from '$lib/stores/theme';
  import { createDebouncedResizeObserver, calculatePlotDimensions } from '$lib/utils';

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
  let wrapper: HTMLDivElement;
  let containerWidth = $state(600);
  let containerHeight = $state(350);

  function renderPlot() {
    if (!container || !data.length) return;
    
    container.innerHTML = '';

    const { width: plotWidth, height: plotHeight } = calculatePlotDimensions(
      containerWidth, containerHeight, { hasTitle: !!title }
    );

    const plot = Plot.plot({
      width: options.width ?? plotWidth,
      height: options.height ?? plotHeight,
      marginTop: options.marginTop ?? 30,
      marginRight: options.marginRight ?? 70,
      marginBottom: options.marginBottom ?? 45,
      marginLeft: options.marginLeft ?? 55,
      padding: 0,
      style: {
        background: 'transparent',
        color: $isDarkMode ? '#e2e8f0' : '#1e293b',
        fontSize: '11px',
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

<div class="heatmap" bind:this={wrapper}>
  {#if title}
    <h3 class="plot-title mb-1">{title}</h3>
  {/if}
  <div bind:this={container} class="plot-container"></div>
</div>

<style>
  .heatmap {
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
