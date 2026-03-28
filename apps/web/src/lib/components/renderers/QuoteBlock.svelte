<script lang="ts">
  import { fitText } from '$lib/utils/text-measure'

  let { data = {} }: { data: Record<string, unknown>; editable: boolean } = $props()

  let text = $derived(typeof data.text === 'string' ? data.text : '')
  let attribution = $derived(typeof data.attribution === 'string' ? data.attribution : '')

  let containerEl: HTMLElement | undefined = $state(undefined)
  let fittedFontSize: number | undefined = $state(undefined)

  $effect(() => {
    void text
    if (!containerEl || !text.trim()) { fittedFontSize = undefined; return }
    const w = containerEl.clientWidth
    const h = containerEl.clientHeight
    if (w <= 0 || h <= 0) { fittedFontSize = undefined; return }
    const size = fitText(text, 'Outfit', 22, 'italic', w, h, 1.6, 14)
    fittedFontSize = size < 22 ? size : undefined
  })
</script>

<blockquote class="quote-block" bind:this={containerEl}>
  <p class="quote-text" style:font-size={fittedFontSize ? `${fittedFontSize}px` : undefined}>{text}</p>
  {#if attribution}
    <cite class="quote-attribution">— {attribution}</cite>
  {/if}
</blockquote>

<style>
  .quote-block {
    padding: 1.5rem 2rem;
    margin: 0;
    border-left: 5px solid var(--teal);
    background: rgba(47, 184, 214, 0.08);
    border-radius: 0 var(--radius-md) var(--radius-md) 0;
  }
  .quote-text {
    font-size: clamp(1.1rem, 2.5vw, 1.6rem);
    font-style: italic;
    line-height: 1.6;
    font-family: var(--font-display);
    color: var(--stone);
    margin: 0;
  }
  .quote-attribution {
    display: block;
    font-size: clamp(0.8rem, 1.2vw, 1rem);
    color: var(--color-text-secondary);
    margin-top: 0.75rem;
    font-style: normal;
    font-weight: 500;
  }
</style>
