import { describe, test, expect } from '@jest/globals';
import { formatNumber } from '../../src/utils/utils.js';

describe('Utility Functions', () => {
    describe('formatNumber', () => {
        test('should format integers correctly', () => {
            expect(formatNumber(5)).toBe('5.00');
            expect(formatNumber(100)).toBe('100.00');
            expect(formatNumber(0)).toBe('0.00');
        });

        test('should format decimals correctly', () => {
            expect(formatNumber(5.5)).toBe('5.50');
            expect(formatNumber(10.25)).toBe('10.25');
            expect(formatNumber(100.123)).toBe('100.12');
        });

        test('should handle very small numbers', () => {
            expect(formatNumber(0.01)).toBe('0.01');
            expect(formatNumber(0.001)).toBe('0.00');
            expect(formatNumber(0.999)).toBe('1.00');
        });

        test('should handle large numbers', () => {
            expect(formatNumber(1000000)).toBe('1000000.00');
            expect(formatNumber(1234567.89)).toBe('1234567.89');
        });

        test('should handle negative numbers', () => {
            expect(formatNumber(-5.50)).toBe('-5.50');
            expect(formatNumber(-100)).toBe('-100.00');
        });

        test('should handle edge cases', () => {
            expect(formatNumber(NaN)).toBe('NaN');
            expect(formatNumber(Infinity)).toBe('Infinity');
            expect(formatNumber(-Infinity)).toBe('-Infinity');
        });

        test('should handle string inputs that can be converted to numbers', () => {
            expect(formatNumber('5.5')).toBe('5.50');
            expect(formatNumber('100')).toBe('100.00');
        });

        test('should handle null and undefined', () => {
            expect(formatNumber(null)).toBe('0.00');
            expect(formatNumber(undefined)).toBe('NaN');
        });
    });
});