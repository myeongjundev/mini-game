import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PIXEL_ART } from '../game/data/pixelArt'
import PixelIcon from './PixelIcon'

describe('PixelIcon', () => {
  it('renders one currentColor rect for each filled cell', () => {
    const grid = PIXEL_ART.heartFull
    const filledCells = grid.join('').replaceAll('.', '').length
    const markup = renderToStaticMarkup(<PixelIcon grid={grid} />)

    expect(markup).toContain('viewBox="0 0 9 8"')
    expect(markup).toContain('shape-rendering="crispEdges"')
    expect(markup).toContain('aria-hidden="true"')
    expect(markup.match(/<rect /g)).toHaveLength(filledCells)
    expect(markup.match(/fill="currentColor"/g)).toHaveLength(filledCells)
    expect(markup).not.toContain('<path')
    expect(markup).not.toContain('<circle')
  })

  it('uses a title for a meaningful icon', () => {
    const markup = renderToStaticMarkup(
      <PixelIcon grid={PIXEL_ART.critical} title="Critical alert" />,
    )

    expect(markup).toContain('role="img"')
    expect(markup).toContain('<title>Critical alert</title>')
    expect(markup).not.toContain('aria-hidden')
  })

  it('keeps the suspicious marker identifiable without a fixed color', () => {
    const grid = PIXEL_ART.suspiciousMarker
    const filledCells = grid.join('').replaceAll('.', '').length
    const markup = renderToStaticMarkup(<PixelIcon grid={grid} />)

    expect(markup).toContain('viewBox="0 0 7 7"')
    expect(markup.match(/fill="currentColor"/g)).toHaveLength(filledCells)
    expect(filledCells).toBe(24)
    expect(grid[3]).toBe('###.###')
  })

  it('rejects empty and inconsistent grids', () => {
    expect(() => renderToStaticMarkup(<PixelIcon grid={[]} />)).toThrow(
      'PixelIcon requires a non-empty grid with equal row widths',
    )
    expect(() =>
      renderToStaticMarkup(<PixelIcon grid={['##', '#']} />),
    ).toThrow('PixelIcon requires a non-empty grid with equal row widths')
  })
})

describe('pixel icon sizing', () => {
  it('carries its grid size as attributes so a missing CSS rule cannot explode it', () => {
    // 실제로 겪은 버그다. .memo-icon에 크기를 빠뜨리자 SVG가 부모를 다
    // 채워버려 옆 글자가 1글자 폭으로 밀렸다.
    const markup = renderToStaticMarkup(<PixelIcon grid={PIXEL_ART.memo} />)

    expect(markup).toContain('width="12"')
    expect(markup).toContain('height="12"')
    expect(markup).toContain('viewBox="0 0 12 12"')
  })

  it('keeps the 16x16 grids at their own size', () => {
    const markup = renderToStaticMarkup(<PixelIcon grid={PIXEL_ART.correct} />)

    expect(markup).toContain('width="16"')
    expect(markup).toContain('height="16"')
  })
})
