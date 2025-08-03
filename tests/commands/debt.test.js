import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock the database functions
jest.mock('../../src/db/dbQueries.js', () => ({
    getUserDebts: jest.fn()
}));

jest.mock('../../src/utils/utils.js', () => ({
    pluralize: jest.fn()
}));

import { getUserDebts } from '../../src/db/dbQueries.js';
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
            expect(debtCommand.data.description).toBe('The total debt you owe to others in this server');
        });
    });

    describe('Execute Function', () => {
        test('should display debt with no transactions', async () => {
            getUserDebts.mockResolvedValue({
                totalAmount: 0,
                debtCount: 0
            });
            
            await debtCommand.execute(mockInteraction);
            
            expect(getUserDebts).toHaveBeenCalledWith('guild456', 'user123');
            expect(mockInteraction.reply).toHaveBeenCalledWith(
                '<@user123> owes $0 in this server '
            );
        });

        test('should display debt with single transaction', async () => {
            getUserDebts.mockResolvedValue({
                totalAmount: 25.50,
                debtCount: 1
            });
            pluralize.mockReturnValue('from 1 transaction');
            
            await debtCommand.execute(mockInteraction);
            
            expect(getUserDebts).toHaveBeenCalledWith('guild456', 'user123');
            expect(pluralize).toHaveBeenCalledWith('from 1 transaction', 1);
            expect(mockInteraction.reply).toHaveBeenCalledWith(
                '<@user123> owes $25.5 in this server from 1 transaction'
            );
        });

        test('should display debt with multiple transactions', async () => {
            getUserDebts.mockResolvedValue({
                totalAmount: 150.75,
                debtCount: 5
            });
            pluralize.mockReturnValue('from 5 transactions');
            
            await debtCommand.execute(mockInteraction);
            
            expect(getUserDebts).toHaveBeenCalledWith('guild456', 'user123');
            expect(pluralize).toHaveBeenCalledWith('from 5 transaction', 5);
            expect(mockInteraction.reply).toHaveBeenCalledWith(
                '<@user123> owes $150.75 in this server from 5 transactions'
            );
        });

        test('should handle database errors', async () => {
            getUserDebts.mockRejectedValue(new Error('Database error'));
            
            await expect(debtCommand.execute(mockInteraction)).rejects.toThrow('Database error');
        });
    });

    describe('Message Formatting', () => {
        test('should not include transaction count when debtCount is 0', async () => {
            getUserDebts.mockResolvedValue({
                totalAmount: 0,
                debtCount: 0
            });
            
            await debtCommand.execute(mockInteraction);
            
            expect(pluralize).not.toHaveBeenCalled();
            const replyContent = mockInteraction.reply.mock.calls[0][0];
            expect(replyContent).toBe('<@user123> owes $0 in this server ');
        });

        test('should include transaction count when debtCount > 0', async () => {
            getUserDebts.mockResolvedValue({
                totalAmount: 100,
                debtCount: 3
            });
            pluralize.mockReturnValue('from 3 transactions');
            
            await debtCommand.execute(mockInteraction);
            
            expect(pluralize).toHaveBeenCalled();
            const replyContent = mockInteraction.reply.mock.calls[0][0];
            expect(replyContent).toContain('from 3 transactions');
        });
    });
});