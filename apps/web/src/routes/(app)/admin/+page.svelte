<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { api } from '$lib/api';
  import { currentUser } from '$lib/stores/auth';

  let users = $state<any[]>([]);
  let loading = $state(true);
  let error = $state('');
  let user = $state<any>(null);

  currentUser.subscribe((u) => {
    user = u;
  });

  onMount(async () => {
    if (!user || user.role !== 'admin') {
      goto('/');
      return;
    }
    await loadUsers();
  });

  async function loadUsers() {
    loading = true;
    error = '';
    try {
      const res = await api.listUsers('pending');
      users = res.users;
    } catch (err: any) {
      error = err.message || 'Failed to load users';
    } finally {
      loading = false;
    }
  }

  async function approve(id: string) {
    try {
      await api.approveUser(id);
      users = users.filter((u) => u.id !== id);
    } catch (err: any) {
      error = err.message || 'Failed to approve user';
    }
  }

  async function reject(id: string) {
    try {
      await api.rejectUser(id);
      users = users.filter((u) => u.id !== id);
    } catch (err: any) {
      error = err.message || 'Failed to reject user';
    }
  }
</script>

<svelte:head>
  <title>Admin - User Approval Queue</title>
</svelte:head>

<div class="admin-page">
  <header class="admin-header">
    <div class="header-left">
      <a href="/" class="back-link">&larr; Back to Decks</a>
      <h1>User Approval Queue</h1>
    </div>
  </header>

  <main class="admin-main">
    {#if error}
      <div class="error-message">{error}</div>
    {/if}

    {#if loading}
      <p class="loading-text">Loading pending users...</p>
    {:else if users.length === 0}
      <div class="empty-state">
        <p>No pending users to review.</p>
      </div>
    {:else}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Requested</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each users as u (u.id)}
              <tr>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td class="actions">
                  <button class="btn-approve" onclick={() => approve(u.id)}>Approve</button>
                  <button class="btn-reject" onclick={() => reject(u.id)}>Reject</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </main>
</div>

<style>
  .admin-page {
    min-height: 100vh;
    background: var(--color-bg-secondary);
  }

  .admin-header {
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
    padding: 1rem 2rem;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .back-link {
    font-size: 0.8125rem;
    color: var(--color-primary);
    text-decoration: none;
    font-weight: 500;
  }

  .back-link:hover {
    text-decoration: underline;
  }

  .admin-header h1 {
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 700;
    color: var(--color-primary-dark);
  }

  .admin-main {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  .error-message {
    background: #fef2f2;
    color: var(--color-error);
    padding: 0.75rem 1rem;
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    border: 1px solid #fecaca;
    margin-bottom: 1.5rem;
  }

  .loading-text {
    text-align: center;
    color: var(--color-text-muted);
    padding: 3rem;
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--color-text-muted);
    font-size: 0.9375rem;
  }

  .table-wrap {
    background: var(--color-bg);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border);
    overflow: hidden;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th {
    text-align: left;
    padding: 0.75rem 1rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-secondary);
    background: var(--color-bg-tertiary);
    border-bottom: 1px solid var(--color-border);
  }

  td {
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    border-bottom: 1px solid var(--color-border);
  }

  tr:last-child td {
    border-bottom: none;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-approve {
    padding: 0.375rem 0.875rem;
    background: var(--color-success);
    color: white;
    border: none;
    border-radius: var(--radius-full);
    font-size: 0.8125rem;
    font-weight: 600;
    font-family: var(--font-body);
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .btn-approve:hover {
    opacity: 0.85;
  }

  .btn-reject {
    padding: 0.375rem 0.875rem;
    background: none;
    color: var(--color-error);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-full);
    font-size: 0.8125rem;
    font-weight: 600;
    font-family: var(--font-body);
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-reject:hover {
    background: #fef2f2;
  }
</style>
