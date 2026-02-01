<script lang="ts">
  import * as Plot from '@observablehq/plot';
  import { onMount } from 'svelte';
  import type { LineChartData, PlotOptions } from './types';
  import { isDarkMode } from '$lib/stores/theme';
  import { createDebouncedResizeObserver, calculatePlotDimensions, calculateTickCount } from '$lib/utils';

  // Boss floor markers
  const BOSS_FLOORS = [17, 34, 51, 57];

  interface Props {
    data: LineChartData[];
    xLabel?: string;
    yLabel?: string;
    title?: string;
    seriesColors?: Record<string, string>;
    showXBossFloors?: boolean;
    options?: PlotOptions;
  }

  let { 
    data, 
    xLabel = 'X', 
    yLabel = 'Y', 
    title,
    seriesColors = {},
    showXBossFloors = false,
    options = {} 
  }: Props = $props();

  let container: HTMLDivElement;
  let wrapper: HTMLDivElement;
  let containerWidth = $state(600);
  let containerHeight = $state(350);

  function renderPlot() {
    if (!container || !data.length) return;
    
    container.innerHTML = '';

    const hasSeries = data.some(d => d.series);
    const hasColors = Object.keys(seriesColors).length > 0;

    const { width: plotWidth, height: plotHeight } = calculatePlotDimensions(
      containerWidth, containerHeight, { hasTitle: !!title }
    );
    
    const xTicks = calculateTickCount(plotWidth);
    const yTicks = calculateTickCount(plotHeight);

    const plotOptions: Parameters<typeof Plot.plot>[0] = {
      width: options.width ?? plotWidth,
      height: options.height ?? plotHeight,
      marginTop: options.marginTop ?? 30,
      marginRight: options.marginRight ?? 80,
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
        // Boss floor reference lines (vertical for X axis)
        ...(showXBossFloors ? BOSS_FLOORS.map(f => Plot.ruleX([f], {
          stroke: $isDarkMode ? '#64748b' : '#94a3b8',
          strokeWidth: 1,
          strokeDasharray: '4,4',
        })) : []),
        Plot.line(data, {
          x: 'x',
          y: 'y',
          stroke: hasSeries ? 'series' : '#3b82f6',
          strokeWidth: 2,
          curve: 'catmull-rom',
        }),
        Plot.dot(data, {
          x: 'x',
          y: 'y',
          fill: hasSeries ? 'series' : '#3b82f6',
          r: 3,
          tip: true,
        }),
      ],
    };

    if (hasSeries) {
      plotOptions.color = { 
        legend: true,
        ...(hasColors ? { domain: Object.keys(seriesColors), range: Object.values(seriesColors) } : {}),
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
    $isDarkMode;
    containerWidth;
    containerHeight;
    renderPlot();
  });
</script>

<div class="line-chart" bind:this={wrapper}>
  {#if title}
    <h3 class="plot-title mb-1">{title}</h3>
  {/if}
  <div bind:this={container} class="plot-container"></div>
</div>

<style>
  .line-chart {
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
  
  .plot-container :global(svg) {
    display: block;
    max-width: 100%;
    max-height: 100%;
  }
  
  :global(.dark) .line-chart {
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(71, 85, 105, 0.5);
  }
  
  :global(.light) .line-chart {
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
