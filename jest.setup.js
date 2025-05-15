import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Mock the fs module since we're running in jsdom environment
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    statSync: jest.fn(),
    appendFileSync: jest.fn(),
    readFileSync: jest.fn(),
    readdirSync: jest.fn(),
    unlinkSync: jest.fn(),
})); 