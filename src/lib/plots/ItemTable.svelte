<script lang="ts">
  import { onMount } from 'svelte';
  import { isDarkMode } from '$lib/stores/theme';
  import { createDebouncedResizeObserver } from '$lib/utils';

  export type ItemTableMode = 'relics' | 'cards';

  interface ItemStat {
    item: string;
    avgFloor: number;
    count: number;
  }

  interface Props {
    data: ItemStat[];
    title?: string;
    mode?: ItemTableMode;
  }

  let { data, title, mode = 'relics' }: Props = $props();

  let wrapper: HTMLDivElement;
  let containerHeight = $state(350);

  // Sort by average floor descending
  let sortField = $state<'avgFloor' | 'count'>('avgFloor');
  let sortDirection = $state<'asc' | 'desc'>('desc');

  let sortedData = $derived(() => {
    const sorted = [...data].sort((a, b) => {
      const aVal = sortField === 'avgFloor' ? a.avgFloor : a.count;
      const bVal = sortField === 'avgFloor' ? b.avgFloor : b.count;
      return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
    });
    return sorted;
  });

  function toggleSort(field: 'avgFloor' | 'count') {
    if (sortField === field) {
      sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    } else {
      sortField = field;
      sortDirection = 'desc';
    }
  }

  function formatItemName(item: string): string {
    // Convert from game format like "Burning Blood" or "burning_blood" to readable
    return item
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  function getSortIcon(field: 'avgFloor' | 'count'): string {
    if (sortField !== field) return '↕';
    return sortDirection === 'desc' ? '↓' : '↑';
  }

  // Dynamic labels based on mode
  let itemLabel = $derived(mode === 'cards' ? 'Card' : 'Relic');
  let emptyMessage = $derived(mode === 'cards' ? 'No card data available' : 'No relic data available');

  // Calculate available height for table (subtract title and padding)
  let tableHeight = $derived(Math.max(100, containerHeight - (title ? 52 : 16)));

  onMount(() => {
    let cleanup: (() => void) | undefined;
    
    if (wrapper) {
      cleanup = createDebouncedResizeObserver(wrapper, ({ height }) => {
        containerHeight = height;
      }, { debounceMs: 150 });
    }

    return () => {
      cleanup?.();
    };
  });
</script>

<div class="item-table" bind:this={wrapper}>
  {#if title}
    <h3 class="plot-title mb-2">{title}</h3>
  {/if}
  
  <div 
    class="table-container overflow-auto rounded-lg border"
    class:border-slate-700={$isDarkMode}
    class:border-slate-300={!$isDarkMode}
    style:height="{tableHeight}px"
    onpointerdown={(e) => e.stopPropagation()}
    onwheel={(e) => e.stopPropagation()}
  >
    <table class="w-full text-sm">
      <thead class="sticky top-0 z-10">
        <tr 
          class:bg-slate-800={$isDarkMode}
          class:bg-slate-100={!$isDarkMode}
        >
          <th 
            class="text-left px-4 py-3 font-semibold"
            class:text-slate-200={$isDarkMode}
            class:text-slate-700={!$isDarkMode}
          >
            {itemLabel}
          </th>
          <th 
            class="text-right px-4 py-3 font-semibold cursor-pointer select-none hover:text-blue-400 transition-colors"
            class:text-slate-200={$isDarkMode}
            class:text-slate-700={!$isDarkMode}
            onclick={() => toggleSort('avgFloor')}
          >
            Avg Floor {getSortIcon('avgFloor')}
          </th>
          <th 
            class="text-right px-4 py-3 font-semibold cursor-pointer select-none hover:text-blue-400 transition-colors"
            class:text-slate-200={$isDarkMode}
            class:text-slate-700={!$isDarkMode}
            onclick={() => toggleSort('count')}
          >
            Runs {getSortIcon('count')}
          </th>
        </tr>
      </thead>
      <tbody>
        {#each sortedData() as row, i}
          <tr 
            class="border-t transition-colors"
            class:border-slate-700={$isDarkMode}
            class:border-slate-200={!$isDarkMode}
            class:hover:bg-slate-700={$isDarkMode}
            class:hover:bg-slate-50={!$isDarkMode}
            class:bg-slate-800={$isDarkMode && i % 2 === 0}
            class:bg-slate-850={$isDarkMode && i % 2 === 1}
            class:bg-white={!$isDarkMode && i % 2 === 0}
            class:bg-slate-50={!$isDarkMode && i % 2 === 1}
          >
            <td 
              class="px-4 py-2"
              class:text-slate-200={$isDarkMode}
              class:text-slate-700={!$isDarkMode}
            >
              {formatItemName(row.item)}
            </td>
            <td 
              class="text-right px-4 py-2 font-mono"
              class:text-emerald-400={$isDarkMode}
              class:text-emerald-600={!$isDarkMode}
            >
              {row.avgFloor.toFixed(1)}
            </td>
            <td 
              class="text-right px-4 py-2 font-mono"
              class:text-slate-400={$isDarkMode}
              class:text-slate-500={!$isDarkMode}
            >
              {row.count}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  
  {#if data.length === 0}
    <div 
      class="text-center py-8"
      class:text-slate-400={$isDarkMode}
      class:text-slate-500={!$isDarkMode}
    >
      {emptyMessage}
    </div>
  {/if}
</div>

<style>
  .item-table {
    padding: 0.75rem;
    border-radius: 0.5rem;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  }

  .plot-title {
    color: #e2e8f0;
    flex-shrink: 0;
  }

  :global(.light) .plot-title {
    color: #1e293b;
  }

  .table-container {
    flex: 1;
    min-height: 0;
  }

  .table-container::-webkit-scrollbar {
    width: 8px;
  }

  .table-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .table-container::-webkit-scrollbar-thumb {
    background: #475569;
    border-radius: 4px;
  }

  .table-container::-webkit-scrollbar-thumb:hover {
    background: #64748b;
  }

  thead {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
</style>
