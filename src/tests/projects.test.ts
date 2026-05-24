import { describe, it, expect } from 'vitest';
import { validateProjectName, validateProjectColor } from '@/lib/project-utils';
import { PROJECT_PALETTE } from '@/lib/design';

describe('validateProjectName', () => {
  it('returns an error for an empty string', () => {
    expect(validateProjectName('')).not.toBeNull();
  });

  it('returns an error for a whitespace-only string', () => {
    expect(validateProjectName('   ')).not.toBeNull();
  });

  it('returns an error when name exceeds 100 characters', () => {
    expect(validateProjectName('a'.repeat(101))).not.toBeNull();
  });

  it('accepts a name of exactly 100 characters', () => {
    expect(validateProjectName('a'.repeat(100))).toBeNull();
  });

  it('accepts a normal name', () => {
    expect(validateProjectName('Work')).toBeNull();
  });

  it('trims and accepts a name with surrounding whitespace', () => {
    expect(validateProjectName('  valid  ')).toBeNull();
  });

  it('returns an error for non-string input', () => {
    expect(validateProjectName(null)).not.toBeNull();
    expect(validateProjectName(42)).not.toBeNull();
    expect(validateProjectName(undefined)).not.toBeNull();
  });
});

describe('validateProjectColor', () => {
  it('accepts every color in the fixed palette', () => {
    for (const color of PROJECT_PALETTE) {
      expect(validateProjectColor(color)).toBeNull();
    }
  });

  it('rejects a color not in the palette', () => {
    expect(validateProjectColor('#FF0000')).not.toBeNull();
    expect(validateProjectColor('#000000')).not.toBeNull();
  });

  it('rejects an empty string', () => {
    expect(validateProjectColor('')).not.toBeNull();
  });

  it('rejects non-string input', () => {
    expect(validateProjectColor(null)).not.toBeNull();
    expect(validateProjectColor(123)).not.toBeNull();
  });

  it('is case-sensitive (lowercase of an uppercase palette color is rejected)', () => {
    const first = PROJECT_PALETTE[0] as string;
    expect(validateProjectColor(first.toLowerCase())).not.toBeNull();
  });
});
