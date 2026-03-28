<script lang="ts">
  import { addSlideToDeck } from '$lib/stores/deck'
  import { activeSlideId } from '$lib/stores/ui'

  let { deckId, onAdd }: { deckId: string; onAdd?: () => void } = $props()

  let open = $state(false)
  let adding = $state(false)

  const slideTypes = [
    { type: 'title', label: 'Title Slide' },
    { type: 'section-divider', label: 'Section Divider' },
    { type: 'body', label: 'Body Content' },
    { type: 'resources', label: 'Resources' },
  ]

  function toggle() {
    open = !open
  }

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (!target.closest('.add-slide-menu')) {
      open = false
    }
  }

  async function addSlide(type: string) {
    if (adding) return
    adding = true

    const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001'

    try {
      const res = await fetch(`${API_URL}/api/decks/${deckId}/slides`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })

      if (res.ok) {
        const slide = await res.json()
        addSlideToDeck(slide)
        activeSlideId.set(slide.id)
        onAdd?.()
      }
    } catch (err) {
      console.error('Failed to add slide:', err)
    } finally {
      adding = false
      open = false
    }
  }

  $effect(() => {
    if (open) {
      document.addEventListener('click', handleClickOutside, true)
      return () => document.removeEventListener('click', handleClickOutside, true)
    }
  })
</script>

<div class="add-slide-menu">
  <button class="add-btn" onclick={toggle}>+ Add</button>
  {#if open}
    <div class="dropdown">
      {#each slideTypes as st}
        <button class="dropdown-item" onclick={() => addSlide(st.type)} disabled={adding}>
          {st.label}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .add-slide-menu {
    position: relative;
  }

  .add-btn {
    font-size: 11px;
    padding: 2px 8px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.15s;
  }

  .add-btn:hover {
    background: #2563eb;
  }

  .dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    background: white;
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 50;
    min-width: 160px;
    overflow: hidden;
  }

  .dropdown-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 8px 12px;
    font-size: 12px;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--color-text, #1f2937);
    transition: background 0.1s;
  }

  .dropdown-item:hover {
    background: #f3f4f6;
  }

  .dropdown-item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
