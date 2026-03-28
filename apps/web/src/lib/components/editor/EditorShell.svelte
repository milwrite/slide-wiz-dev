<script lang="ts">
  import ChatPanel from '$lib/components/chat/ChatPanel.svelte'
  import SlideOutline from '$lib/components/outline/SlideOutline.svelte'
  import SlideCanvas from '$lib/components/canvas/SlideCanvas.svelte'
  import ResourcePanel from '$lib/components/resources/ResourcePanel.svelte'
</script>

<div class="editor-shell">
  <div class="left-panel">
    <div class="chat-section">
      <ChatPanel />
    </div>
    <div class="outline-section">
      <SlideOutline />
    </div>
  </div>
  <div class="center-panel">
    <SlideCanvas />
  </div>
  <div class="right-panel">
    <ResourcePanel />
  </div>
</div>

<style>
  .editor-shell {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }
  .left-panel {
    width: var(--panel-left-width);
    min-width: var(--panel-left-width);
    border-right: 2px solid var(--color-border);
    display: flex;
    flex-direction: column;
    background: var(--color-bg);
  }
  .chat-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    border-bottom: 2px solid var(--color-border);
    min-height: 0;
  }
  .outline-section {
    height: 260px;
    min-height: 200px;
    overflow-y: auto;
  }
  .center-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: var(--color-bg-tertiary);
    min-width: 0;
  }
  .right-panel {
    width: var(--panel-right-width);
    min-width: var(--panel-right-width);
    border-left: 2px solid var(--color-border);
    display: flex;
    flex-direction: column;
    background: var(--color-bg);
  }
</style>
