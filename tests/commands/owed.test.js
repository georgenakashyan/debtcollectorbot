import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock the database functions
jest.mock('../../src/db/dbQueries.js', () => ({
    getUserCreditsByDebtor: jest.fn()
}));

jest.mock('../../src/utils/utils.js', () => ({
    pluralize: jest.fn()
}));

import { getUserCreditsByDebtor } from '../../src/db/dbQueries.js';
import { pluralize } from '../../src/utils/utils.js';

// Import the command after mocking
import owedCommand from '../../src/commands/utility/owed.js';

describe('Owed Command', () => {
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
            expect(owedCommand.data.name).toBe('owed');
            expect(owedCommand.data.description).toBe('Shows who owes you money in this server');
        });
    });

    describe('Execute Function', () => {
        test('should display message when no credits exist', async () => {
            getUserCreditsByDebtor.mockResolvedValue([]);
            
            await owedCommand.execute(mockInteraction);
            
            expect(getUserCreditsByDebtor).toHaveBeenCalledWith('guild456', 'user123');
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: "No one owes you money in this server! 💸",
                ephemeral: true
            });
        });

        test('should display credit breakdown with single debtor', async () => {
            getUserCreditsByDebtor.mockResolvedValue([
                { debtorId: 'debtor1', totalAmount: '25.50', debtCount: 1 }
            ]);
            pluralize.mockReturnValue('transaction');
            
            await owedCommand.execute(mockInteraction);
            
            expect(getUserCreditsByDebtor).toHaveBeenCalledWith('guild456', 'user123');
            expect(pluralize).toHaveBeenCalledWith('transaction', 1);
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: expect.stringContaining('**People who owe you:**\n• <@debtor1>: $25.50 (from 1 transaction)\n\n**Total: $25.50**'),
                ephemeral: true
            });
        });

        test('should display credit breakdown with multiple debtors', async () => {
            getUserCreditsByDebtor.mockResolvedValue([
                { debtorId: 'debtor1', totalAmount: '100.00', debtCount: 2 },
                { debtorId: 'debtor2', totalAmount: '50.75', debtCount: 1 }
            ]);
            pluralize.mockReturnValue('transactions');
            
            await owedCommand.execute(mockInteraction);
            
            expect(getUserCreditsByDebtor).toHaveBeenCalledWith('guild456', 'user123');
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: expect.stringContaining('**People who owe you:**'),
                ephemeral: true
            });
            
            const replyContent = mockInteraction.reply.mock.calls[0][0].content;
            expect(replyContent).toContain('<@debtor1>: $100.00');
            expect(replyContent).toContain('<@debtor2>: $50.75');
            expect(replyContent).toContain('**Total: $150.75**');
        });

        test('should handle database errors', async () => {
            getUserCreditsByDebtor.mockRejectedValue(new Error('Database error'));
            
            await expect(owedCommand.execute(mockInteraction)).rejects.toThrow('Database error');
        });
    });

    describe('Message Formatting', () => {
        test('should use ephemeral replies', async () => {
            getUserCreditsByDebtor.mockResolvedValue([]);
            
            await owedCommand.execute(mockInteraction);
            
            const replyCall = mockInteraction.reply.mock.calls[0][0];
            expect(replyCall).toHaveProperty('ephemeral', true);
        });

        test('should format individual debtor entries correctly', async () => {
            getUserCreditsByDebtor.mockResolvedValue([
                { debtorId: 'user789', totalAmount: '125.50', debtCount: 3 }
            ]);
            pluralize.mockReturnValue('transactions');
            
            await owedCommand.execute(mockInteraction);
            
            const replyContent = mockInteraction.reply.mock.calls[0][0].content;
            expect(replyContent).toContain('• <@user789>: $125.50 (from 3 transactions)');
        });
    });
});