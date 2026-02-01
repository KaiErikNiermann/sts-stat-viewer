<script lang="ts">
  import * as Plot from '@observablehq/plot';
  import { onMount } from 'svelte';
  import type { ScatterPlotData, PlotOptions } from './types';
  import { isDarkMode } from '$lib/stores/theme';
  import { createDebouncedResizeObserver, calculatePlotDimensions, calculateTickCount } from '$lib/utils';

  // Boss floor markers
  const BOSS_FLOORS = [17, 34, 51, 57];

  interface Props {
    data: ScatterPlotData[];
    xLabel?: string;
    yLabel?: string;
    title?: string;
    colorField?: string;
    sizeField?: string;
    showXBossFloors?: boolean;
    showYBossFloors?: boolean;
    options?: PlotOptions;
  }

  let { 
    data, 
    xLabel = 'X', 
    yLabel = 'Y', 
    title,
    colorField,
    sizeField,
    showXBossFloors = false,
    showYBossFloors = false,
    options = {} 
  }: Props = $props();

  let container: HTMLDivElement;
  let wrapper: HTMLDivElement;
  let containerWidth = $state(600);
  let containerHeight = $state(350);

  function renderPlot() {
    if (!container || !data.length) return;
    
    // Clear previous plot
    container.innerHTML = '';

    // Calculate plot dimensions based on container
    const { width: plotWidth, height: plotHeight } = calculatePlotDimensions(
      containerWidth, containerHeight, { hasTitle: !!title }
    );
    
    // Dynamic tick counts based on size
    const xTicks = calculateTickCount(plotWidth);
    const yTicks = calculateTickCount(plotHeight);

    const plotOptions: Parameters<typeof Plot.plot>[0] = {
      width: options.width ?? plotWidth,
      height: options.height ?? plotHeight,
      marginTop: options.marginTop ?? 30,
      marginRight: options.marginRight ?? 20,
      marginBottom: options.marginBottom ?? 45,
      marginLeft: options.marginLeft ?? 55,
      style: {
        background: 'transparent',
        color: $isDarkMode ? '#e2e8f0' : '#1e293b',
        fontSize: '11px',
      },
      x: { label: xLabel, grid: true, ticks: xTicks },
      y: { label: yLabel, grid: true, ticks: yTicks },
      marks: [
        // Boss floor reference lines (vertical for X axis, horizontal for Y axis)
        ...(showXBossFloors ? BOSS_FLOORS.map(f => Plot.ruleX([f], {
          stroke: $isDarkMode ? '#64748b' : '#94a3b8',
          strokeWidth: 1,
          strokeDasharray: '4,4',
        })) : []),
        ...(showYBossFloors ? BOSS_FLOORS.map(f => Plot.ruleY([f], {
          stroke: $isDarkMode ? '#64748b' : '#94a3b8',
          strokeWidth: 1,
          strokeDasharray: '4,4',
        })) : []),
        Plot.dot(data, {
          x: 'x',
          y: 'y',
          fill: colorField ?? '#3b82f6',
          r: sizeField ? (d: ScatterPlotData) => d.size ?? 4 : 4,
          opacity: 0.7,
          tip: true,
        }),
        // Add trend line
        Plot.linearRegressionY(data, {
          x: 'x',
          y: 'y',
          stroke: '#f59e0b',
          strokeWidth: 2,
          strokeDasharray: '4,4',
        }),
      ],
    };

    if (colorField) {
      plotOptions.color = { legend: true };
    }

    const plot = Plot.plot(plotOptions);

    container.appendChild(plot);
  }

  onMount(() => {
    // Set up debounced ResizeObserver to track container size
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
    // Re-render when data, theme, or container size changes
    data;
    $isDarkMode;
    containerWidth;
    containerHeight;
    renderPlot();
  });
</script>

<div class="scatter-plot" bind:this={wrapper}>
  {#if title}
    <h3 class="plot-title mb-1">{title}</h3>
  {/if}
  <div bind:this={container} class="plot-container"></div>
</div>

<style>
  .scatter-plot {
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
