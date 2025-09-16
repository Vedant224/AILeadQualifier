/**
 * Test Setup Configuration
 * 
 * Global test setup and configuration for Jest test environment.
 * Configures test environment, mocks, and utilities.
 */

import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] = 'error'; // Reduce logging noise in tests

// Mock console methods to reduce test output noise
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Only show console output if explicitly enabled
if (!process.env['SHOW_TEST_LOGS']) {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
}

// Global test timeout
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
    // Any global setup needed for tests
});

// Global test cleanup
afterAll(async () => {
    // Restore console methods
    if (!process.env['SHOW_TEST_LOGS']) {
        console.log = originalConsoleLog;
        console.warn = originalConsoleWarn;
        console.error = originalConsoleError;
    }
});

// Extend global namespace for TypeScript first
declare global {
    var testUtils: {
        createMockFile: (overrides?: Partial<Express.Multer.File>) => Express.Multer.File;
        createSampleCSV: (rows?: number) => string;
        delay: (ms: number) => Promise<void>;
    };
}

// Global test utilities
(global as any).testUtils = {
    createMockFile: (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
        fieldname: 'file',
        originalname: 'test.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        size: 1000,
        destination: '',
        filename: '',
        path: '',
        buffer: Buffer.from('test'),
        stream: null as any,
        ...overrides
    }),

    createSampleCSV: (rows: number = 5): string => {
        const header = 'name,role,company,industry,location,linkedin_bio';
        const sampleRows = Array(rows).fill(null).map((_, index) =>
            `Lead ${index},Manager,Company ${index},Technology,Location ${index},Bio for lead ${index}`
        );
        return `${header}\n${sampleRows.join('\n')}`;
    },

    delay: (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))
};