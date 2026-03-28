<script lang="ts">
  import { get } from 'svelte/store'
  import { currentDeck } from '$lib/stores/deck'

  interface Theme {
    id: string
    name: string
    css: string
    fonts: { heading?: string; body?: string } | unknown
    colors: { primary?: string; secondary?: string; accent?: string; bg?: string } | unknown
    builtIn: boolean
  }

  let themes = $state<Theme[]>([])
  let loading = $state(true)
  let error = $state<string | null>(null)
  let applying = $state<string | null>(null)
  let deckThemeId = $state<string | null>(null)

  $effect(() => {
    const unsub = currentDeck.subscribe((d) => {
      deckThemeId = d?.themeId ?? null
    })
    return unsub
  })

  $effect(() => {
    const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001'
    fetch(`${API_URL}/api/themes`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        themes = data.themes ?? []
        loading = false
      })
      .catch((err) => {
        console.error('Failed to fetch themes:', err)
        error = 'Failed to load themes'
        loading = false
      })
  })

  async function applyTheme(themeId: string) {
    const deck = get(currentDeck)
    if (!deck || applying) return

    applying = themeId
    const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001'

    try {
      const res = await fetch(`${API_URL}/api/decks/${deck.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId }),
      })

      if (res.ok) {
        currentDeck.update((d) => d ? { ...d, themeId } : d)
      }
    } catch (err) {
      console.error('Failed to apply theme:', err)
    } finally {
      applying = null
    }
  }

  function getColors(theme: Theme): string[] {
    const c = theme.colors as Record<string, string> | null
    if (!c) return ['#6b7280', '#9ca3af', '#d1d5db', '#f3f4f6']
    return [c.primary ?? '#6b7280', c.secondary ?? '#9ca3af', c.accent ?? '#d1d5db', c.bg ?? '#f3f4f6']
  }

  function getFonts(theme: Theme): string {
    const f = theme.fonts as Record<string, string> | null
    if (!f) return 'Default'
    const parts: string[] = []
    if (f.heading) parts.push(f.heading)
    if (f.body && f.body !== f.heading) parts.push(f.body)
    return parts.length > 0 ? parts.join(' / ') : 'Default'
  }
</script>

<div class="themes-tab">
  {#if loading}
    <div class="center-msg">Loading themes...</div>
  {:else if error}
    <div class="center-msg error">{error}</div>
  {:else if themes.length === 0}
    <div class="center-msg">No themes available yet. Themes will appear here after seeding.</div>
  {:else}
    <div class="theme-list">
      {#each themes as theme (theme.id)}
        {@const isActive = deckThemeId === theme.id}
        <button
          class="theme-card"
          class:active={isActive}
          onclick={() => applyTheme(theme.id)}
          disabled={applying !== null}
        >
          <div class="theme-header">
            <span class="theme-name">{theme.name}</span>
            {#if isActive}
              <span class="check">{'\u2713'}</span>
            {/if}
          </div>
          <div class="swatches">
            {#each getColors(theme) as color}
              <span class="swatch" style:background={color}></span>
            {/each}
          </div>
          <div class="theme-fonts">{getFonts(theme)}</div>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .themes-tab {
    padding: 8px;
  }

  .center-msg {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 30px 16px;
    font-size: 12px;
    color: var(--color-text-muted, #6b7280);
    text-align: center;
    line-height: 1.5;
  }

  .center-msg.error {
    color: #ef4444;
  }

  .theme-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .theme-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px;
    background: white;
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .theme-card:hover {
    border-color: #93c5fd;
  }

  .theme-card.active {
    border-color: #3b82f6;
    box-shadow: 0 0 0 1px #3b82f6;
  }

  .theme-card:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  .theme-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .theme-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text, #1f2937);
  }

  .check {
    color: #3b82f6;
    font-size: 14px;
    font-weight: 700;
  }

  .swatches {
    display: flex;
    gap: 6px;
  }

  .swatch {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }

  .theme-fonts {
    font-size: 10px;
    color: var(--color-text-muted, #9ca3af);
  }
</style>
