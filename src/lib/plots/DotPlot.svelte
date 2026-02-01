<script lang="ts">
  import * as Plot from '@observablehq/plot';
  import { onMount } from 'svelte';
  import type { PlotOptions } from './types';
  import { isDarkMode } from '$lib/stores/theme';
  import { createDebouncedResizeObserver, calculatePlotDimensions, calculateTickCount } from '$lib/utils';

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

    const plot = Plot.plot({
      width: options.width ?? plotWidth,
      height: options.height ?? Math.min(plotHeight, Math.max(150, data.length * 25)),
      marginTop: options.marginTop ?? 30,
      marginRight: options.marginRight ?? 15,
      marginBottom: options.marginBottom ?? 45,
      marginLeft: options.marginLeft ?? 100,
      style: {
        background: 'transparent',
        color: $isDarkMode ? '#e2e8f0' : '#1e293b',
        fontSize: '11px',
      },
      x: { label: xLabel, grid: true, ticks: xTicks },
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
    $isDarkMode;
    containerWidth;
    containerHeight;
    renderPlot();
  });
</script>

<div class="dot-plot" bind:this={wrapper}>
  {#if title}
    <h3 class="plot-title mb-1">{title}</h3>
  {/if}
  <div bind:this={container} class="plot-container"></div>
</div>

<style>
  .dot-plot {
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
