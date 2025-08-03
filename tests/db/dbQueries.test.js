import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import { getTotalDebtFromSomeone, getUserDebts, getUserCredits, getAllUnsettledTransactionsFromSomeone } from '../../src/db/dbQueries.js';
import { getDB } from '../../src/db/db.js';

let mongoServer;
let connection;
let db;

// Mock the db module with a factory that returns a function
jest.mock('../../src/db/db.js', () => ({
    getDB: jest.fn()
}));

describe('Database Queries', () => {
    beforeEach(async () => {
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        connection = await MongoClient.connect(uri);
        db = connection.db();
        
        // Configure the mock to return our test database
        getDB.mockReturnValue(db);
        
        // Create test data and set up the debts collection property
        await db.createCollection('debts');
        db.debts = db.collection('debts');
        await db.debts.insertMany([
            {
                creditorId: 'alice',
                debtorId: 'bob',
                amount: 50.00,
                description: 'Lunch money',
                guildId: 'guild1',
                createdAt: Date.now(),
                isSettled: false,
                currency: 'USD'
            },
            {
                creditorId: 'alice',
                debtorId: 'bob',
                amount: 25.50,
                description: 'Coffee',
                guildId: 'guild1',
                createdAt: Date.now(),
                isSettled: false,
                currency: 'USD'
            },
            {
                creditorId: 'bob',
                debtorId: 'charlie',
                amount: 100.00,
                description: 'Dinner',
                guildId: 'guild1',
                createdAt: Date.now(),
                isSettled: false,
                currency: 'USD'
            },
            {
                creditorId: 'alice',
                debtorId: 'bob',
                amount: 30.00,
                description: 'Settled debt',
                guildId: 'guild1',
                createdAt: Date.now(),
                isSettled: true,
                currency: 'USD'
            }
        ]);
    });

    afterEach(async () => {
        await connection.close();
        await mongoServer.stop();
    });

    describe('getTotalDebtFromSomeone', () => {
        test('should return total unsettled debt between two users', async () => {
            const result = await getTotalDebtFromSomeone('alice', 'bob');
            
            expect(result.totalAmount).toBe('75.50'); // 50.00 + 25.50 (formatted)
            expect(result.debtCount).toBe(2);
        });

        test('should return zero for non-existent debt relationship', async () => {
            const result = await getTotalDebtFromSomeone('alice', 'charlie');
            
            expect(result.totalAmount).toBe(0);
            expect(result.debtCount).toBe(0);
        });

        test('should exclude settled transactions', async () => {
            // The settled 30.00 debt should not be included
            const result = await getTotalDebtFromSomeone('alice', 'bob');
            
            expect(result.totalAmount).toBe('75.50');
            expect(result.debtCount).toBe(2);
        });
    });

    describe('getUserDebts', () => {
        test('should return total debt owed by a user', async () => {
            const result = await getUserDebts('guild1', 'bob');
            
            expect(result.totalAmount).toBe(75.50); // 50.00 + 25.50
            expect(result.debtCount).toBe(2);
        });

        test('should return zero for user with no debts', async () => {
            const result = await getUserDebts('guild1', 'alice');
            
            expect(result.totalAmount).toBe(0);
            expect(result.debtCount).toBe(0);
        });

        test('should work without guild filter', async () => {
            const result = await getUserDebts(null, 'bob');
            
            expect(result.totalAmount).toBe(75.50);
            expect(result.debtCount).toBe(2);
        });
    });

    describe('getUserCredits', () => {
        test('should return total amount owed to a user', async () => {
            const result = await getUserCredits('guild1', 'alice');
            
            expect(result.totalAmount).toBe(75.50); // 50.00 + 25.50
            expect(result.debtCount).toBe(2);
        });

        test('should return zero for user with no credits', async () => {
            const result = await getUserCredits('guild1', 'charlie');
            
            expect(result.totalAmount).toBe(0);
            expect(result.debtCount).toBe(0);
        });
    });

    describe('getAllUnsettledTransactionsFromSomeone', () => {
        test('should return all unsettled transactions from specific debtor', async () => {
            const result = await getAllUnsettledTransactionsFromSomeone('alice', 'bob');
            
            expect(result).toHaveLength(2);
            expect(result[0].amount).toBe(50.00);
            expect(result[1].amount).toBe(25.50);
            expect(result.every(tx => tx.isSettled === false)).toBe(true);
        });

        test('should return empty array for non-existent relationship', async () => {
            const result = await getAllUnsettledTransactionsFromSomeone('alice', 'charlie');
            
            expect(result).toHaveLength(0);
        });

        test('should exclude settled transactions', async () => {
            const result = await getAllUnsettledTransactionsFromSomeone('alice', 'bob');
            
            // Should not include the settled 30.00 transaction
            expect(result.every(tx => tx.amount !== 30.00)).toBe(true);
        });
    });
});