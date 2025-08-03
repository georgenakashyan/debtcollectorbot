import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { MessageFlags } from 'discord.js';

// Mock the database functions
jest.mock('../../src/db/dbQueries.js', () => ({
    getTotalDebtFromSomeone: jest.fn()
}));

jest.mock('../../src/utils/utils.js', () => ({
    pluralize: jest.fn()
}));

import { getTotalDebtFromSomeone } from '../../src/db/dbQueries.js';
import { pluralize } from '../../src/utils/utils.js';

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
            expect(getTotalDebtFromSomeone).not.toHaveBeenCalled();
        });

        test('should display debt with no transactions', async () => {
            getTotalDebtFromSomeone.mockResolvedValue({
                totalAmount: 0,
                debtCount: 0
            });
            
            await iOweCommand.execute(mockInteraction);
            
            expect(getTotalDebtFromSomeone).toHaveBeenCalledWith('creditor456', 'user123');
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: 'You owe <@creditor456> $0 ',
                flags: MessageFlags.Ephemeral
            });
        });

        test('should display debt with single transaction', async () => {
            getTotalDebtFromSomeone.mockResolvedValue({
                totalAmount: 25.50,
                debtCount: 1
            });
            pluralize.mockReturnValue('from 1 transaction');
            
            await iOweCommand.execute(mockInteraction);
            
            expect(getTotalDebtFromSomeone).toHaveBeenCalledWith('creditor456', 'user123');
            expect(pluralize).toHaveBeenCalledWith('from 1 transaction', 1);
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: 'You owe <@creditor456> $25.5 from 1 transaction',
                flags: MessageFlags.Ephemeral
            });
        });

        test('should display debt with multiple transactions', async () => {
            getTotalDebtFromSomeone.mockResolvedValue({
                totalAmount: 150.75,
                debtCount: 5
            });
            pluralize.mockReturnValue('from 5 transactions');
            
            await iOweCommand.execute(mockInteraction);
            
            expect(getTotalDebtFromSomeone).toHaveBeenCalledWith('creditor456', 'user123');
            expect(pluralize).toHaveBeenCalledWith('from 5 transaction', 5);
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: 'You owe <@creditor456> $150.75 from 5 transactions',
                flags: MessageFlags.Ephemeral
            });
        });

        test('should handle database errors', async () => {
            getTotalDebtFromSomeone.mockRejectedValue(new Error('Database error'));
            
            await expect(iOweCommand.execute(mockInteraction)).rejects.toThrow('Database error');
        });
    });

    describe('Option Validation', () => {
        test('should extract correct options from interaction', async () => {
            getTotalDebtFromSomeone.mockResolvedValue({
                totalAmount: 0,
                debtCount: 0
            });
            
            await iOweCommand.execute(mockInteraction);
            
            expect(mockInteraction.options.getUser).toHaveBeenCalledWith('creditor');
        });
    });

    describe('Message Formatting', () => {
        test('should use ephemeral flag for all replies', async () => {
            getTotalDebtFromSomeone.mockResolvedValue({
                totalAmount: 100,
                debtCount: 2
            });
            pluralize.mockReturnValue('from 2 transactions');
            
            await iOweCommand.execute(mockInteraction);
            
            const replyCall = mockInteraction.reply.mock.calls[0][0];
            expect(replyCall.flags).toBe(MessageFlags.Ephemeral);
        });
    });
});