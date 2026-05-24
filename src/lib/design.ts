export const PRIORITY_COLORS = {
  must_do: {
    color: 'var(--p-must)',
    soft: 'var(--p-must-soft)',
    tint: 'var(--p-must-tint)',
    label: 'Must do',
  },
  can_wait: {
    color: 'var(--p-wait)',
    soft: 'var(--p-wait-soft)',
    tint: 'var(--p-wait-tint)',
    label: 'Can wait',
  },
  fun: {
    color: 'var(--p-fun)',
    soft: 'var(--p-fun-soft)',
    tint: 'var(--p-fun-tint)',
    label: 'Fun',
  },
} as const;

export type PriorityId = keyof typeof PRIORITY_COLORS;

export const PROJECT_PALETTE: readonly string[] = [
  '#D49B92', '#E0B190', '#E0CC92', '#C5D198',
  '#A6CFB0', '#90C5B4', '#92BCC2', '#9AB4D6',
  '#A8A8D6', '#B5A4D2', '#C8A4D2', '#D49AC2',
  '#C28290', '#C29982', '#C2B582', '#A3B582',
  '#82AE94', '#82A89C', '#82A0B0', '#8298BC',
  '#9A9ABC', '#A492BC', '#B292BC', '#BC92A8',
];

export const DENSITY_VALUES = ['compact', 'default', 'roomy'] as const;
export type Density = typeof DENSITY_VALUES[number];
