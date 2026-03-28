<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { checkAuth, authLoading, currentUser } from '$lib/stores/auth';

  let { children } = $props();
  let ready = $state(false);

  onMount(async () => {
    const user = await checkAuth();
    if (!user) {
      goto('/login');
    } else {
      ready = true;
    }
  });
</script>

{#if ready}
  {@render children()}
{:else}
  <div class="loading">
    <p>Loading...</p>
  </div>
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
</style>
