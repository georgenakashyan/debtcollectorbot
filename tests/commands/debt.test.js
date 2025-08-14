import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock the database functions
jest.mock('../../src/db/dbQueries.js', () => ({
    getUserDebtsByCreditor: jest.fn()
}));

jest.mock('../../src/utils/utils.js', () => ({
    pluralize: jest.fn()
}));

import { getUserDebtsByCreditor } from '../../src/db/dbQueries.js';
import { pluralize } from '../../src/utils/utils.js';

// Import the command after mocking
import debtCommand from '../../src/commands/utility/debt.js';

describe('Debt Command', () => {
    let mockInteraction;
    
    beforeEach(() => {
        jest.clearAllMocks();
        
        mockInteraction = {
            user: { id: 'user123' },
            guild: { id: 'guild456' },
            reply: jest.fn()
        };
    });

    describe('Command Data', () => {
        test('should have correct command structure', () => {
            expect(debtCommand.data.name).toBe('debt');
            expect(debtCommand.data.description).toBe('Shows who you owe money to in this server');
        });
    });

    describe('Execute Function', () => {
        test('should display message when no debts exist', async () => {
            getUserDebtsByCreditor.mockResolvedValue([]);
            
            await debtCommand.execute(mockInteraction);
            
            expect(getUserDebtsByCreditor).toHaveBeenCalledWith('guild456', 'user123');
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: "You don't owe anyone money in this server! 🎉",
                ephemeral: true
            });
        });

        test('should display debt breakdown with single creditor', async () => {
            getUserDebtsByCreditor.mockResolvedValue([
                { creditorId: 'creditor1', totalAmount: '25.50', debtCount: 1 }
            ]);
            pluralize.mockReturnValue('transaction');
            
            await debtCommand.execute(mockInteraction);
            
            expect(getUserDebtsByCreditor).toHaveBeenCalledWith('guild456', 'user123');
            expect(pluralize).toHaveBeenCalledWith('transaction', 1);
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: expect.stringContaining('**You owe money to:**\n• <@creditor1>: $25.50 (from 1 transaction)\n\n**Total: $25.50**'),
                ephemeral: true
            });
        });

        test('should display debt breakdown with multiple creditors', async () => {
            getUserDebtsByCreditor.mockResolvedValue([
                { creditorId: 'creditor1', totalAmount: '100.00', debtCount: 2 },
                { creditorId: 'creditor2', totalAmount: '50.75', debtCount: 1 }
            ]);
            pluralize.mockReturnValue('transactions');
            
            await debtCommand.execute(mockInteraction);
            
            expect(getUserDebtsByCreditor).toHaveBeenCalledWith('guild456', 'user123');
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: expect.stringContaining('**You owe money to:**'),
                ephemeral: true
            });
            
            const replyContent = mockInteraction.reply.mock.calls[0][0].content;
            expect(replyContent).toContain('<@creditor1>: $100.00');
            expect(replyContent).toContain('<@creditor2>: $50.75');
            expect(replyContent).toContain('**Total: $150.75**');
        });

        test('should handle database errors', async () => {
            getUserDebtsByCreditor.mockRejectedValue(new Error('Database error'));
            
            await expect(debtCommand.execute(mockInteraction)).rejects.toThrow('Database error');
        });
    });

    describe('Message Formatting', () => {
        test('should use ephemeral replies', async () => {
            getUserDebtsByCreditor.mockResolvedValue([]);
            
            await debtCommand.execute(mockInteraction);
            
            const replyCall = mockInteraction.reply.mock.calls[0][0];
            expect(replyCall).toHaveProperty('ephemeral', true);
        });

        test('should format individual creditor entries correctly', async () => {
            getUserDebtsByCreditor.mockResolvedValue([
                { creditorId: 'user456', totalAmount: '75.25', debtCount: 2 }
            ]);
            pluralize.mockReturnValue('transactions');
            
            await debtCommand.execute(mockInteraction);
            
            const replyContent = mockInteraction.reply.mock.calls[0][0].content;
            expect(replyContent).toContain('• <@user456>: $75.25 (from 2 transactions)');
        });
    });
});