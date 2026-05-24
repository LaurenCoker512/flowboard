type EmptyIllustrationProps = {
  size?: number;
  color?: string;
};

export function EmptyIllustration({ size = 80, color = 'var(--text-tertiary)' }: EmptyIllustrationProps) {
  return (
    <svg
      width={size}
      height={(size * 84) / 120}
      viewBox="0 0 120 84"
      fill="none"
      stroke={color}
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Vase */}
      <path d="M48 40h24l-3 30a4 4 0 0 1-4 4H55a4 4 0 0 1-4-4z" />
      {/* Vase rim */}
      <path d="M46 40h28" />
      {/* Stem 1 */}
      <path d="M58 40c0-8 -4 -16 -8 -20" />
      {/* Stem 1 leaf */}
      <path
        d="M50 20c2 1 4 0 5 -2c-2 -1 -4 0 -5 2z"
        fill={color}
        fillOpacity={0.12}
        stroke={color}
      />
      {/* Stem 2 */}
      <path d="M62 40c0-10 2 -18 6 -24" />
      {/* Stem 2 circle */}
      <circle cx="68" cy="16" r="3" fill={color} fillOpacity={0.12} stroke={color} />
      {/* Stem 3 */}
      <path d="M65 40c0-6 4 -10 8 -12" />
      {/* Stem 3 leaf */}
      <path
        d="M73 28c1 -1 3 -1 4 0c-1 1 -3 1 -4 0z"
        fill={color}
        fillOpacity={0.12}
        stroke={color}
      />
    </svg>
  );
}
