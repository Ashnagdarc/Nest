/// <reference types="jest" />
const { jest, describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
import '@testing-library/jest-dom';
import { logInfo, logError, logWarning, logDebug, validateTableContext, getRecentLogs } from './logger';

describe('Logger', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        // Clear console mocks before each test
        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
        jest.spyOn(console, 'warn').mockImplementation(() => { });
        jest.spyOn(console, 'debug').mockImplementation(() => { });

        // Reset process.env before each test
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        jest.restoreAllMocks();
        process.env = originalEnv;
    });

    it('should log info messages', () => {
        const message = 'Test info message';
        const context = 'TestContext';
        const data = { key: 'value' };

        logInfo(message, context, data);

        expect(console.log).toHaveBeenCalled();
        const logs = getRecentLogs();
        expect(logs[0]).toMatchObject({
            level: 'info',
            message,
            context,
            data
        });
    });

    it('should log error messages', () => {
        const error = new Error('Test error');
        const context = 'TestContext';
        const data = { key: 'value' };

        logError(error, context, data);

        expect(console.error).toHaveBeenCalled();
        const logs = getRecentLogs();
        expect(logs[0]).toMatchObject({
            level: 'error',
            message: error.message,
            context,
            data: expect.objectContaining({
                key: 'value',
                stack: expect.any(String)
            })
        });
    });

    it('should log warning messages', () => {
        const message = 'Test warning message';
        const context = 'TestContext';
        const data = { key: 'value' };

        logWarning(message, context, data);

        expect(console.warn).toHaveBeenCalled();
        const logs = getRecentLogs();
        expect(logs[0]).toMatchObject({
            level: 'warn',
            message,
            context,
            data
        });
    });

    it('should log debug messages in development', () => {
        process.env = { ...originalEnv, NODE_ENV: 'development' };

        const message = 'Test debug message';
        const context = 'TestContext';
        const data = { key: 'value' };

        logDebug(message, context, data);

        expect(console.debug).toHaveBeenCalled();
        const logs = getRecentLogs();
        expect(logs[0]).toMatchObject({
            level: 'debug',
            message,
            context,
            data
        });
    });

    it('should not log debug messages in production', () => {
        process.env = { ...originalEnv, NODE_ENV: 'production' };

        const message = 'Test debug message';
        const context = 'TestContext';
        const data = { key: 'value' };

        logDebug(message, context, data);

        expect(console.debug).not.toHaveBeenCalled();
        const logs = getRecentLogs();
        expect(logs.length).toBe(0);
    });

    it('should validate table context', () => {
        const tableName = 'test_table';
        const operation = 'insert';
        const data = { id: 1, name: 'test' };

        validateTableContext(tableName, operation, data);

        const logs = getRecentLogs();
        expect(logs[0]).toMatchObject({
            level: 'debug',
            message: 'Validating table context for insert',
            context: 'TableValidation',
            data: {
                tableName,
                data
            }
        });
    });
}); 