<script lang="ts">
  import { api } from '$lib/api';

  let pendingUsers = $state<any[]>([]);
  let approvedCount = $state(0);
  let rejectedCount = $state(0);
  let loading = $state(true);
  let error = $state('');
  let actionInProgress = $state<string | null>(null);

  async function loadAllUsers() {
    loading = true;
    error = '';
    try {
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        api.listUsers('pending'),
        api.listUsers('approved').catch(() => ({ users: [] })),
        api.listUsers('rejected').catch(() => ({ users: [] })),
      ]);
      pendingUsers = pendingRes.users ?? [];
      approvedCount = approvedRes.users?.length ?? 0;
      rejectedCount = rejectedRes.users?.length ?? 0;
    } catch (err: any) {
      error = err.message || 'Failed to load users';
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    loadAllUsers();
  });

  function formatDate(dateStr: string | number): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  async function handleApprove(userId: string) {
    actionInProgress = userId;
    error = '';
    try {
      await api.approveUser(userId);
      pendingUsers = pendingUsers.filter((u) => u.id !== userId);
      approvedCount += 1;
    } catch (err: any) {
      error = err.message || 'Failed to approve user';
    } finally {
      actionInProgress = null;
    }
  }

  async function handleReject(userId: string) {
    actionInProgress = userId;
    error = '';
    try {
      await api.rejectUser(userId);
      pendingUsers = pendingUsers.filter((u) => u.id !== userId);
      rejectedCount += 1;
    } catch (err: any) {
      error = err.message || 'Failed to reject user';
    } finally {
      actionInProgress = null;
    }
  }
</script>

<div class="approval-queue">
  <div class="counts-bar">
    <div class="count-item">
      <span class="count-value pending">{pendingUsers.length}</span>
      <span class="count-label">Pending</span>
    </div>
    <div class="count-item">
      <span class="count-value approved">{approvedCount}</span>
      <span class="count-label">Approved</span>
    </div>
    <div class="count-item">
      <span class="count-value rejected">{rejectedCount}</span>
      <span class="count-label">Rejected</span>
    </div>
  </div>

  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  {#if loading}
    <p class="loading-text">Loading pending users...</p>
  {:else if pendingUsers.length === 0}
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
            <th>Registered</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each pendingUsers as u (u.id)}
            <tr>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{formatDate(u.createdAt)}</td>
              <td class="actions">
                <button
                  class="btn-approve"
                  onclick={() => handleApprove(u.id)}
                  disabled={actionInProgress === u.id}
                >
                  {actionInProgress === u.id ? '...' : 'Approve'}
                </button>
                <button
                  class="btn-reject"
                  onclick={() => handleReject(u.id)}
                  disabled={actionInProgress === u.id}
                >
                  {actionInProgress === u.id ? '...' : 'Reject'}
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .approval-queue {
    width: 100%;
  }

  .counts-bar {
    display: flex;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .count-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 1rem 1.5rem;
    min-width: 100px;
  }

  .count-value {
    font-size: 1.75rem;
    font-weight: 700;
    font-family: var(--font-display);
    line-height: 1;
  }

  .count-value.pending {
    color: #f59e0b;
  }

  .count-value.approved {
    color: var(--color-success);
  }

  .count-value.rejected {
    color: var(--color-error);
  }

  .count-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 0.25rem;
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

  .btn-approve:hover:not(:disabled) {
    opacity: 0.85;
  }

  .btn-approve:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

  .btn-reject:hover:not(:disabled) {
    background: #fef2f2;
  }

  .btn-reject:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
