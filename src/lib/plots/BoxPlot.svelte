<script lang="ts">
  import * as Plot from '@observablehq/plot';
  import { onMount } from 'svelte';
  import type { PlotOptions } from './types';
  import { isDarkMode } from '$lib/stores/theme';
  import { createDebouncedResizeObserver, calculatePlotDimensions, calculateTickCount } from '$lib/utils';

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
  let wrapper: HTMLDivElement;
  let containerWidth = $state(600);
  let containerHeight = $state(350);

  function renderPlot() {
    if (!container || !data.length) return;
    
    container.innerHTML = '';

    const hasColors = Object.keys(categoryColors).length > 0;

    const { width: plotWidth, height: plotHeight } = calculatePlotDimensions(
      containerWidth, containerHeight, { hasTitle: !!title }
    );
    
    const xTicks = calculateTickCount(plotWidth);
    const yTicks = calculateTickCount(plotHeight);

    // Build plot options, avoiding undefined for color
    const plotOptions: Parameters<typeof Plot.plot>[0] = {
      width: options.width ?? plotWidth,
      height: options.height ?? plotHeight,
      marginTop: options.marginTop ?? 30,
      marginRight: options.marginRight ?? 30,
      marginBottom: options.marginBottom ?? 45,
      marginLeft: options.marginLeft ?? 70,
      style: {
        background: 'transparent',
        color: $isDarkMode ? '#e2e8f0' : '#1e293b',
        fontSize: '11px',
      },
      x: { label: horizontal ? yLabel : xLabel, grid: horizontal, ticks: xTicks },
      y: { label: horizontal ? xLabel : yLabel, grid: !horizontal, ticks: yTicks },
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

<div class="box-plot" bind:this={wrapper}>
  {#if title}
    <h3 class="plot-title mb-1">{title}</h3>
  {/if}
  <div bind:this={container} class="plot-container"></div>
</div>

<style>
  .box-plot {
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
