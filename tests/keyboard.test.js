import { describe, it, expect } from 'vitest';
import { isImeComposing } from '../js/utils/keyboard.js';

describe('isImeComposing', () => {
  it('returns true when event.isComposing is true', () => {
    expect(isImeComposing({ isComposing: true })).toBe(true);
  });

  it('returns true when keyCode is 229 (Safari/legacy IME fallback)', () => {
    expect(isImeComposing({ keyCode: 229 })).toBe(true);
  });

  it('returns true when both signals are present', () => {
    expect(isImeComposing({ isComposing: true, keyCode: 229 })).toBe(true);
  });

  it('returns false for a plain Enter keydown', () => {
    expect(isImeComposing({ key: 'Enter', isComposing: false, keyCode: 13 })).toBe(false);
  });

  it('returns false when isComposing is missing and keyCode is not 229', () => {
    expect(isImeComposing({ key: 'a', keyCode: 65 })).toBe(false);
  });

  it('returns false when isComposing is falsy (e.g. undefined)', () => {
    expect(isImeComposing({ keyCode: 13 })).toBe(false);
  });

  it('returns false (and does not throw) for null event', () => {
    expect(isImeComposing(null)).toBe(false);
  });

  it('returns false (and does not throw) for undefined event', () => {
    expect(isImeComposing(undefined)).toBe(false);
  });

  it('does not treat isComposing="true" string as truthy (strict equality)', () => {
    // 仕様上 isComposing は boolean。文字列 "true" は弾く
    expect(isImeComposing({ isComposing: 'true' })).toBe(false);
  });
});
