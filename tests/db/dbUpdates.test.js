import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import { addTransaction, deleteTransaction, partiallySettleTransaction, settleTransaction } from '../../src/db/dbUpdates.js';
import { getDB } from '../../src/db/db.js';

let mongoServer;
let connection;
let db;

// Mock the db module with a factory that returns a function
jest.mock('../../src/db/db.js', () => ({
    getDB: jest.fn()
}));

describe('Database Updates', () => {
    beforeEach(async () => {
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        connection = await MongoClient.connect(uri);
        db = connection.db();
        
        // Configure the mock to return our test database
        getDB.mockReturnValue(db);
        
        // Ensure debts collection exists and set up the debts collection property
        await db.createCollection('debts');
        db.debts = db.collection('debts');
    });

    afterEach(async () => {
        await connection.close();
        await mongoServer.stop();
    });

    describe('addTransaction', () => {
        test('should add a new transaction', async () => {
            const guildId = 'guild123';
            const userId = 'user123';
            const debtorId = 'debtor123';
            const amount = 50.25;
            const description = 'Lunch money';

            await addTransaction(guildId, userId, debtorId, amount, description);

            const transactions = await db.debts.find({}).toArray();
            expect(transactions).toHaveLength(1);
            expect(transactions[0]).toMatchObject({
                creditorId: userId,
                debtorId: debtorId,
                amount: amount,
                description: description,
                guildId: guildId,
                isSettled: false,
                currency: 'USD'
            });
            expect(transactions[0].createdAt).toBeDefined();
        });

        test('should handle transactions without description', async () => {
            await addTransaction('guild123', 'user123', 'debtor123', 25.00, null);

            const transactions = await db.debts.find({}).toArray();
            expect(transactions[0].description).toBeNull();
        });
    });

    describe('deleteTransaction', () => {
        test('should soft delete a transaction by marking as settled', async () => {
            // First add a transaction
            await addTransaction('guild123', 'user123', 'debtor123', 50.00, 'Test debt');
            const transactions = await db.debts.find({}).toArray();
            const transactionId = transactions[0]._id;

            // Delete the transaction
            const result = await deleteTransaction('user123', transactionId);

            // Verify it was marked as settled with 0 amount
            expect(result).toBeDefined();
            expect(result.isSettled).toBe(true);
            expect(result.amount).toBe(0);

            // Verify the record still exists in database
            const updatedTransaction = await db.debts.findOne({ _id: transactionId });
            expect(updatedTransaction).not.toBeNull();
            expect(updatedTransaction.isSettled).toBe(true);
        });

        test('should not delete transaction for wrong creditor', async () => {
            await addTransaction('guild123', 'user123', 'debtor123', 50.00, 'Test debt');
            const transactions = await db.debts.find({}).toArray();
            const transactionId = transactions[0]._id;

            const result = await deleteTransaction('wronguser', transactionId);
            expect(result).toBeNull();

            // Original transaction should be unchanged
            const originalTransaction = await db.debts.findOne({ _id: transactionId });
            expect(originalTransaction.isSettled).toBe(false);
        });
    });

    describe('partiallySettleTransaction', () => {
        test('should reduce transaction amount', async () => {
            await addTransaction('guild123', 'user123', 'debtor123', 100.00, 'Test debt');
            const transactions = await db.debts.find({}).toArray();
            const transactionId = transactions[0]._id;

            const result = await partiallySettleTransaction('user123', transactionId, 30.00);

            expect(result).toBeDefined();
            expect(result.amount).toBe(70.00);
            expect(result.isSettled).toBe(false);
        });

        test('should fully settle when partial payment equals or exceeds amount', async () => {
            await addTransaction('guild123', 'user123', 'debtor123', 50.00, 'Test debt');
            const transactions = await db.debts.find({}).toArray();
            const transactionId = transactions[0]._id;

            const result = await partiallySettleTransaction('user123', transactionId, 50.00);

            // Check the final state after auto-settlement
            const finalTransaction = await db.debts.findOne({ _id: transactionId });
            expect(finalTransaction.isSettled).toBe(true);
            expect(finalTransaction.amount).toBe(0);
        });

        test('should fully settle when partial payment exceeds amount', async () => {
            await addTransaction('guild123', 'user123', 'debtor123', 30.00, 'Test debt');
            const transactions = await db.debts.find({}).toArray();
            const transactionId = transactions[0]._id;

            await partiallySettleTransaction('user123', transactionId, 40.00);

            const finalTransaction = await db.debts.findOne({ _id: transactionId });
            expect(finalTransaction.isSettled).toBe(true);
            expect(finalTransaction.amount).toBe(0);
        });

        test('should not allow partial payment by wrong creditor', async () => {
            await addTransaction('guild123', 'user123', 'debtor123', 100.00, 'Test debt');
            const transactions = await db.debts.find({}).toArray();
            const transactionId = transactions[0]._id;

            const result = await partiallySettleTransaction('wronguser', transactionId, 30.00);
            expect(result).toBeNull();
        });
    });

    describe('settleTransaction', () => {
        test('should mark transaction as settled', async () => {
            await addTransaction('guild123', 'user123', 'debtor123', 50.00, 'Test debt');
            const transactions = await db.debts.find({}).toArray();
            const transactionId = transactions[0]._id;

            await settleTransaction('user123', transactionId);

            const settledTransaction = await db.debts.findOne({ _id: transactionId });
            expect(settledTransaction.isSettled).toBe(true);
        });

        test('should not settle transaction for wrong creditor', async () => {
            await addTransaction('guild123', 'user123', 'debtor123', 50.00, 'Test debt');
            const transactions = await db.debts.find({}).toArray();
            const transactionId = transactions[0]._id;

            await settleTransaction('wronguser', transactionId);

            const transaction = await db.debts.findOne({ _id: transactionId });
            expect(transaction.isSettled).toBe(false);
        });
    });
});