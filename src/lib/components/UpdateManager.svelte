<script lang="ts">
  import { onMount } from 'svelte';
  import { isDarkMode } from '$lib/stores/theme';

  interface Release {
    tag_name: string;
    name: string;
    published_at: string;
    html_url: string;
  }

  let currentVersion = $state('0.1.0');
  let latestVersion = $state<string | null>(null);
  let availableVersions = $state<Release[]>([]);
  let selectedVersion = $state<string | null>(null);
  let isChecking = $state(false);
  let isUpdating = $state(false);
  let updateProgress = $state(0);
  let updateStatus = $state<string | null>(null);
  let error = $state<string | null>(null);
  let showDropdown = $state(false);

  // Check if running in Tauri
  let isTauri = $state(false);

  onMount(async () => {
    // Check if we're in Tauri environment
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      isTauri = true;
      await loadVersions();
    }
  });

  async function loadVersions() {
    try {
      // Fetch releases from GitHub API
      const response = await fetch(
        'https://api.github.com/repos/KaiErikNiermann/sts-stat-viewer/releases'
      );
      if (response.ok) {
        const releases: Release[] = await response.json();
        availableVersions = releases.filter(r => !r.tag_name.includes('draft'));
        if (releases.length > 0 && releases[0]) {
          latestVersion = releases[0].tag_name.replace(/^v/, '');
        }
      }
    } catch (e) {
      console.error('Failed to fetch releases:', e);
    }
  }

  async function checkForUpdates() {
    if (!isTauri) return;
    
    isChecking = true;
    error = null;
    updateStatus = 'Checking for updates...';

    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      
      if (update) {
        latestVersion = update.version;
        updateStatus = `Update available: v${update.version}`;
      } else {
        updateStatus = 'You are on the latest version';
      }
    } catch (e) {
      error = `Failed to check for updates: ${e}`;
      updateStatus = null;
    } finally {
      isChecking = false;
    }
  }

  async function installUpdate() {
    if (!isTauri) return;
    
    isUpdating = true;
    error = null;
    updateProgress = 0;

    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const { relaunch } = await import('@tauri-apps/plugin-process');
      
      const update = await check();
      
      if (update) {
        updateStatus = 'Downloading update...';
        
        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started':
              updateStatus = `Downloading (0%)...`;
              break;
            case 'Progress':
              if ('contentLength' in event.data && event.data.contentLength) {
                const progress = Math.round((event.data.chunkLength / event.data.contentLength) * 100);
                updateProgress = Math.min(updateProgress + progress, 100);
                updateStatus = `Downloading (${updateProgress}%)...`;
              }
              break;
            case 'Finished':
              updateStatus = 'Download complete, installing...';
              break;
          }
        });

        updateStatus = 'Update installed! Restarting...';
        await relaunch();
      }
    } catch (e) {
      error = `Update failed: ${e}`;
      updateStatus = null;
    } finally {
      isUpdating = false;
    }
  }

  async function downgradeToVersion(version: string) {
    if (!isTauri || !version) return;
    
    // For downgrades, we need to direct the user to download manually
    // since the updater's version check would block older versions
    const release = availableVersions.find(r => r.tag_name === version || r.tag_name === `v${version}`);
    if (release) {
      const { open } = await import('@tauri-apps/plugin-opener');
      await open(release.html_url);
    }
    showDropdown = false;
  }

  function toggleDropdown() {
    showDropdown = !showDropdown;
    if (showDropdown && availableVersions.length === 0) {
      loadVersions();
    }
  }

  // Check if update is available
  let hasUpdate = $derived(latestVersion && latestVersion !== currentVersion && latestVersion > currentVersion);
</script>

{#if isTauri}
  <div class="update-manager flex items-center gap-2">
    <!-- Current version display -->
    <span class="text-xs opacity-60" class:text-slate-400={$isDarkMode} class:text-slate-500={!$isDarkMode}>
      v{currentVersion}
    </span>

    <!-- Check/Update button -->
    <button
      class="update-btn"
      class:bg-green-600={hasUpdate}
      class:hover:bg-green-500={hasUpdate}
      class:bg-slate-700={!hasUpdate && $isDarkMode}
      class:hover:bg-slate-600={!hasUpdate && $isDarkMode}
      class:bg-slate-200={!hasUpdate && !$isDarkMode}
      class:hover:bg-slate-300={!hasUpdate && !$isDarkMode}
      onclick={hasUpdate ? installUpdate : checkForUpdates}
      disabled={isChecking || isUpdating}
      title={hasUpdate ? `Update to v${latestVersion}` : 'Check for updates'}
    >
      {#if isChecking || isUpdating}
        <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      {:else}
        <!-- Up arrow icon -->
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      {/if}
    </button>

    <!-- Downgrade dropdown -->
    <div class="relative">
      <button
        class="downgrade-btn"
        class:bg-slate-700={$isDarkMode}
        class:hover:bg-slate-600={$isDarkMode}
        class:bg-slate-200={!$isDarkMode}
        class:hover:bg-slate-300={!$isDarkMode}
        onclick={toggleDropdown}
        title="Downgrade to older version"
      >
        <!-- Down arrow icon -->
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      {#if showDropdown}
        <div 
          class="dropdown-menu"
          class:bg-slate-800={$isDarkMode}
          class:border-slate-700={$isDarkMode}
          class:bg-white={!$isDarkMode}
          class:border-slate-200={!$isDarkMode}
        >
          <div class="dropdown-header" class:text-slate-400={$isDarkMode} class:text-slate-500={!$isDarkMode}>
            Select version to download
          </div>
          {#each availableVersions as release}
            <button
              class="dropdown-item"
              class:hover:bg-slate-700={$isDarkMode}
              class:text-slate-200={$isDarkMode}
              class:hover:bg-slate-100={!$isDarkMode}
              class:text-slate-700={!$isDarkMode}
              onclick={() => downgradeToVersion(release.tag_name)}
            >
              {release.tag_name}
              {#if release.tag_name.replace(/^v/, '') === currentVersion}
                <span class="text-xs opacity-50">(current)</span>
              {/if}
            </button>
          {/each}
          {#if availableVersions.length === 0}
            <div class="dropdown-item opacity-50">Loading...</div>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- Status/Error display -->
  {#if updateStatus || error}
    <div 
      class="update-status"
      class:text-red-500={error}
      class:text-slate-400={!error && $isDarkMode}
      class:text-slate-500={!error && !$isDarkMode}
    >
      {error ?? updateStatus}
    </div>
  {/if}
{/if}

<style>
  .update-btn,
  .downgrade-btn {
    padding: 0.375rem;
    border-radius: 0.375rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
    color: currentColor;
  }

  .update-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .dropdown-menu {
    position: absolute;
    right: 0;
    top: 100%;
    margin-top: 0.5rem;
    min-width: 180px;
    max-height: 300px;
    overflow-y: auto;
    border-radius: 0.5rem;
    border: 1px solid;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    z-index: 50;
  }

  .dropdown-header {
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
    border-bottom: 1px solid currentColor;
    opacity: 0.5;
  }

  .dropdown-item {
    display: block;
    width: 100%;
    padding: 0.5rem 0.75rem;
    text-align: left;
    font-size: 0.875rem;
    transition: background-color 0.15s;
  }

  .update-status {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.25rem;
    font-size: 0.75rem;
    white-space: nowrap;
  }
</style>
