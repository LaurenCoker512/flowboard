type SkeletonProps = {
  height?: number | string;
  width?: number | string;
  borderRadius?: number | string;
  style?: React.CSSProperties;
};

export function Skeleton({ height = 16, width = '100%', borderRadius = 6, style }: SkeletonProps) {
  return (
    <div
      style={{
        height,
        width,
        borderRadius,
        background: 'var(--bg-subtle)',
        animation: 'fb-pulse 1.5s ease-in-out infinite',
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
