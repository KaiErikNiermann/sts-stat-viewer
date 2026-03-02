<script lang="ts">
  import { isDarkMode } from '$lib/stores/theme';
  import { PLOT_FIELDS, type GraphConfig, type GraphType, type PlotFieldKey, getFieldLabel } from '$lib/stores/graphs';
  import { t } from '$lib/i18n';

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
        return $t('graphs.auto_title_distribution', { field: getFieldLabel(xField) });
      case 'survival':
        return groupByCharacter ? $t('graphs.auto_title_survival_grouped') : $t('graphs.auto_title_survival_overall');
      case 'boxplot':
        return $t('graphs.auto_title_by', { x: getFieldLabel(xField), y: getFieldLabel(yField) });
      case 'regression':
        return $t('graphs.auto_title_trend', { x: getFieldLabel(xField), y: getFieldLabel(yField) });
      case 'winrate-waffle':
        return $t('graphs.auto_title_waffle');
      case 'relic-table':
        return $t('graphs.auto_title_relic_table');
      case 'card-table':
        return $t('graphs.auto_title_card_table');
      case 'density':
        return $t('graphs.auto_title_density', { x: getFieldLabel(xField), y: getFieldLabel(yField) });
      default:
        return $t('graphs.auto_title_vs', { x: getFieldLabel(xField), y: getFieldLabel(yField) });
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
          xLabel: $t('graphs.axis_floor'),
          yLabel: $t('graphs.axis_survival_pct'),
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
          yLabel: $t('graphs.axis_count'),
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
    aria-label={$t('common.close_modal')}
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
      aria-label={$t('common.close_modal')}
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    <h2 class="text-xl font-semibold mb-4" class:text-slate-100={$isDarkMode} class:text-slate-800={!$isDarkMode}>
      {$t('graphs.add_graph_heading')}
    </h2>

    <form onsubmit={handleSubmit} class="space-y-4">
      <!-- Graph Type -->
      <div>
        <label for="graph-type" class="form-label mb-1" class:text-slate-300={$isDarkMode} class:text-slate-700={!$isDarkMode}>
          {$t('graphs.graph_type_label')}
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
          <option value="scatter">{$t('graphs.type_scatter')}</option>
          <option value="histogram">{$t('graphs.type_histogram')}</option>
          <option value="survival">{$t('graphs.type_survival')}</option>
          <option value="boxplot">{$t('graphs.type_boxplot')}</option>
          <option value="regression">{$t('graphs.type_regression')}</option>
          <option value="density">{$t('graphs.type_density')}</option>
          <option value="winrate-waffle">{$t('graphs.type_waffle')}</option>
          <option value="relic-table">{$t('graphs.type_relic_table')}</option>
          <option value="card-table">{$t('graphs.type_card_table')}</option>
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
            {$t('graphs.group_by_character')}
          </label>
        </div>
      {/if}

      <!-- Win/Loss waffle has no field options -->
      {#if graphType === 'winrate-waffle'}
        <p class="text-sm" class:text-slate-400={$isDarkMode} class:text-slate-500={!$isDarkMode}>
          {$t('graphs.waffle_description')}
        </p>
      {/if}

      <!-- Relic table has no field options -->
      {#if graphType === 'relic-table'}
        <p class="text-sm" class:text-slate-400={$isDarkMode} class:text-slate-500={!$isDarkMode}>
          {$t('graphs.relic_table_description')}
        </p>
      {/if}

      <!-- Card table has no field options -->
      {#if graphType === 'card-table'}
        <p class="text-sm" class:text-slate-400={$isDarkMode} class:text-slate-500={!$isDarkMode}>
          {$t('graphs.card_table_description')}
        </p>
      {/if}

      <!-- X Field (for most graph types) -->
      {#if graphType !== 'survival' && graphType !== 'winrate-waffle' && graphType !== 'relic-table' && graphType !== 'card-table'}
      <div>
        <label for="x-field" class="form-label mb-1" class:text-slate-300={$isDarkMode} class:text-slate-700={!$isDarkMode}>
          {graphType === 'histogram' ? $t('graphs.value_field') : graphType === 'boxplot' ? $t('graphs.value_field') : $t('graphs.x_axis_field')}
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
            {graphType === 'boxplot' ? $t('graphs.group_by_field') : $t('graphs.y_axis_field')}
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
            {$t('graphs.num_bins')}
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
            {$t('graphs.show_confidence')}
          </label>
        </div>
      {/if}

      <!-- Density options -->
      {#if graphType === 'density'}
        <div>
          <label for="bandwidth" class="form-label mb-1" class:text-slate-300={$isDarkMode} class:text-slate-700={!$isDarkMode}>
            {$t('graphs.bandwidth_label')}
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
            {$t('graphs.show_boss_floors_full')}
          </label>
        </div>
      {/if}

      <!-- Custom Title (optional) -->
      <div>
        <label for="custom-title" class="form-label mb-1" class:text-slate-300={$isDarkMode} class:text-slate-700={!$isDarkMode}>
          {$t('graphs.custom_title_label')}
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
          {$t('graphs.add_graph_action')}
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
          {$t('common.cancel')}
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
