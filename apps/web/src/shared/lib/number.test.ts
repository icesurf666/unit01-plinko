import { describe, expect, it } from 'vitest';
import { clampInteger, parseIntegerInput } from './number';

describe('parseIntegerInput', () => {
  it('parses safe integer strings', () => {
    expect(parseIntegerInput('7')).toBe(7);
    expect(parseIntegerInput('-7')).toBe(-7);
  });

  it('clamps parsed values to the provided range', () => {
    expect(parseIntegerInput('-10', { min: 1, max: 5 })).toBe(1);
    expect(parseIntegerInput('10', { min: 1, max: 5 })).toBe(5);
  });

  it('uses fallback for invalid or unsafe values', () => {
    expect(parseIntegerInput('nope', { fallback: 3 })).toBe(3);
    expect(parseIntegerInput('1.2', { fallback: 3 })).toBe(3);
    expect(parseIntegerInput(`${Number.MAX_SAFE_INTEGER + 1}`, { fallback: 3 })).toBe(3);
  });
});

describe('clampInteger', () => {
  it('rounds finite numbers before clamping', () => {
    expect(clampInteger(1.4, { min: 1, max: 5 })).toBe(1);
    expect(clampInteger(1.5, { min: 1, max: 5 })).toBe(2);
  });

  it('clamps rounded values to the provided range', () => {
    expect(clampInteger(-10, { min: 1, max: 5 })).toBe(1);
    expect(clampInteger(10, { min: 1, max: 5 })).toBe(5);
  });

  it('uses fallback for non-finite numbers', () => {
    expect(clampInteger(Number.NaN, { fallback: 3 })).toBe(3);
    expect(clampInteger(Number.POSITIVE_INFINITY, { fallback: 3 })).toBe(3);
  });
});
