import type { PixelGrid } from '../game/data/pixelArt'

export type PixelIconProps = {
  grid: PixelGrid
  title?: string
  className?: string
}

export default function PixelIcon({
  grid,
  title,
  className,
}: PixelIconProps) {
  const height = grid.length
  const width = grid[0]?.length ?? 0

  if (height === 0 || width === 0 || grid.some((row) => row.length !== width)) {
    throw new Error('PixelIcon requires a non-empty grid with equal row widths')
  }

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {grid.flatMap((row, y) =>
        [...row].map((cell, x) =>
          cell === '#' ? (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width="1"
              height="1"
              fill="currentColor"
            />
          ) : null,
        ),
      )}
    </svg>
  )
}
