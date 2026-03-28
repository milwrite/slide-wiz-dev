<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { api } from '$lib/api';
  import { currentDeck } from '$lib/stores/deck';
  import { activeSlideId } from '$lib/stores/ui';
  import EditorShell from '$lib/components/editor/EditorShell.svelte';

  let loading = $state(true);
  let error = $state('');

  onMount(async () => {
    const id = $page.params.id;
    try {
      const res = await api.getDeck(id);
      currentDeck.set(res.deck);
      if (res.deck.slides?.length > 0) {
        activeSlideId.set(res.deck.slides[0].id);
      }
    } catch (err: any) {
      error = err.message || 'Failed to load deck';
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>Editor - CUNY AI Lab Slide Maker</title>
</svelte:head>

{#if loading}
  <div class="loading">
    <p>Loading deck...</p>
  </div>
{:else if error}
  <div class="error">
    <p>{error}</p>
    <a href="/">Back to decks</a>
  </div>
{:else}
  <EditorShell />
{/if}

<style>
  .loading {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted);
    font-size: 0.9375rem;
  }

  .error {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    color: var(--color-error);
    font-size: 0.9375rem;
  }

  .error a {
    color: var(--color-primary);
    text-decoration: none;
    font-size: 0.875rem;
  }

  .error a:hover {
    text-decoration: underline;
  }
</style>
