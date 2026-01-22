<script lang="ts">
  import { untrack } from 'svelte';
  import { isDarkMode } from '$lib/stores/theme';
  import { PLOT_FIELDS, type GraphConfig, type PlotFieldKey, getFieldLabel } from '$lib/stores/graphs';

  interface Props {
    config: GraphConfig;
    onSave: (changes: Partial<Omit<GraphConfig, 'id' | 'type'>>) => void;
    onClose: () => void;
  }

  let { config, onSave, onClose }: Props = $props();

  // Get initial values using untrack (modal is destroyed on close, so we only need initial value)
  const graphType = untrack(() => config.type);

  // Local state for editing - initialize from config using untrack to avoid warnings
  let title = $state(untrack(() => config.title));
  let xField = $state<PlotFieldKey>(untrack(() => config.xField));
  let yField = $state<PlotFieldKey>(untrack(() => config.yField));
  let bins = $state(untrack(() => config.bins ?? 15));
  let groupByCharacter = $state(untrack(() => config.groupByCharacter ?? true));
  let showConfidence = $state(untrack(() => config.showConfidence ?? true));
  let bandwidth = $state(untrack(() => config.bandwidth ?? 20));
  let showBossFloors = $state(untrack(() => config.showBossFloors ?? false));

  // Determine which options are available based on graph type
  const showXYFields = ['scatter', 'regression', 'density', 'boxplot'].includes(graphType);
  const showXFieldOnly = graphType === 'histogram';
  const showBinsOption = graphType === 'histogram';
  const showGroupByCharacter = graphType === 'survival';
  const showConfidenceOption = graphType === 'regression';
  const showBandwidthOption = graphType === 'density';
  
  // Boss floor option available when floor_reached could be on an axis
  const canShowBossFloors = !['winrate-waffle', 'boxplot'].includes(graphType);

  // Check if floor is on axis for boss floor option visibility
  let hasFloorOnAxis = $derived(
    xField === 'floor_reached' || yField === 'floor_reached' || graphType === 'survival'
  );

  // Auto-update labels when fields change
  let xLabel = $derived(getFieldLabel(xField));
  let yLabel = $derived(
    graphType === 'histogram' ? 'Count' : 
    graphType === 'survival' ? 'Survival %' : 
    getFieldLabel(yField)
  );

  function handleSubmit(e: Event) {
    e.preventDefault();
    
    const changes: Partial<Omit<GraphConfig, 'id' | 'type'>> = {
      title,
      xLabel,
      yLabel,
    };

    // Add type-specific fields
    if (showXYFields || showXFieldOnly) {
      changes.xField = xField;
    }
    if (showXYFields) {
      changes.yField = yField;
    }
    if (showBinsOption) {
      changes.bins = bins;
    }
    if (showGroupByCharacter) {
      changes.groupByCharacter = groupByCharacter;
    }
    if (showConfidenceOption) {
      changes.showConfidence = showConfidence;
    }
    if (showBandwidthOption) {
      changes.bandwidth = bandwidth;
    }
    if (canShowBossFloors && hasFloorOnAxis) {
      changes.showBossFloors = showBossFloors;
    }

    onSave(changes);
    onClose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }

  // Get friendly type name
  function getTypeName(type: string): string {
    const names: Record<string, string> = {
      'scatter': 'Scatter Plot',
      'histogram': 'Histogram',
      'regression': 'Regression Plot',
      'density': 'Density Plot',
      'survival': 'Survival Curve',
      'boxplot': 'Box Plot',
      'winrate-waffle': 'Win/Loss Waffle',
      'bar': 'Bar Chart',
    };
    return names[type] ?? type;
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
  class="fixed inset-0 z-50 flex items-center justify-center p-4"
  onkeydown={handleKeydown}
  role="dialog"
  aria-modal="true"
  tabindex="-1"
>
  <!-- Backdrop -->
  <button 
    type="button"
    class="absolute inset-0 bg-black/50 cursor-default border-none"
    onclick={onClose}
    aria-label="Close modal"
  ></button>
  
  <!-- Modal content -->
  <div 
    class="relative w-full max-w-md rounded-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto"
    class:bg-slate-800={$isDarkMode}
    class:bg-white={!$isDarkMode}
  >
    <!-- Close button -->
    <button
      type="button"
      class="absolute top-3 right-3 p-1 rounded-md transition-colors"
      class:text-slate-400={$isDarkMode}
      class:hover:text-slate-200={$isDarkMode}
      class:hover:bg-slate-700={$isDarkMode}
      class:text-slate-500={!$isDarkMode}
      class:hover:text-slate-700={!$isDarkMode}
      class:hover:bg-slate-100={!$isDarkMode}
      onclick={onClose}
      aria-label="Close modal"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    <h2 class="text-lg font-semibold mb-1" class:text-slate-100={$isDarkMode} class:text-slate-800={!$isDarkMode}>
      Edit Graph
    </h2>
    <p class="text-sm mb-4" class:text-slate-400={$isDarkMode} class:text-slate-500={!$isDarkMode}>
      {getTypeName(graphType)}
    </p>

    <form onsubmit={handleSubmit} class="space-y-4">
      <!-- Title -->
      <div>
        <label for="edit-title" class="block text-sm font-medium mb-1" class:text-slate-300={$isDarkMode} class:text-slate-700={!$isDarkMode}>
          Title
        </label>
        <input
          id="edit-title"
          type="text"
          bind:value={title}
          class="w-full px-3 py-2 rounded-md border text-sm"
          class:bg-slate-700={$isDarkMode}
          class:border-slate-600={$isDarkMode}
          class:text-slate-100={$isDarkMode}
          class:bg-white={!$isDarkMode}
          class:border-slate-300={!$isDarkMode}
          class:text-slate-800={!$isDarkMode}
        />
      </div>

      <!-- X Field (for scatter, regression, density, histogram, boxplot) -->
      {#if showXYFields || showXFieldOnly}
        <div>
          <label for="edit-x-field" class="block text-sm font-medium mb-1" class:text-slate-300={$isDarkMode} class:text-slate-700={!$isDarkMode}>
            {showXFieldOnly ? 'Value Field' : graphType === 'boxplot' ? 'Value Field' : 'X Axis Field'}
          </label>
          <select
            id="edit-x-field"
            bind:value={xField}
            class="w-full px-3 py-2 rounded-md border text-sm"
            class:bg-slate-700={$isDarkMode}
            class:border-slate-600={$isDarkMode}
            class:text-slate-100={$isDarkMode}
            class:bg-white={!$isDarkMode}
            class:border-slate-300={!$isDarkMode}
            class:text-slate-800={!$isDarkMode}
          >
            {#each PLOT_FIELDS as field}
              <option value={field.key}>{field.label}</option>
            {/each}
          </select>
        </div>
      {/if}

      <!-- Y Field (for scatter, regression, density, boxplot) -->
      {#if showXYFields}
        <div>
          <label for="edit-y-field" class="block text-sm font-medium mb-1" class:text-slate-300={$isDarkMode} class:text-slate-700={!$isDarkMode}>
            {graphType === 'boxplot' ? 'Group By Field' : 'Y Axis Field'}
          </label>
          <select
            id="edit-y-field"
            bind:value={yField}
            class="w-full px-3 py-2 rounded-md border text-sm"
            class:bg-slate-700={$isDarkMode}
            class:border-slate-600={$isDarkMode}
            class:text-slate-100={$isDarkMode}
            class:bg-white={!$isDarkMode}
            class:border-slate-300={!$isDarkMode}
            class:text-slate-800={!$isDarkMode}
          >
            {#each PLOT_FIELDS as field}
              <option value={field.key}>{field.label}</option>
            {/each}
          </select>
        </div>
      {/if}

      <!-- Bins (histogram) -->
      {#if showBinsOption}
        <div>
          <label for="edit-bins" class="block text-sm font-medium mb-1" class:text-slate-300={$isDarkMode} class:text-slate-700={!$isDarkMode}>
            Number of Bins
          </label>
          <input
            id="edit-bins"
            type="range"
            bind:value={bins}
            min="5"
            max="50"
            class="w-full"
          />
          <div class="flex justify-between text-xs" class:text-slate-400={$isDarkMode} class:text-slate-500={!$isDarkMode}>
            <span>5</span>
            <span class="font-medium">{bins}</span>
            <span>50</span>
          </div>
        </div>
      {/if}

      <!-- Group by character (survival) -->
      {#if showGroupByCharacter}
        <div class="flex items-center gap-2">
          <input
            id="edit-group-by-char"
            type="checkbox"
            bind:checked={groupByCharacter}
            class="w-4 h-4 rounded"
          />
          <label for="edit-group-by-char" class="text-sm" class:text-slate-300={$isDarkMode} class:text-slate-700={!$isDarkMode}>
            Group by character
          </label>
        </div>
      {/if}

      <!-- Show confidence (regression) -->
      {#if showConfidenceOption}
        <div class="flex items-center gap-2">
          <input
            id="edit-show-confidence"
            type="checkbox"
            bind:checked={showConfidence}
            class="w-4 h-4 rounded"
          />
          <label for="edit-show-confidence" class="text-sm" class:text-slate-300={$isDarkMode} class:text-slate-700={!$isDarkMode}>
            Show 95% confidence interval
          </label>
        </div>
      {/if}

      <!-- Bandwidth (density) -->
      {#if showBandwidthOption}
        <div>
          <label for="edit-bandwidth" class="block text-sm font-medium mb-1" class:text-slate-300={$isDarkMode} class:text-slate-700={!$isDarkMode}>
            Bandwidth (smoothing)
          </label>
          <input
            id="edit-bandwidth"
            type="range"
            bind:value={bandwidth}
            min="5"
            max="100"
            class="w-full"
          />
          <div class="flex justify-between text-xs" class:text-slate-400={$isDarkMode} class:text-slate-500={!$isDarkMode}>
            <span>5 (sharp)</span>
            <span class="font-medium">{bandwidth}</span>
            <span>100 (smooth)</span>
          </div>
        </div>
      {/if}

      <!-- Boss floor markers -->
      {#if canShowBossFloors && hasFloorOnAxis}
        <div class="flex items-center gap-2">
          <input
            id="edit-boss-floors"
            type="checkbox"
            bind:checked={showBossFloors}
            class="w-4 h-4 rounded"
          />
          <label for="edit-boss-floors" class="text-sm" class:text-slate-300={$isDarkMode} class:text-slate-700={!$isDarkMode}>
            Show boss floor markers
          </label>
        </div>
      {/if}

      <!-- Actions -->
      <div class="flex gap-3 pt-2">
        <button
          type="submit"
          class="flex-1 px-4 py-2 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
        >
          Save Changes
        </button>
        <button
          type="button"
          onclick={onClose}
          class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          class:bg-slate-700={$isDarkMode}
          class:hover:bg-slate-600={$isDarkMode}
          class:text-slate-200={$isDarkMode}
          class:bg-slate-200={!$isDarkMode}
          class:hover:bg-slate-300={!$isDarkMode}
          class:text-slate-700={!$isDarkMode}
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
</div>

<style>
  /* Force dark mode styling on select dropdowns and options */
  :global(.dark) select {
    color-scheme: dark;
  }
  
  :global(.dark) select option {
    background-color: rgb(51 65 85); /* slate-700 */
    color: rgb(241 245 249); /* slate-100 */
  }
  
  :global(.light) select {
    color-scheme: light;
  }
  
  :global(.light) select option {
    background-color: white;
    color: rgb(30 41 59); /* slate-800 */
  }
</style>
