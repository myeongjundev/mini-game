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
      // 크기는 CSS가 정한다. 이 속성은 CSS 규칙을 빠뜨렸을 때의 안전망이다.
      // 없으면 SVG가 부모를 다 채워버려 옆 내용을 밀어낸다. CSS는 속성보다
      // 우선하므로 기존 아이콘 크기에는 영향이 없다.
      width={width}
      height={height}
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
