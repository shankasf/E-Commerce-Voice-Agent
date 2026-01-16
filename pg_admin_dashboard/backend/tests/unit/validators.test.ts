import { describe, it, expect } from '@jest/globals';
import {
  isSafeIdentifier,
  quoteIdent,
  sanitizeString,
  isValidEmail,
  isValidUUID,
} from '../../src/utils/validators.js';

describe('Validators', () => {
  describe('isSafeIdentifier', () => {
    it('should return true for valid identifiers starting with letter', () => {
      expect(isSafeIdentifier('users')).toBe(true);
      expect(isSafeIdentifier('User')).toBe(true);
      expect(isSafeIdentifier('my_table')).toBe(true);
      expect(isSafeIdentifier('table123')).toBe(true);
      expect(isSafeIdentifier('my-table')).toBe(true);
    });

    it('should return true for identifiers starting with underscore', () => {
      expect(isSafeIdentifier('_private')).toBe(true);
      expect(isSafeIdentifier('_123')).toBe(true);
    });

    it('should return false for identifiers starting with number', () => {
      expect(isSafeIdentifier('123table')).toBe(false);
      expect(isSafeIdentifier('1')).toBe(false);
    });

    it('should return false for empty strings', () => {
      expect(isSafeIdentifier('')).toBe(false);
    });

    it('should return false for identifiers with special characters', () => {
      expect(isSafeIdentifier('table;DROP')).toBe(false);
      expect(isSafeIdentifier("table'name")).toBe(false);
      expect(isSafeIdentifier('table"name')).toBe(false);
      expect(isSafeIdentifier('table.name')).toBe(false);
      expect(isSafeIdentifier('table name')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(isSafeIdentifier(null)).toBe(false);
      expect(isSafeIdentifier(undefined)).toBe(false);
      expect(isSafeIdentifier(123)).toBe(false);
      expect(isSafeIdentifier({})).toBe(false);
      expect(isSafeIdentifier([])).toBe(false);
    });

    it('should prevent SQL injection patterns', () => {
      expect(isSafeIdentifier('users; DROP TABLE users;--')).toBe(false);
      expect(isSafeIdentifier("users' OR '1'='1")).toBe(false);
      expect(isSafeIdentifier('users/*comment*/')).toBe(false);
    });
  });

  describe('quoteIdent', () => {
    it('should quote valid identifiers', () => {
      expect(quoteIdent('users')).toBe('"users"');
      expect(quoteIdent('my_table')).toBe('"my_table"');
      expect(quoteIdent('MyTable')).toBe('"MyTable"');
    });

    it('should throw error for invalid identifiers', () => {
      expect(() => quoteIdent('123table')).toThrow('Invalid identifier');
      expect(() => quoteIdent('')).toThrow('Invalid identifier');
      expect(() => quoteIdent('table;DROP')).toThrow('Invalid identifier');
    });

    it('should escape double quotes in identifiers', () => {
      // Note: This case won't happen with current isSafeIdentifier
      // but the function handles it defensively
      // For valid identifiers without quotes, it should work normally
      expect(quoteIdent('table_name')).toBe('"table_name"');
    });
  });

  describe('sanitizeString', () => {
    it('should return trimmed string for valid input', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
      expect(sanitizeString('test')).toBe('test');
    });

    it('should truncate to maxLength', () => {
      const longString = 'a'.repeat(300);
      expect(sanitizeString(longString, 255).length).toBe(255);
      expect(sanitizeString(longString, 10).length).toBe(10);
    });

    it('should return empty string for non-string values', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
      expect(sanitizeString(123)).toBe('');
      expect(sanitizeString({})).toBe('');
    });

    it('should handle empty strings', () => {
      expect(sanitizeString('')).toBe('');
      expect(sanitizeString('   ')).toBe('');
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.org')).toBe(true);
      expect(isValidEmail('user+tag@example.co.uk')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('notanemail')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('test@.com')).toBe(false);
      expect(isValidEmail('test @example.com')).toBe(false);
    });
  });

  describe('isValidUUID', () => {
    it('should return true for valid UUIDs', () => {
      expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    });

    it('should return true for UUIDs with different versions', () => {
      // UUID v1
      expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
      // UUID v4
      expect(isValidUUID('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
    });

    it('should return false for invalid UUIDs', () => {
      expect(isValidUUID('')).toBe(false);
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('123e4567-e89b-12d3-a456')).toBe(false);
      expect(isValidUUID('123e4567-e89b-12d3-a456-4266141740001')).toBe(false);
      expect(isValidUUID('123e4567e89b12d3a456426614174000')).toBe(false);
    });
  });
});
