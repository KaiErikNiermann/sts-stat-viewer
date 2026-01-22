/**
 * Observable Plot wrapper components for Svelte 5
 * 
 * These components provide reusable, type-safe wrappers around Observable Plot
 * with STS-themed styling and automatic cleanup.
 */

export { default as ScatterPlot } from './ScatterPlot.svelte';
export { default as BarChart } from './BarChart.svelte';
export { default as Histogram } from './Histogram.svelte';
export { default as LineChart } from './LineChart.svelte';
export { default as DotPlot } from './DotPlot.svelte';
export { default as BoxPlot } from './BoxPlot.svelte';
export { default as Heatmap } from './Heatmap.svelte';
export { default as StackedArea } from './StackedArea.svelte';
export { default as RegressionPlot } from './RegressionPlot.svelte';
export { default as WaffleChart } from './WaffleChart.svelte';
export { default as DensityPlot } from './DensityPlot.svelte';
export { default as ItemTable } from './ItemTable.svelte';
export type { ItemTableMode } from './ItemTable.svelte';

// Re-export types
export type {
  PlotOptions,
  Mark,
  ScatterPlotData,
  BarChartData,
  HistogramData,
  LineChartData,
  BoxPlotData,
  HeatmapData,
  StackedAreaData,
  RegressionData,
  WaffleData,
  DensityData,
  SurvivalData,
  ItemStatData,
} from './types';
