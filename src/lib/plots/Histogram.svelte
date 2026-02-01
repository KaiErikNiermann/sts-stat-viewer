<script lang="ts">
  import * as Plot from '@observablehq/plot';
  import { onMount } from 'svelte';
  import type { HistogramData, PlotOptions } from './types';
  import { isDarkMode } from '$lib/stores/theme';
  import { createDebouncedResizeObserver, calculatePlotDimensions, calculateTickCount } from '$lib/utils';

  // Boss floor markers
  const BOSS_FLOORS = [17, 34, 51, 57];

  interface Props {
    data: HistogramData[];
    xLabel?: string;
    yLabel?: string;
    title?: string;
    bins?: number;
    color?: string;
    showXBossFloors?: boolean;
    showNormalCurve?: boolean;
    options?: PlotOptions;
  }

  let { 
    data, 
    xLabel = 'Value', 
    yLabel = 'Count', 
    title,
    bins = 20,
    color = '#3b82f6',
    showXBossFloors = false,
    showNormalCurve = false,
    options = {} 
  }: Props = $props();

  let container: HTMLDivElement;
  let wrapper: HTMLDivElement;
  let containerWidth = $state(600);
  let containerHeight = $state(350);

  // Calculate normal distribution curve points
  function generateNormalCurve(values: number[], binCount: number) {
    if (values.length === 0) return [];
    
    // Calculate mean and standard deviation
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Get the range of the data
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    // Generate points for the normal curve
    const points = [];
    const numPoints = 100;
    
    for (let i = 0; i <= numPoints; i++) {
      const x = min + (range * i / numPoints);
      // Normal distribution formula (probability density function)
      const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2));
      const y = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
      
      // Scale y to match the histogram's frequency count
      // Multiply by total count and bin width to match histogram scale
      const binWidth = range / binCount;
      const scaledY = y * values.length * binWidth;
      
      points.push({ x, y: scaledY });
    }
    
    return points;
  }

  function renderPlot() {
    if (!container || !data.length) return;
    
    container.innerHTML = '';

    const values = data.map(d => d.value);
    const normalCurveData = showNormalCurve ? generateNormalCurve(values, bins) : [];

    // Calculate plot dimensions based on container
    const { width: plotWidth, height: plotHeight } = calculatePlotDimensions(
      containerWidth, containerHeight, { hasTitle: !!title }
    );
    
    // Dynamic tick counts based on size
    const xTicks = calculateTickCount(plotWidth);
    const yTicks = calculateTickCount(plotHeight);

    const plot = Plot.plot({
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
        // Boss floor reference lines (vertical)
        ...(showXBossFloors ? BOSS_FLOORS.map(f => Plot.ruleX([f], {
          stroke: $isDarkMode ? '#64748b' : '#94a3b8',
          strokeWidth: 1,
          strokeDasharray: '4,4',
        })) : []),
        Plot.rectY(data, {
          ...Plot.binX({ y: 'count' }, { x: 'value', thresholds: bins }),
          fill: color,
          tip: true,
        }),
        // Normal distribution curve overlay
        ...(showNormalCurve ? [
          Plot.line(normalCurveData, {
            x: 'x',
            y: 'y',
            stroke: $isDarkMode ? '#fbbf24' : '#f59e0b',
            strokeWidth: 2,
            curve: 'basis',
          })
        ] : []),
        Plot.ruleY([0]),
      ],
    });

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
    data;
    bins;
    showNormalCurve;
    $isDarkMode;
    containerWidth;
    containerHeight;
    renderPlot();
  });
</script>

<div class="histogram" bind:this={wrapper}>
  {#if title}
    <h3 class="plot-title mb-1">{title}</h3>
  {/if}
  <div bind:this={container} class="plot-container"></div>
</div>

<style>
  .histogram {
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
