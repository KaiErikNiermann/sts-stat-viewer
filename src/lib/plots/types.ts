/**
 * Types for Observable Plot components
 */

export interface PlotOptions {
  width?: number;
  height?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  title?: string;
  subtitle?: string;
}

export interface Mark {
  type: 'dot' | 'line' | 'bar' | 'rect' | 'text';
  data: unknown[];
  options?: Record<string, unknown>;
}

export interface ScatterPlotData {
  x: number;
  y: number;
  label?: string;
  color?: string;
  size?: number;
}

export interface BarChartData {
  category: string;
  value: number;
  color?: string;
}

export interface HistogramData {
  value: number;
}

export interface LineChartData {
  x: number;
  y: number;
  series?: string;
}

export interface BoxPlotData {
  category: string;
  value: number;
  color?: string;
}

export interface HeatmapData {
  x: string | number;
  y: string | number;
  value: number;
}

export interface StackedAreaData {
  x: number | Date;
  y: number;
  series: string;
}

export interface RegressionData {
  x: number;
  y: number;
  color?: string;
  label?: string;
}

export interface WaffleData {
  category: string;
  value: number;
  color?: string;
}

export interface DensityData {
  x: number;
  y: number;
  category?: string;
}

export interface SurvivalData {
  floor: number;
  survival: number;
  character?: string;
}

export interface ItemStatData {
  item: string;
  avgFloor: number;
  count: number;
}
