<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { api } from '$lib/api';
  import { currentDeck } from '$lib/stores/deck';
  import { activeSlideId } from '$lib/stores/ui';
  import EditorShell from '$lib/components/editor/EditorShell.svelte';

  let loading = $state(true);
  let error = $state('');
  let readOnly = $state(false);
  let lockedByName = $state('');
  let heartbeatInterval: ReturnType<typeof setInterval> | undefined;
  let deckId = '';

  async function releaseLockQuietly() {
    try {
      await api.releaseLock(deckId);
    } catch {
      // best effort
    }
  }

  function handleBeforeUnload() {
    if (!readOnly && deckId) {
      // Use sendBeacon for reliable unload
      const url = `${import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001'}/api/decks/${deckId}/lock`;
      navigator.sendBeacon?.(url); // sendBeacon only does POST, so we also try fetch
      fetch(url, { method: 'DELETE', credentials: 'include', keepalive: true }).catch(() => {});
    }
  }

  onMount(async () => {
    deckId = $page.params.id ?? '';
    try {
      const res = await api.getDeck(deckId);
      currentDeck.set(res.deck ?? res);
      const deck = res.deck ?? res;
      if (deck.slides?.length > 0) {
        activeSlideId.set(deck.slides[0].id);
      }

      // Try to acquire lock
      try {
        const lockRes = await api.acquireLock(deckId);
        if (!lockRes.locked) {
          readOnly = true;
          lockedByName = lockRes.lockedBy?.name ?? 'another user';
        } else {
          // Start heartbeat every 2 minutes
          heartbeatInterval = setInterval(() => {
            api.refreshLock(deckId).catch(() => {});
          }, 2 * 60 * 1000);
        }
      } catch {
        // If lock endpoint fails entirely, allow editing (graceful degradation)
      }

      window.addEventListener('beforeunload', handleBeforeUnload);
    } catch (err: any) {
      error = err.message || 'Failed to load deck';
    } finally {
      loading = false;
    }
  });

  onDestroy(() => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    window.removeEventListener('beforeunload', handleBeforeUnload);
    if (!readOnly && deckId) {
      releaseLockQuietly();
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
  {#if readOnly}
    <div class="lock-banner">
      This deck is being edited by {lockedByName}. You are in read-only mode.
    </div>
  {/if}
  <EditorShell editable={!readOnly} />
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

  .lock-banner {
    position: sticky;
    top: 0;
    z-index: 100;
    background: #fef3cd;
    color: #856404;
    text-align: center;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-family: var(--font-body);
    border-bottom: 1px solid #ffc107;
  }
</style>
