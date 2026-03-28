<script lang="ts">
</script>

<div class="files-tab">
  <div class="placeholder">
    <div class="icon">📁</div>
    <p class="title">Files</p>
    <p class="desc">Upload and manage files for your slides.</p>
    <button class="upload-btn" disabled>Upload File</button>
    <p class="coming-soon">Coming soon</p>
  </div>
</div>

<style>
  .files-tab {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 20px;
  }

  .placeholder {
    text-align: center;
  }

  .icon {
    font-size: 28px;
    margin-bottom: 8px;
  }

  .title {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text, #1f2937);
    margin: 0 0 4px;
  }

  .desc {
    font-size: 12px;
    color: var(--color-text-muted, #6b7280);
    margin: 0 0 12px;
  }

  .upload-btn {
    font-size: 12px;
    padding: 6px 14px;
    background: #f3f4f6;
    color: var(--color-text-muted, #6b7280);
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 4px;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .coming-soon {
    font-size: 10px;
    color: var(--color-text-muted, #9ca3af);
    margin-top: 8px;
    font-style: italic;
  }
</style>
