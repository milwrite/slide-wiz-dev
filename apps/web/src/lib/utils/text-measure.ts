import { prepare, layout } from '@chenglou/pretext'

/**
 * Returns the largest font size (between baseFontSize and minFontSize) that
 * fits the given text inside the container dimensions without overflow.
 */
export function fitText(
  text: string,
  fontFamily: string,
  baseFontSize: number,
  fontWeight: string | number,
  containerWidth: number,
  containerHeight: number,
  lineHeight: number,
  minFontSize: number = 12
): number {
  if (!text.trim() || containerWidth <= 0 || containerHeight <= 0) {
    return baseFontSize
  }

  for (let size = baseFontSize; size >= minFontSize; size -= 1) {
    const font = `${fontWeight} ${size}px ${fontFamily}`
    const lh = size * lineHeight
    const prepared = prepare(text, font)
    const result = layout(prepared, containerWidth, lh)
    if (result.height <= containerHeight) {
      return size
    }
  }

  return minFontSize
}

/**
 * Returns true if the text would overflow the given container at the
 * specified font size.
 */
export function textOverflows(
  text: string,
  fontFamily: string,
  fontSize: number,
  fontWeight: string | number,
  containerWidth: number,
  containerHeight: number,
  lineHeight: number
): boolean {
  if (!text.trim() || containerWidth <= 0 || containerHeight <= 0) {
    return false
  }

  const font = `${fontWeight} ${fontSize}px ${fontFamily}`
  const lh = fontSize * lineHeight
  const prepared = prepare(text, font)
  const result = layout(prepared, containerWidth, lh)
  return result.height > containerHeight
}
