<script lang="ts">
  import { isDarkMode } from '$lib/stores/theme';
  import { PLOT_FIELDS, type GraphConfig, type GraphType, type PlotFieldKey, getFieldLabel } from '$lib/stores/graphs';

  interface Props {
    onAdd: (config: Omit<GraphConfig, 'id' | 'x' | 'y' | 'w' | 'h'>) => void;
    onClose: () => void;
  }

  let { onAdd, onClose }: Props = $props();

  let graphType = $state<GraphType>('scatter');
  let xField = $state<PlotFieldKey>('floor_reached');
  let yField = $state<PlotFieldKey>('score');
  let customTitle = $state('');
  let bins = $state(15);
  let groupByCharacter = $state(true); // For survival curves
  let showConfidence = $state(true); // For regression
  let bandwidth = $state(20); // For density
  let showBossFloors = $state(false); // Show boss floor reference lines

  // Check if floor_reached is selected on either axis
  let hasFloorOnX = $derived(xField === 'floor_reached');
  let hasFloorOnY = $derived(yField === 'floor_reached');

  // Auto-generate title based on selections
  let autoTitle = $derived(() => {
    switch (graphType) {
      case 'histogram':
        return `${getFieldLabel(xField)} Distribution`;
      case 'survival':
        return groupByCharacter ? 'Survival Rate by Character' : 'Overall Survival Rate';
      case 'boxplot':
        return `${getFieldLabel(xField)} by ${getFieldLabel(yField)}`;
      case 'regression':
        return `${getFieldLabel(xField)} vs ${getFieldLabel(yField)} (Trend)`;
      case 'winrate-waffle':
        return 'Win/Loss Distribution';
      case 'relic-table':
        return 'Relic Performance (Avg Floor Reached)';
      case 'card-table':
        return 'Card Performance (Avg Floor Reached)';
      case 'density':
        return `${getFieldLabel(xField)} vs ${getFieldLabel(yField)} Density`;
      default:
        return `${getFieldLabel(xField)} vs ${getFieldLabel(yField)}`;
    }
  });

  let title = $derived(customTitle || autoTitle());

  function handleSubmit(e: Event) {
    e.preventDefault();
    
    let config: Omit<GraphConfig, 'id' | 'x' | 'y' | 'w' | 'h'>;
    
    switch (graphType) {
      case 'survival':
        config = {
          type: 'survival',
          title,
          xField: 'floor_reached',
          yField: 'floor_reached',
          xLabel: 'Floor',
          yLabel: 'Survival %',
          groupByCharacter,
        };
        break;
      case 'winrate-waffle':
        config = {
          type: 'winrate-waffle',
          title,
          xField: 'floor_reached',
          yField: 'floor_reached',
          xLabel: '',
          yLabel: '',
        };
        break;
      case 'relic-table':
        config = {
          type: 'relic-table',
          title,
          xField: 'floor_reached',
          yField: 'floor_reached',
          xLabel: '',
          yLabel: '',
        };
        break;
      case 'card-table':
        config = {
          type: 'card-table',
          title,
          xField: 'floor_reached',
          yField: 'floor_reached',
          xLabel: '',
          yLabel: '',
        };
        break;
      case 'histogram':
        config = {
          type: 'histogram',
          title,
          xField,
          yField: xField,
          xLabel: getFieldLabel(xField),
          yLabel: 'Count',
          bins,
          showBossFloors: hasFloorOnX && showBossFloors,
        };
        break;
      case 'boxplot':
        config = {
          type: 'boxplot',
          title,
          xField,
          yField,
          xLabel: getFieldLabel(xField),
          yLabel: getFieldLabel(yField),
        };
        break;
      case 'regression':
        config = {
          type: 'regression',
          title,
          xField,
          yField,
          xLabel: getFieldLabel(xField),
          yLabel: getFieldLabel(yField),
          showConfidence,
          showBossFloors: (hasFloorOnX || hasFloorOnY) && showBossFloors,
        };
        break;
      case 'density':
        config = {
          type: 'density',
          title,
          xField,
          yField,
          xLabel: getFieldLabel(xField),
          yLabel: getFieldLabel(yField),
          bandwidth,
          showBossFloors: (hasFloorOnX || hasFloorOnY) && showBossFloors,
        };
        break;
      default:
        config = {
          type: graphType,
          title,
          xField,
          yField,
          xLabel: getFieldLabel(xField),
          yLabel: getFieldLabel(yField),
          showBossFloors: (hasFloorOnX || hasFloorOnY) && showBossFloors,
        };
    }
    
    onAdd(config);
    onClose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- Modal backdrop -->
<div 
  class="modal-root"
  onkeydown={handleKeydown}
  role="dialog"
  aria-modal="true"
  tabindex="-1"
>
  <!-- Backdrop -->
  <button 
    type="button"
    class="modal-overlay"
    onclick={onClose}
    aria-label="Close modal"
  ></button>
  
  <!-- Modal content -->
  <div 
    class="modal-card"
    class:bg-slate-800={$isDarkMode}
    class:bg-white={!$isDarkMode}
  >
    <!-- Close button -->
    <button
      type="button"
      class="modal-close"
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

    <h2 class="text-xl font-semibold mb-4" class:text-slate-100={$isDarkMode} class:text-slate-800={!$isDarkMode}>
      Add New Graph
    </h2>

    <form onsubmit={handleSubmit} class="space-y-4">
      <!-- Graph Type -->
      <div>
        <label for="graph-type" class="form-label mb-1" class:text-slate-300={$isDarkMode} class:text-slate-700={!$isDarkMode}>
          Graph Type
        </label>
        <select
          id="graph-type"
          bind:value={graphType}
          class="form-input w-full"
          class:bg-slate-700={$isDarkMode}
          class:border-slate-600={$isDarkMode}
          class:text-slate-100={$isDarkMode}
          class:bg-white={!$isDarkMode}
          class:border-slate-300={!$isDarkMode}
          class:text-slate-800={!$isDarkMode}
        >
          <option value="scatter">Scatter Plot</option>
          <option value="histogram">Histogram</option>
          <option value="survival">Survival Curve</option>
          <option value="boxplot">Box Plot</option>
          <option value="regression">Regression Plot</option>
          <option value="density">Density Plot</option>
          <option value="winrate-waffle">Win/Loss Waffle</option>
          <option value="relic-table">Relic Table</option>
          <option value="card-table">Card Table</option>
        </select>
      </div>

      <!-- Survival curve options -->
      {#if graphType === 'survival'}
        <div class="flex items-center gap-2">
          <input
            id="group-by-char"
            type="checkbox"
            bind:checked={groupByCharacter}
            class="form-checkbox"
          />
          <label for="group-by-char" class="text-sm" class:text-slate-300={$isDarkMode} class:text-slate-700={!$isDarkMode}>
            Group by character
          </label>
        </div>
      {/if}

      <!-- Win/Loss waffle has no field options -->
      {#if graphType === 'winrate-waffle'}
        <p class="text-sm" class:text-slate-400={$isDarkMode} class:text-slate-500={!$isDarkMode}>
          Shows win/loss ratio as a waffle chart. No additional configuration needed.
        </p>
      {/if}

      <!-- Relic table has no field options -->
      {#if graphType === 'relic-table'}
        <p class="text-sm" class:text-slate-400={$isDarkMode} class:text-slate-500={!$isDarkMode}>
          Shows a sorted, scrollable table of relics with average floor reached. No additional configuration needed.
        </p>
      {/if}

      <!-- Card table has no field options -->
      {#if graphType === 'card-table'}
        <p class="text-sm" class:text-slate-400={$isDarkMode} class:text-slate-500={!$isDarkMode}>
          Shows a sorted, scrollable table of cards with average floor reached. No additional configuration needed.
        </p>
      {/if}

      <!-- X Field (for most graph types) -->
      {#if graphType !== 'survival' && graphType !== 'winrate-waffle' && graphType !== 'relic-table' && graphType !== 'card-table'}
      <div>
        <label for="x-field" class="form-label mb-1" class:text-slate-300={$isDarkMode} class:text-slate-700={!$isDarkMode}>
          {graphType === 'histogram' ? 'Value Field' : graphType === 'boxplot' ? 'Value Field' : 'X Axis Field'}
        </label>
        <select
          id="x-field"
          bind:value={xField}
          class="form-input w-full"
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

      <!-- Y Field (for scatter, regression, density, boxplot) -->
      {#if graphType === 'scatter' || graphType === 'regression' || graphType === 'density' || graphType === 'boxplot'}
        <div>
          <label for="y-field" class="form-label mb-1" class:text-slate-300={$isDarkMode} class:text-slate-700={!$isDarkMode}>
            {graphType === 'boxplot' ? 'Group By Field' : 'Y Axis Field'}
          </label>
          <select
            id="y-field"
            bind:value={yField}
            class="form-input w-full"
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
      {/if}

      <!-- Bins (only for histogram) -->
      {#if graphType === 'histogram'}
        <div>
          <label for="bins" class="form-label mb-1" class:text-slate-300={$isDarkMode} class:text-slate-700={!$isDarkMode}>
            Number of Bins
          </label>
          <input
            id="bins"
            type="number"
            bind:value={bins}
            min="5"
            max="50"
            class="form-input w-full"
            class:bg-slate-700={$isDarkMode}
            class:border-slate-600={$isDarkMode}
            class:text-slate-100={$isDarkMode}
            class:bg-white={!$isDarkMode}
            class:border-slate-300={!$isDarkMode}
            class:text-slate-800={!$isDarkMode}
          />
        </div>
      {/if}

      <!-- Regression options -->
      {#if graphType === 'regression'}
        <div class="flex items-center gap-2">
          <input
            id="show-confidence"
            type="checkbox"
            bind:checked={showConfidence}
            class="form-checkbox"
          />
          <label for="show-confidence" class="text-sm" class:text-slate-300={$isDarkMode} class:text-slate-700={!$isDarkMode}>
            Show 95% confidence interval
          </label>
        </div>
      {/if}

      <!-- Density options -->
      {#if graphType === 'density'}
        <div>
          <label for="bandwidth" class="form-label mb-1" class:text-slate-300={$isDarkMode} class:text-slate-700={!$isDarkMode}>
            Bandwidth (smoothing)
          </label>
          <input
            id="bandwidth"
            type="number"
            bind:value={bandwidth}
            min="5"
            max="100"
            class="form-input w-full"
            class:bg-slate-700={$isDarkMode}
            class:border-slate-600={$isDarkMode}
            class:text-slate-100={$isDarkMode}
            class:bg-white={!$isDarkMode}
            class:border-slate-300={!$isDarkMode}
            class:text-slate-800={!$isDarkMode}
          />
        </div>
      {/if}

      <!-- Boss floor markers option (when floor_reached is on an axis) -->
      {#if (hasFloorOnX || hasFloorOnY) && graphType !== 'winrate-waffle' && graphType !== 'boxplot' && graphType !== 'relic-table' && graphType !== 'card-table'}
        <div class="flex items-center gap-2">
          <input
            id="show-boss-floors"
            type="checkbox"
            bind:checked={showBossFloors}
            class="form-checkbox"
          />
          <label for="show-boss-floors" class="text-sm" class:text-slate-300={$isDarkMode} class:text-slate-700={!$isDarkMode}>
            Show boss floor markers (Act 1, 2, 3, Heart)
          </label>
        </div>
      {/if}

      <!-- Custom Title (optional) -->
      <div>
        <label for="custom-title" class="form-label mb-1" class:text-slate-300={$isDarkMode} class:text-slate-700={!$isDarkMode}>
          Custom Title (optional)
        </label>
        <input
          id="custom-title"
          type="text"
          bind:value={customTitle}
          placeholder={autoTitle()}
          class="form-input w-full"
          class:bg-slate-700={$isDarkMode}
          class:border-slate-600={$isDarkMode}
          class:text-slate-100={$isDarkMode}
          class:placeholder-slate-500={$isDarkMode}
          class:bg-white={!$isDarkMode}
          class:border-slate-300={!$isDarkMode}
          class:text-slate-800={!$isDarkMode}
          class:placeholder-slate-400={!$isDarkMode}
        />
      </div>

      <!-- Actions -->
      <div class="flex gap-3 pt-2">
        <button
          type="submit"
          class="btn btn-md btn-primary flex-1"
        >
          Add Graph
        </button>
        <button
          type="button"
          onclick={onClose}
          class="btn btn-md"
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
