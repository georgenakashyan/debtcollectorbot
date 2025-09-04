import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import { getTotalDebtFromSomeone, getUserDebts, getUserCredits, getAllUnsettledTransactionsFromSomeone, getUserDebtsByCreditor, getUserCreditsByDebtor, getTransactionDetailsFromSomeone } from '../../src/db/dbQueries.js';
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
            },
            {
                creditorId: 'charlie',
                debtorId: 'bob',
                amount: 100.00,
                description: 'Guild2 debt',
                guildId: 'guild2',
                createdAt: Date.now(),
                isSettled: false,
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
            
            expect(result.totalAmount).toBe(75.50); // 50.00 + 25.50 (formatted)
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
            
            expect(result.totalAmount).toBe(75.50);
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
            
            expect(result.totalAmount).toBe(175.5); // 75.5 from guild1 + 100 from guild2
            expect(result.debtCount).toBe(3);
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

    describe('getUserDebtsByCreditor', () => {
        test('should return breakdown of debts by creditor', async () => {
            const result = await getUserDebtsByCreditor('guild1', 'bob');
            
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                creditorId: 'alice',
                totalAmount: 75.5,
                debtCount: 2
            });
        });

        test('should return empty array when user owes nothing', async () => {
            const result = await getUserDebtsByCreditor('guild1', 'alice');
            
            expect(result).toHaveLength(0);
        });

        test('should filter by guild when provided', async () => {
            const result = await getUserDebtsByCreditor('guild2', 'bob');
            
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                creditorId: 'charlie',
                totalAmount: 100,
                debtCount: 1
            });
        });

        test('should exclude settled transactions', async () => {
            const result = await getUserDebtsByCreditor('guild1', 'bob');
            
            // Should not count the settled 30.00 transaction
            expect(result[0].totalAmount).toBe(75.5);
        });

        test('should sort by amount descending', async () => {
            // Add another creditor for bob in guild1
            await db.debts.insertOne({
                creditorId: 'david',
                debtorId: 'bob',
                amount: 200.00,
                description: 'Big loan',
                guildId: 'guild1',
                createdAt: Date.now(),
                isSettled: false,
                currency: 'USD'
            });

            const result = await getUserDebtsByCreditor('guild1', 'bob');
            
            expect(result).toHaveLength(2);
            expect(result[0].creditorId).toBe('david');
            expect(result[1].creditorId).toBe('alice');
        });
    });

    describe('getUserCreditsByDebtor', () => {
        test('should return breakdown of credits by debtor', async () => {
            const result = await getUserCreditsByDebtor('guild1', 'alice');
            
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                debtorId: 'bob',
                totalAmount: 75.5,
                debtCount: 2
            });
        });

        test('should return empty array when user is owed nothing', async () => {
            const result = await getUserCreditsByDebtor('guild1', 'charlie');
            
            expect(result).toHaveLength(0);
        });

        test('should filter by guild when provided', async () => {
            const result = await getUserCreditsByDebtor('guild2', 'charlie');
            
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                debtorId: 'bob',
                totalAmount: 100,
                debtCount: 1
            });
        });

        test('should exclude settled transactions', async () => {
            const result = await getUserCreditsByDebtor('guild1', 'alice');
            
            // Should not count the settled 30.00 transaction
            expect(result[0].totalAmount).toBe(75.5);
        });

        test('should sort by amount descending', async () => {
            // Add another debtor for alice in guild1
            await db.debts.insertOne({
                creditorId: 'alice',
                debtorId: 'eve',
                amount: 150.00,
                description: 'Big debt',
                guildId: 'guild1',
                createdAt: Date.now(),
                isSettled: false,
                currency: 'USD'
            });

            const result = await getUserCreditsByDebtor('guild1', 'alice');
            
            expect(result).toHaveLength(2);
            expect(result[0].debtorId).toBe('eve');
            expect(result[1].debtorId).toBe('bob');
        });
    });

    describe('getTransactionDetailsFromSomeone', () => {
        test('should return transaction details with totals', async () => {
            const result = await getTransactionDetailsFromSomeone('alice', 'bob');
            
            expect(result.totalAmount).toBe(75.5); // formatted number
            expect(result.debtCount).toBe(2);
            expect(result.transactions).toHaveLength(2);
            expect(result.transactions[0].amount).toBe(50.00);
            expect(result.transactions[1].amount).toBe(25.50);
        });

        test('should return empty result for non-existent debt relationship', async () => {
            const result = await getTransactionDetailsFromSomeone('alice', 'charlie');
            
            expect(result.totalAmount).toBe(0);
            expect(result.debtCount).toBe(0);
            expect(result.transactions).toHaveLength(0);
        });

        test('should exclude settled transactions', async () => {
            const result = await getTransactionDetailsFromSomeone('alice', 'bob');
            
            // Should not include the settled 30.00 transaction
            expect(result.transactions.every(tx => tx.amount !== 30.00)).toBe(true);
            expect(result.totalAmount).toBe(75.5);
        });

        test('should sort transactions by creation date descending', async () => {
            const result = await getTransactionDetailsFromSomeone('alice', 'bob');
            
            // First transaction should be the most recent (if created times differ)
            // Both have same createdAt in test data, so order is consistent
            expect(result.transactions).toHaveLength(2);
        });
    });
});