<script lang="ts">
  import { Either } from 'effect';
  import Grid, { GridItem } from '@appulsauce/svelte-grid';
  import { 
    effectApi, 
    runEffect, 
    formatApiError,
    getCharacterColor,
    getCharacterDisplayName,
    type RunMetrics,
    type CharacterStats,
    type CharacterId,
  } from '$lib/api/sts-client';
  import { BarChart } from '$lib/plots';
  import { isDarkMode } from '$lib/stores/theme';
  import { overviewGraphs, characterGraphs, type GraphConfig } from '$lib/stores/graphs';
  import { 
    invokeGetPathInfo, 
    invokeSetPath, 
    invokeClearPath, 
    initializePathFromStorage,
    type RunsPathInfo 
  } from '$lib/stores/settings';
  import { GraphCard, AddGraphModal, UpdateManager } from '$lib/components';

  // Grid settings
  const GRID_COLS = 2;
  const GRID_ITEM_SIZE = { height: 400 };
  const GRID_GAP = 24;

  // Character tabs
  const CHARACTERS: CharacterId[] = ['IRONCLAD', 'THE_SILENT', 'DEFECT', 'WATCHER'];

  // State
  let activeTab = $state<CharacterId | 'overview'>('overview');
  let allRuns = $state<RunMetrics[]>([]);
  let stats = $state<CharacterStats[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let showAddModal = $state(false);
  let showSettings = $state(false);
  let pathInfo = $state<RunsPathInfo | null>(null);
  let customPathInput = $state('');
  let pathError = $state<string | null>(null);
  let isSavingPath = $state(false);

  // Mutable copies of graph positions for two-way binding
  let overviewItems = $state<GraphConfig[]>([]);
  let characterItems = $state<GraphConfig[]>([]);

  // Sync store data to local mutable state
  $effect(() => {
    overviewItems = [...$overviewGraphs];
  });

  $effect(() => {
    characterItems = [...$characterGraphs];
  });

  // Derived state for current character's runs
  let characterRuns = $derived(
    activeTab === 'overview' 
      ? allRuns 
      : allRuns.filter(r => r.character === activeTab)
  );

  // Initialize on mount
  $effect(() => {
    initializeApp();
  });

  async function initializeApp(): Promise<void> {
    // First restore any saved custom path
    await initializePathFromStorage();
    // Then load the path info and data
    await refreshPathInfo();
    await loadData();
  }

  async function refreshPathInfo(): Promise<void> {
    pathInfo = await invokeGetPathInfo();
    if (pathInfo?.current_path) {
      customPathInput = pathInfo.current_path;
    }
  }

  async function loadData(): Promise<void> {
    isLoading = true;
    error = null;

    const runsResult = await runEffect(effectApi.getRuns());
    const statsResult = await runEffect(effectApi.getStats());

    Either.match(runsResult, {
      onRight: (runs) => { allRuns = runs; },
      onLeft: (err) => { error = formatApiError(err); },
    });

    Either.match(statsResult, {
      onRight: (s) => { stats = s; },
      onLeft: (err) => { error = error ?? formatApiError(err); },
    });

    isLoading = false;
  }

  // Data transformations for bar charts (stats-based)
  function getWinRateData(stats: CharacterStats[]) {
    return stats.map(s => ({
      category: s.display_name,
      value: s.win_rate * 100,
      color: getCharacterColor(s.character),
    }));
  }

  function getAvgFloorData(stats: CharacterStats[]) {
    return stats.map(s => ({
      category: s.display_name,
      value: s.avg_floor ?? 0,
      color: getCharacterColor(s.character),
    }));
  }

  // Color function for graph cards
  function getRunColor(run: RunMetrics): string {
    if (activeTab === 'overview') {
      return getCharacterColor(run.character);
    }
    return run.victory ? '#22c55e' : '#ef4444';
  }

  // Reset graphs to defaults
  function resetGraphs() {
    if (activeTab === 'overview') {
      overviewGraphs.reset();
    } else {
      characterGraphs.reset();
    }
  }

  // Save overview graph positions back to store
  function saveOverviewPositions() {
    overviewGraphs.set(overviewItems);
  }

  // Save character graph positions back to store
  function saveCharacterPositions() {
    characterGraphs.set(characterItems);
  }

  // Path settings handlers
  async function handleSavePath(): Promise<void> {
    if (!customPathInput.trim()) {
      pathError = 'Please enter a path';
      return;
    }
    
    isSavingPath = true;
    pathError = null;
    
    try {
      pathInfo = await invokeSetPath(customPathInput.trim());
      // Reload data with new path
      await loadData();
    } catch (e) {
      pathError = e instanceof Error ? e.message : String(e);
    } finally {
      isSavingPath = false;
    }
  }

  async function handleClearPath(): Promise<void> {
    isSavingPath = true;
    pathError = null;
    
    try {
      pathInfo = await invokeClearPath();
      customPathInput = pathInfo.auto_detected_path ?? '';
      // Reload data with auto-detected path
      await loadData();
    } catch (e) {
      pathError = e instanceof Error ? e.message : String(e);
    } finally {
      isSavingPath = false;
    }
  }
</script>

<svelte:head>
  <title>STS Stat Viewer</title>
</svelte:head>

<div class="container mx-auto px-4 py-6">
  <!-- Header -->
  <header class="mb-8 flex items-start justify-between">
    <div>
      <h1 class="text-3xl font-bold mb-2" class:text-slate-100={$isDarkMode} class:text-slate-800={!$isDarkMode}>
        Slay the Spire Stats
      </h1>
      <p class:text-slate-400={$isDarkMode} class:text-slate-600={!$isDarkMode}>
        Analyze your runs across all characters
      </p>
    </div>
    <div class="flex items-center gap-3">
      <!-- Update Manager -->
      <UpdateManager />
      
      <!-- Settings button -->
      <button
        class="icon-btn icon-btn-md rounded-lg"
        class:bg-slate-700={$isDarkMode}
        class:hover:bg-slate-600={$isDarkMode}
        class:text-slate-300={$isDarkMode}
        class:bg-slate-200={!$isDarkMode}
        class:hover:bg-slate-300={!$isDarkMode}
        class:text-slate-700={!$isDarkMode}
        onclick={() => showSettings = !showSettings}
        title="Settings"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  </header>

  <!-- Settings Panel -->
  {#if showSettings}
    <div 
      class="mb-6 p-4 rounded-lg border"
      class:bg-slate-800={$isDarkMode}
      class:border-slate-700={$isDarkMode}
      class:bg-white={!$isDarkMode}
      class:border-slate-300={!$isDarkMode}
    >
      <h3 class="text-lg font-semibold mb-4" class:text-slate-100={$isDarkMode} class:text-slate-800={!$isDarkMode}>
        Settings
      </h3>
      
      <div class="space-y-4">
        <div>
          <label 
            for="runs-path-input"
            class="form-label mb-2"
            class:text-slate-300={$isDarkMode}
            class:text-slate-700={!$isDarkMode}
          >
            Runs Data Path
          </label>
          <p class="text-xs mb-2" class:text-slate-400={$isDarkMode} class:text-slate-500={!$isDarkMode}>
            Manually specify the path to your Slay the Spire runs folder if auto-detection fails.
          </p>
          
          <div class="flex gap-2">
            <input
              id="runs-path-input"
              type="text"
              bind:value={customPathInput}
              placeholder="/path/to/SlayTheSpire/runs"
              class="form-input flex-1"
              class:bg-slate-700={$isDarkMode}
              class:text-slate-100={$isDarkMode}
              class:border-slate-600={$isDarkMode}
              class:bg-slate-100={!$isDarkMode}
              class:text-slate-900={!$isDarkMode}
              class:border-slate-300={!$isDarkMode}
              disabled={isSavingPath}
            />
            <button
              class="btn btn-md btn-primary"
              onclick={handleSavePath}
              disabled={isSavingPath}
            >
              {isSavingPath ? 'Saving...' : 'Save'}
            </button>
            {#if pathInfo?.is_custom}
              <button
                class="btn btn-md"
                class:bg-slate-600={$isDarkMode}
                class:hover:bg-slate-500={$isDarkMode}
                class:text-slate-200={$isDarkMode}
                class:bg-slate-300={!$isDarkMode}
                class:hover:bg-slate-400={!$isDarkMode}
                class:text-slate-800={!$isDarkMode}
                onclick={handleClearPath}
                disabled={isSavingPath}
              >
                Use Auto-Detect
              </button>
            {/if}
          </div>
          
          {#if pathError}
            <p class="mt-2 text-sm text-red-500">{pathError}</p>
          {/if}
          
          <div class="mt-3 text-xs space-y-1" class:text-slate-400={$isDarkMode} class:text-slate-500={!$isDarkMode}>
            {#if pathInfo}
              <p>
                <span class="font-medium">Status:</span>
                {#if pathInfo.path_exists}
                  <span class="text-green-500">✓ Path valid</span>
                {:else if pathInfo.current_path}
                  <span class="text-red-500">✗ Path not found</span>
                {:else}
                  <span class="text-yellow-500">⚠ No valid path</span>
                {/if}
              </p>
              {#if pathInfo.is_custom}
                <p><span class="font-medium">Mode:</span> Custom path</p>
              {:else}
                <p><span class="font-medium">Mode:</span> Auto-detected</p>
              {/if}
              {#if pathInfo.auto_detected_path}
                <p><span class="font-medium">Auto-detected:</span> {pathInfo.auto_detected_path}</p>
              {/if}
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Character Tabs -->
  <nav class="flex gap-2 mb-6 pb-2" class:border-b={true} class:border-slate-700={$isDarkMode} class:border-slate-300={!$isDarkMode}>
    <button
      class="tab-button"
      class:active={activeTab === 'overview'}
      onclick={() => activeTab = 'overview'}
    >
      Overview
    </button>
    {#each CHARACTERS as char}
      <button
        class="tab-button"
        class:active={activeTab === char}
        style:--char-color={getCharacterColor(char)}
        onclick={() => activeTab = char}
      >
        {getCharacterDisplayName(char)}
      </button>
    {/each}
  </nav>

  <!-- Loading State -->
  {#if isLoading}
    <div class="flex items-center justify-center h-64">
      <div class="animate-pulse" class:text-slate-400={$isDarkMode} class:text-slate-600={!$isDarkMode}>Loading run data...</div>
    </div>
  {:else if error}
    <div class="bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-200">
      <p class="font-semibold">Error loading data</p>
      <p class="text-sm">{error}</p>
      <button 
        class="mt-2 px-4 py-2 bg-red-700 hover:bg-red-600 rounded text-sm"
        onclick={loadData}
      >
        Retry
      </button>
    </div>
  {:else}
    <!-- Content based on active tab -->
    {#if activeTab === 'overview'}
      <!-- Overview Dashboard -->
      <div class="space-y-6">
        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          {#each stats as stat}
            <div 
              class="stat-card"
              style:border-left-color={getCharacterColor(stat.character)}
            >
              <h3 class="text-lg font-semibold" style:color={getCharacterColor(stat.character)}>
                {stat.display_name}
              </h3>
              <div class="grid grid-cols-2 gap-2 mt-2 text-sm">
                <div>
                  <span class="stat-label">Runs:</span>
                  <span class="ml-1 font-medium">{stat.total_runs}</span>
                </div>
                <div>
                  <span class="stat-label">Wins:</span>
                  <span class="ml-1 font-medium text-green-500">{stat.wins}</span>
                </div>
                <div>
                  <span class="stat-label">Win Rate:</span>
                  <span class="ml-1 font-medium">{(stat.win_rate * 100).toFixed(1)}%</span>
                </div>
                <div>
                  <span class="stat-label">Avg Floor:</span>
                  <span class="ml-1 font-medium">{(stat.avg_floor ?? 0).toFixed(1)}</span>
                </div>
              </div>
            </div>
          {/each}
        </div>

        <!-- Overview Plots -->
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold" class:text-slate-200={$isDarkMode} class:text-slate-700={!$isDarkMode}>
            Graphs
          </h2>
          <div class="flex gap-2">
            <button
              class="btn btn-sm"
              class:bg-slate-700={$isDarkMode}
              class:hover:bg-slate-600={$isDarkMode}
              class:text-slate-200={$isDarkMode}
              class:bg-slate-200={!$isDarkMode}
              class:hover:bg-slate-300={!$isDarkMode}
              class:text-slate-700={!$isDarkMode}
              onclick={resetGraphs}
            >
              Reset to Defaults
            </button>
            <button
              class="btn btn-sm btn-primary"
              onclick={() => showAddModal = true}
            >
              + Add Graph
            </button>
          </div>
        </div>
        <!-- Static bar charts -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div class="static-chart">
            <BarChart 
              data={getWinRateData(stats)}
              title="Win Rate by Character"
              xLabel="Character"
              yLabel="Win Rate (%)"
            />
          </div>
          <div class="static-chart">
            <BarChart 
              data={getAvgFloorData(stats)}
              title="Average Floor Reached"
              xLabel="Character"
              yLabel="Floor"
            />
          </div>
        </div>
        <hr class="static-divider" />
        <!-- Draggable custom graphs -->
        <Grid 
          cols={GRID_COLS} 
          itemSize={GRID_ITEM_SIZE} 
          gap={GRID_GAP} 
          collision="push"
          class="overview-grid"
        >
          {#each overviewItems as graph (graph.id)}
            <GridItem
              id={graph.id}
              bind:x={graph.x}
              bind:y={graph.y}
              bind:w={graph.w}
              bind:h={graph.h}
              onchange={() => saveOverviewPositions()}
              class="grid-card-item"
              activeClass="grid-card-active"
              previewClass="grid-card-preview"
              resizerClass="grid-card-resizer"
            >
              {#snippet moveHandle({ moveStart })}
                <div 
                  class="drag-handle"
                  onpointerdown={moveStart}
                  title="Drag to move"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                  </svg>
                </div>
              {/snippet}
              {#snippet children()}
                <div class="grid-card-content">
                  <GraphCard
                    config={graph}
                    runs={allRuns}
                    colorFn={getRunColor}
                    onDelete={() => overviewGraphs.remove(graph.id)}
                    onUpdate={(changes) => overviewGraphs.updateGraph(graph.id, changes)}
                  />
                </div>
              {/snippet}
            </GridItem>
          {/each}
        </Grid>
      </div>
    {:else}
      <!-- Character-specific view -->
      {@const charStats = stats.find(s => s.character === activeTab)}
      <div class="space-y-6">
        <!-- Character Header -->
        {#if charStats}
          <div 
            class="stat-card !border-l-4"
            style:border-left-color={getCharacterColor(activeTab)}
          >
            <div class="flex items-center justify-between">
              <h2 
                class="text-2xl font-bold"
                style:color={getCharacterColor(activeTab)}
              >
                {charStats.display_name}
              </h2>
              <div class="flex gap-6 text-sm">
                <div>
                  <span class="stat-label">Total Runs:</span>
                  <span class="ml-2 text-xl font-bold">{charStats.total_runs}</span>
                </div>
                <div>
                  <span class="stat-label">Win Rate:</span>
                  <span class="ml-2 text-xl font-bold text-green-500">
                    {(charStats.win_rate * 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span class="stat-label">Max Floor:</span>
                  <span class="ml-2 text-xl font-bold">{charStats.max_floor}</span>
                </div>
              </div>
            </div>
          </div>
        {/if}

        <!-- Character Plots -->
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold" class:text-slate-200={$isDarkMode} class:text-slate-700={!$isDarkMode}>
            Graphs
          </h2>
          <div class="flex gap-2">
            <button
              class="btn btn-sm"
              class:bg-slate-700={$isDarkMode}
              class:hover:bg-slate-600={$isDarkMode}
              class:text-slate-200={$isDarkMode}
              class:bg-slate-200={!$isDarkMode}
              class:hover:bg-slate-300={!$isDarkMode}
              class:text-slate-700={!$isDarkMode}
              onclick={resetGraphs}
            >
              Reset to Defaults
            </button>
            <button
              class="btn btn-sm btn-primary"
              onclick={() => showAddModal = true}
            >
              + Add Graph
            </button>
          </div>
        </div>
        <Grid 
          cols={GRID_COLS} 
          itemSize={GRID_ITEM_SIZE} 
          gap={GRID_GAP} 
          collision="push"
          class="character-grid"
        >
          {#each characterItems as graph (graph.id)}
            <GridItem
              id={graph.id}
              bind:x={graph.x}
              bind:y={graph.y}
              bind:w={graph.w}
              bind:h={graph.h}
              onchange={() => saveCharacterPositions()}
              class="grid-card-item"
              activeClass="grid-card-active"
              previewClass="grid-card-preview"
              resizerClass="grid-card-resizer"
            >
              {#snippet moveHandle({ moveStart })}
                <div 
                  class="drag-handle"
                  onpointerdown={moveStart}
                  title="Drag to move"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                  </svg>
                </div>
              {/snippet}
              {#snippet children()}
                <div class="grid-card-content">
                  <GraphCard
                    config={graph}
                    runs={characterRuns}
                    colorFn={getRunColor}
                    onDelete={() => characterGraphs.remove(graph.id)}
                    onUpdate={(changes) => characterGraphs.updateGraph(graph.id, changes)}
                  />
                </div>
              {/snippet}
            </GridItem>
          {/each}
        </Grid>
      </div>
    {/if}
  {/if}
</div>

<!-- Add Graph Modal -->
{#if showAddModal}
  <AddGraphModal
    onAdd={(config) => {
      if (activeTab === 'overview') {
        overviewGraphs.add(config);
      } else {
        characterGraphs.add(config);
      }
    }}
    onClose={() => showAddModal = false}
  />
{/if}

<style>
  /* Styles moved to app.css */
</style>
