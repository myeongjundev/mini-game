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

  it('rejects empty and inconsistent grids', () => {
    expect(() => renderToStaticMarkup(<PixelIcon grid={[]} />)).toThrow(
      'PixelIcon requires a non-empty grid with equal row widths',
    )
    expect(() =>
      renderToStaticMarkup(<PixelIcon grid={['##', '#']} />),
    ).toThrow('PixelIcon requires a non-empty grid with equal row widths')
  })
})
