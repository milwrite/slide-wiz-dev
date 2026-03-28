<script lang="ts">
  import SlideCard from './SlideCard.svelte'
  import AddSlideMenu from './AddSlideMenu.svelte'
  import { currentDeck } from '$lib/stores/deck'
  import { activeSlideId } from '$lib/stores/ui'

  let deck = $state<any>(null)
  let activeId = $state<string | null>(null)

  $effect(() => {
    const unsub = currentDeck.subscribe((v) => { deck = v })
    return unsub
  })

  $effect(() => {
    const unsub = activeSlideId.subscribe((v) => { activeId = v })
    return unsub
  })

  let slides = $derived(deck?.slides ?? [])
</script>

<div class="slide-outline">
  <div class="outline-header">
    <span class="outline-label">SLIDES</span>
    {#if deck}
      <AddSlideMenu deckId={deck.id} />
    {/if}
  </div>

  <div class="slide-list">
    {#if slides.length === 0}
      <div class="empty">No slides yet</div>
    {:else}
      {#each slides as slide, i (slide.id)}
        <SlideCard {slide} active={slide.id === activeId} index={i} />
      {/each}
    {/if}
  </div>
</div>

<style>
  .slide-outline {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .outline-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
    flex-shrink: 0;
  }

  .outline-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--color-text-muted, #6b7280);
  }

  .slide-list {
    flex: 1;
    overflow-y: auto;
    padding: 6px 0;
  }

  .empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-size: 12px;
    color: var(--color-text-muted, #9ca3af);
    padding: 20px;
  }
</style>
