type ProjectDotProps = {
  color: string;
  size?: number;
};

export function ProjectDot({ color, size = 8 }: ProjectDotProps) {
  return (
    <span
      style={{
        display: 'block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
        marginTop: 1,
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
      }}
    />
  );
}
