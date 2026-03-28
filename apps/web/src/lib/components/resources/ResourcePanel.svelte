<script lang="ts">
  import FilesTab from './FilesTab.svelte'
  import TemplatesTab from './TemplatesTab.svelte'
  import ArtifactsTab from './ArtifactsTab.svelte'
  import ThemesTab from './ThemesTab.svelte'
  import { activeResourceTab } from '$lib/stores/ui'

  let activeTab = $state<'files' | 'templates' | 'artifacts' | 'themes'>('templates')

  $effect(() => {
    const unsub = activeResourceTab.subscribe((v) => { activeTab = v })
    return unsub
  })

  const tabs: { key: 'files' | 'templates' | 'artifacts' | 'themes'; label: string }[] = [
    { key: 'files', label: 'Files' },
    { key: 'templates', label: 'Templates' },
    { key: 'artifacts', label: 'Artifacts' },
    { key: 'themes', label: 'Themes' },
  ]

  function setTab(key: typeof activeTab) {
    activeResourceTab.set(key)
  }
</script>

<div class="resource-panel">
  <div class="tab-bar">
    {#each tabs as tab}
      <button
        class="tab-btn"
        class:active={activeTab === tab.key}
        onclick={() => setTab(tab.key)}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <div class="tab-content">
    {#if activeTab === 'files'}
      <FilesTab />
    {:else if activeTab === 'templates'}
      <TemplatesTab />
    {:else if activeTab === 'artifacts'}
      <ArtifactsTab />
    {:else if activeTab === 'themes'}
      <ThemesTab />
    {/if}
  </div>
</div>

<style>
  .resource-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .tab-bar {
    display: flex;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
    flex-shrink: 0;
  }

  .tab-btn {
    flex: 1;
    padding: 8px 4px;
    font-size: 11px;
    font-weight: 500;
    color: var(--color-text-muted, #6b7280);
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
    text-align: center;
  }

  .tab-btn:hover {
    color: var(--color-text, #1f2937);
  }

  .tab-btn.active {
    color: #3b82f6;
    border-bottom-color: #3b82f6;
  }

  .tab-content {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
</style>
