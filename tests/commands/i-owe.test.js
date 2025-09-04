import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { MessageFlags } from 'discord.js';

// Mock the database functions
jest.mock('../../src/db/dbQueries.js', () => ({
    getTransactionDetailsFromSomeone: jest.fn()
}));

jest.mock('../../src/utils/utils.js', () => ({
    pluralize: jest.fn(),
    formatNumber: jest.fn()
}));

import { getTransactionDetailsFromSomeone } from '../../src/db/dbQueries.js';
import { pluralize, formatNumber } from '../../src/utils/utils.js';

// Import the command after mocking
import iOweCommand from '../../src/commands/utility/i-owe.js';

describe('I Owe Command', () => {
    let mockInteraction;
    
    beforeEach(() => {
        jest.clearAllMocks();
        
        mockInteraction = {
            user: { id: 'user123' },
            options: {
                getUser: jest.fn().mockReturnValue({ id: 'creditor456' })
            },
            reply: jest.fn()
        };
    });

    describe('Command Data', () => {
        test('should have correct command structure', () => {
            expect(iOweCommand.data.name).toBe('i-owe');
            expect(iOweCommand.data.description).toBe('Check how much you owe someone');
        });
    });

    describe('Execute Function', () => {
        test('should reject self-debt', async () => {
            mockInteraction.options.getUser.mockReturnValue({ id: 'user123' });
            
            await iOweCommand.execute(mockInteraction);
            
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: "You can't owe yourself money!",
                flags: MessageFlags.Ephemeral
            });
            expect(getTransactionDetailsFromSomeone).not.toHaveBeenCalled();
        });

        test('should display message when no transactions exist', async () => {
            getTransactionDetailsFromSomeone.mockResolvedValue({
                totalAmount: 0,
                debtCount: 0,
                transactions: []
            });
            
            await iOweCommand.execute(mockInteraction);
            
            expect(getTransactionDetailsFromSomeone).toHaveBeenCalledWith('creditor456', 'user123');
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: "You don't owe <@creditor456> anything!",
                flags: MessageFlags.Ephemeral
            });
        });

        test('should display debt with single transaction', async () => {
            getTransactionDetailsFromSomeone.mockResolvedValue({
                totalAmount: 25.50,
                debtCount: 1,
                transactions: [{
                    amount: 25.50,
                    description: 'Lunch money',
                    createdAt: 1609459200000 // Jan 1, 2021
                }]
            });
            pluralize.mockReturnValue('from 1 transaction');
            
            await iOweCommand.execute(mockInteraction);
            
            expect(getTransactionDetailsFromSomeone).toHaveBeenCalledWith('creditor456', 'user123');
            expect(pluralize).toHaveBeenCalledWith('from 1 transaction', 1);
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: expect.stringContaining('You owe <@creditor456> $25.50 from 1 transaction:'),
                flags: MessageFlags.Ephemeral
            });
        });

        test('should display debt with multiple transactions', async () => {
            getTransactionDetailsFromSomeone.mockResolvedValue({
                totalAmount: 150.75,
                debtCount: 2,
                transactions: [
                    {
                        amount: 75.25,
                        description: 'Dinner',
                        createdAt: 1609459200000
                    },
                    {
                        amount: 75.50,
                        description: 'Movie tickets',
                        createdAt: 1609545600000
                    }
                ]
            });
            pluralize.mockReturnValue('from 2 transactions');
            
            await iOweCommand.execute(mockInteraction);
            
            expect(getTransactionDetailsFromSomeone).toHaveBeenCalledWith('creditor456', 'user123');
            expect(pluralize).toHaveBeenCalledWith('from 2 transaction', 2);
            const replyCall = mockInteraction.reply.mock.calls[0][0];
            expect(replyCall.content).toContain('You owe <@creditor456> $150.75 from 2 transactions:');
            expect(replyCall.content).toContain('• $75.25 - Dinner');
            expect(replyCall.content).toContain('• $75.50 - Movie tickets');
        });

        test('should handle database errors', async () => {
            getTransactionDetailsFromSomeone.mockRejectedValue(new Error('Database error'));
            
            await expect(iOweCommand.execute(mockInteraction)).rejects.toThrow('Database error');
        });
        
        test('should handle transactions with no description', async () => {
            getTransactionDetailsFromSomeone.mockResolvedValue({
                totalAmount: 50.00,
                debtCount: 1,
                transactions: [{
                    amount: 50.00,
                    description: null,
                    createdAt: 1609459200000
                }]
            });
            pluralize.mockReturnValue('from 1 transaction');
            
            await iOweCommand.execute(mockInteraction);
            
            const replyCall = mockInteraction.reply.mock.calls[0][0];
            expect(replyCall.content).toContain('*No description*');
        });
    });

    describe('Option Validation', () => {
        test('should extract correct options from interaction', async () => {
            getTransactionDetailsFromSomeone.mockResolvedValue({
                totalAmount: 0,
                debtCount: 0,
                transactions: []
            });
            
            await iOweCommand.execute(mockInteraction);
            
            expect(mockInteraction.options.getUser).toHaveBeenCalledWith('creditor');
        });
    });

    describe('Message Formatting', () => {
        test('should use ephemeral flag for all replies', async () => {
            getTransactionDetailsFromSomeone.mockResolvedValue({
                totalAmount: 100.00,
                debtCount: 1,
                transactions: [{
                    amount: 100.00,
                    description: 'Test',
                    createdAt: 1609459200000
                }]
            });
            pluralize.mockReturnValue('from 1 transaction');
            
            await iOweCommand.execute(mockInteraction);
            
            const replyCall = mockInteraction.reply.mock.calls[0][0];
            expect(replyCall.flags).toBe(MessageFlags.Ephemeral);
        });
    });
});