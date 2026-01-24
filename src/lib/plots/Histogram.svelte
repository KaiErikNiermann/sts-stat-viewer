<script lang="ts">
  import * as Plot from '@observablehq/plot';
  import { onMount } from 'svelte';
  import type { HistogramData, PlotOptions } from './types';
  import { isDarkMode } from '$lib/stores/theme';

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

    const plot = Plot.plot({
      width: options.width ?? 600,
      height: options.height ?? 400,
      marginTop: options.marginTop ?? 40,
      marginRight: options.marginRight ?? 20,
      marginBottom: options.marginBottom ?? 50,
      marginLeft: options.marginLeft ?? 60,
      style: {
        background: 'transparent',
        color: $isDarkMode ? '#e2e8f0' : '#1e293b',
        fontSize: '12px',
      },
      x: { label: xLabel, grid: true },
      y: { label: yLabel, grid: true },
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
    renderPlot();
    return () => {
      if (container) container.innerHTML = '';
    };
  });

  $effect(() => {
    data;
    bins;
    showNormalCurve;
    $isDarkMode;
    renderPlot();
  });
</script>

<div class="histogram">
  {#if title}
    <h3 class="text-lg font-semibold mb-2 plot-title">{title}</h3>
  {/if}
  <div bind:this={container} class="plot-container flex justify-center"></div>
</div>

<style>
  .histogram {
    padding: 1rem;
    border-radius: 0.5rem;
  }
  
  :global(.dark) .histogram {
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(71, 85, 105, 0.5);
  }
  
  :global(.light) .histogram {
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
