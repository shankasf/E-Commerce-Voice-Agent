import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import {
  saveQueryToHistory,
  getQueryHistory,
  clearQueryHistory,
  getQueryById,
  deleteQueryFromHistory,
} from '../../src/services/queryHistory.service.js';

const TEST_HISTORY_DIR = '/tmp/test-query-history';

describe('QueryHistory Service', () => {
  beforeEach(async () => {
    // Ensure test directory exists and is clean
    try {
      await fs.rm(TEST_HISTORY_DIR, { recursive: true });
    } catch {
      // Directory might not exist
    }
    await fs.mkdir(TEST_HISTORY_DIR, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(TEST_HISTORY_DIR, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('saveQueryToHistory', () => {
    it('should save a query entry with generated id and timestamp', async () => {
      const entry = await saveQueryToHistory({
        database: 'test_db',
        sql: 'SELECT * FROM users',
        duration: 150,
        rowCount: 10,
        command: 'SELECT',
        userId: 'testuser',
      });

      expect(entry.id).toBeDefined();
      expect(entry.executedAt).toBeDefined();
      expect(entry.database).toBe('test_db');
      expect(entry.sql).toBe('SELECT * FROM users');
      expect(entry.duration).toBe(150);
      expect(entry.rowCount).toBe(10);
    });

    it('should create file if it does not exist', async () => {
      await saveQueryToHistory({
        database: 'new_db',
        sql: 'SELECT 1',
        duration: 10,
        rowCount: 1,
        command: 'SELECT',
        userId: 'testuser',
      });

      const filepath = path.join(TEST_HISTORY_DIR, 'new_db.json');
      const exists = await fs.access(filepath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should add entries to the beginning of history', async () => {
      await saveQueryToHistory({
        database: 'test_db',
        sql: 'SELECT 1',
        duration: 10,
        rowCount: 1,
        command: 'SELECT',
        userId: 'testuser',
      });

      await saveQueryToHistory({
        database: 'test_db',
        sql: 'SELECT 2',
        duration: 20,
        rowCount: 1,
        command: 'SELECT',
        userId: 'testuser',
      });

      const { entries } = await getQueryHistory('test_db');
      expect(entries[0].sql).toBe('SELECT 2');
      expect(entries[1].sql).toBe('SELECT 1');
    });

    it('should sanitize database name for filename', async () => {
      await saveQueryToHistory({
        database: 'my-test.db/name',
        sql: 'SELECT 1',
        duration: 10,
        rowCount: 1,
        command: 'SELECT',
        userId: 'testuser',
      });

      // Should create file with sanitized name
      const filepath = path.join(TEST_HISTORY_DIR, 'my-test_db_name.json');
      const exists = await fs.access(filepath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('getQueryHistory', () => {
    beforeEach(async () => {
      // Add some test entries
      for (let i = 0; i < 5; i++) {
        await saveQueryToHistory({
          database: 'test_db',
          sql: `SELECT ${i}`,
          duration: i * 10,
          rowCount: i,
          command: 'SELECT',
          userId: 'testuser',
        });
      }
    });

    it('should return all entries within limit', async () => {
      const { entries, total } = await getQueryHistory('test_db');
      expect(entries.length).toBe(5);
      expect(total).toBe(5);
    });

    it('should support pagination with limit and offset', async () => {
      const { entries } = await getQueryHistory('test_db', 2, 1);
      expect(entries.length).toBe(2);
      expect(entries[0].sql).toBe('SELECT 3');
      expect(entries[1].sql).toBe('SELECT 2');
    });

    it('should return empty array for non-existent database', async () => {
      const { entries, total } = await getQueryHistory('non_existent_db');
      expect(entries).toEqual([]);
      expect(total).toBe(0);
    });
  });

  describe('clearQueryHistory', () => {
    it('should remove all history for a database', async () => {
      await saveQueryToHistory({
        database: 'test_db',
        sql: 'SELECT 1',
        duration: 10,
        rowCount: 1,
        command: 'SELECT',
        userId: 'testuser',
      });

      await clearQueryHistory('test_db');

      const { entries } = await getQueryHistory('test_db');
      expect(entries).toEqual([]);
    });

    it('should not throw for non-existent database', async () => {
      await expect(clearQueryHistory('non_existent_db')).resolves.not.toThrow();
    });
  });

  describe('getQueryById', () => {
    it('should return query by id', async () => {
      const saved = await saveQueryToHistory({
        database: 'test_db',
        sql: 'SELECT * FROM users',
        duration: 100,
        rowCount: 5,
        command: 'SELECT',
        userId: 'testuser',
      });

      const retrieved = await getQueryById('test_db', saved.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.sql).toBe('SELECT * FROM users');
    });

    it('should return null for non-existent query', async () => {
      const result = await getQueryById('test_db', 'non-existent-id');
      expect(result).toBeNull();
    });

    it('should return null for non-existent database', async () => {
      const result = await getQueryById('non_existent_db', 'some-id');
      expect(result).toBeNull();
    });
  });

  describe('deleteQueryFromHistory', () => {
    it('should delete specific query from history', async () => {
      const saved = await saveQueryToHistory({
        database: 'test_db',
        sql: 'SELECT 1',
        duration: 10,
        rowCount: 1,
        command: 'SELECT',
        userId: 'testuser',
      });

      const deleted = await deleteQueryFromHistory('test_db', saved.id);
      expect(deleted).toBe(true);

      const retrieved = await getQueryById('test_db', saved.id);
      expect(retrieved).toBeNull();
    });

    it('should return false when query not found', async () => {
      const deleted = await deleteQueryFromHistory('test_db', 'non-existent-id');
      expect(deleted).toBe(false);
    });

    it('should not affect other queries', async () => {
      const entry1 = await saveQueryToHistory({
        database: 'test_db',
        sql: 'SELECT 1',
        duration: 10,
        rowCount: 1,
        command: 'SELECT',
        userId: 'testuser',
      });

      const entry2 = await saveQueryToHistory({
        database: 'test_db',
        sql: 'SELECT 2',
        duration: 20,
        rowCount: 2,
        command: 'SELECT',
        userId: 'testuser',
      });

      await deleteQueryFromHistory('test_db', entry1.id);

      const { entries } = await getQueryHistory('test_db');
      expect(entries.length).toBe(1);
      expect(entries[0].id).toBe(entry2.id);
    });
  });
});
