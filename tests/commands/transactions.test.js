import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';

// Mock the database functions
jest.mock('../../src/db/dbQueries.js', () => ({
    getAllUnsettledTransactionsFromSomeone: jest.fn()
}));

jest.mock('../../src/db/dbUpdates.js', () => ({
    deleteTransaction: jest.fn(),
    partiallySettleTransaction: jest.fn()
}));

import { getAllUnsettledTransactionsFromSomeone } from '../../src/db/dbQueries.js';
import { deleteTransaction, partiallySettleTransaction } from '../../src/db/dbUpdates.js';

// Import the command after mocking
import transactionsCommand from '../../src/commands/utility/transactions.js';

describe('Transactions Command', () => {
    let mockInteraction;
    
    beforeEach(() => {
        jest.clearAllMocks();
        
        mockInteraction = {
            user: { id: 'user123' },
            options: {
                getUser: jest.fn().mockReturnValue({ id: 'debtor456' })
            },
            reply: jest.fn(),
            deferReply: jest.fn(),
            editReply: jest.fn().mockResolvedValue({
                createMessageComponentCollector: jest.fn().mockReturnValue({
                    on: jest.fn(),
                    stop: jest.fn()
                })
            }),
            channel: {
                createMessageComponentCollector: jest.fn()
            }
        };
    });

    describe('Command Data', () => {
        test('should have correct command structure', () => {
            expect(transactionsCommand.data.name).toBe('transactions');
            expect(transactionsCommand.data.description).toBe('Show and manage all transactions with a user');
        });
    });

    describe('Execute Function', () => {
        test('should reject self-debt', async () => {
            mockInteraction.options.getUser.mockReturnValue({ id: 'user123' });
            
            await transactionsCommand.execute(mockInteraction);
            
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: "You can't owe yourself money!",
                flags: expect.any(Number)
            });
        });

        test('should handle no transactions case', async () => {
            getAllUnsettledTransactionsFromSomeone.mockResolvedValue([]);
            
            await transactionsCommand.execute(mockInteraction);
            
            expect(mockInteraction.editReply).toHaveBeenCalledWith({
                content: '<@debtor456> owes you nothing'
            });
        });

        test('should display transactions with proper pagination', async () => {
            const mockTransactions = [
                {
                    _id: 'tx1',
                    amount: 50.00,
                    description: 'Lunch',
                    createdAt: Date.now()
                },
                {
                    _id: 'tx2', 
                    amount: 25.50,
                    description: 'Coffee',
                    createdAt: Date.now()
                }
            ];
            
            getAllUnsettledTransactionsFromSomeone.mockResolvedValue(mockTransactions);
            mockInteraction.reply.mockResolvedValue({
                createMessageComponentCollector: jest.fn().mockReturnValue({
                    on: jest.fn()
                })
            });
            
            await transactionsCommand.execute(mockInteraction);
            
            expect(mockInteraction.editReply).toHaveBeenCalledWith({
                embeds: expect.arrayContaining([expect.any(EmbedBuilder)]),
                components: expect.arrayContaining([expect.any(ActionRowBuilder)])
            });
        });
    });

    describe('UI Components', () => {
        test('should create select menu with transaction options', async () => {
            const mockTransactions = [
                {
                    _id: 'tx1',
                    amount: 50.00,
                    description: 'Lunch money',
                    createdAt: Date.now()
                }
            ];
            
            getAllUnsettledTransactionsFromSomeone.mockResolvedValue(mockTransactions);
            
            // Mock the reply to return a collector
            const mockCollector = {
                on: jest.fn()
            };
            mockInteraction.reply.mockResolvedValue({
                createMessageComponentCollector: jest.fn().mockReturnValue(mockCollector)
            });
            
            await transactionsCommand.execute(mockInteraction);
            
            // Verify editReply was called with components
            expect(mockInteraction.editReply).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: expect.arrayContaining([
                        expect.any(ActionRowBuilder)
                    ])
                })
            );
        });
    });

    describe('Pagination Logic', () => {
        test('should handle multiple pages correctly', async () => {
            // Create 15 transactions to test pagination (TRANSACTIONS_PER_PAGE = 10)
            const mockTransactions = Array.from({ length: 15 }, (_, i) => ({
                _id: `tx${i + 1}`,
                amount: 10.00 + i,
                description: `Transaction ${i + 1}`,
                createdAt: Date.now()
            }));
            
            getAllUnsettledTransactionsFromSomeone.mockResolvedValue(mockTransactions);
            mockInteraction.reply.mockResolvedValue({
                createMessageComponentCollector: jest.fn().mockReturnValue({
                    on: jest.fn()
                })
            });
            
            await transactionsCommand.execute(mockInteraction);
            
            const replyCall = mockInteraction.editReply.mock.calls[0][0];
            expect(replyCall.embeds[0].data.footer.text).toContain('Page 1 of 2');
        });
    });

    describe('Error Handling', () => {
        test('should handle database errors gracefully', async () => {
            getAllUnsettledTransactionsFromSomeone.mockRejectedValue(new Error('Database error'));
            
            await expect(transactionsCommand.execute(mockInteraction)).rejects.toThrow('Database error');
        });
    });
});