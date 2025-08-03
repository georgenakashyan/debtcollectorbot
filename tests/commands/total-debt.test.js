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
import totalDebtCommand from '../../src/commands/utility/total-debt.js';

describe('Total Debt Command', () => {
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
            expect(totalDebtCommand.data.name).toBe('total-debt');
            expect(totalDebtCommand.data.description).toBe('The total debt you owe to others across all servers');
        });
    });

    describe('Execute Function', () => {
        test('should display total debt across all servers with no transactions', async () => {
            getUserDebts.mockResolvedValue({
                totalAmount: 0,
                debtCount: 0
            });
            
            await totalDebtCommand.execute(mockInteraction);
            
            expect(getUserDebts).toHaveBeenCalledWith(null, 'user123');
            expect(mockInteraction.reply).toHaveBeenCalledWith(
                '<@user123> owes others $0 '
            );
        });

        test('should display total debt with single transaction', async () => {
            getUserDebts.mockResolvedValue({
                totalAmount: 25.50,
                debtCount: 1
            });
            pluralize.mockReturnValue('from 1 transaction');
            
            await totalDebtCommand.execute(mockInteraction);
            
            expect(getUserDebts).toHaveBeenCalledWith(null, 'user123');
            expect(pluralize).toHaveBeenCalledWith('from 1 transaction', 1);
            expect(mockInteraction.reply).toHaveBeenCalledWith(
                '<@user123> owes others $25.5 from 1 transaction'
            );
        });

        test('should display total debt with multiple transactions', async () => {
            getUserDebts.mockResolvedValue({
                totalAmount: 150.75,
                debtCount: 5
            });
            pluralize.mockReturnValue('from 5 transactions');
            
            await totalDebtCommand.execute(mockInteraction);
            
            expect(getUserDebts).toHaveBeenCalledWith(null, 'user123');
            expect(pluralize).toHaveBeenCalledWith('from 5 transaction', 5);
            expect(mockInteraction.reply).toHaveBeenCalledWith(
                '<@user123> owes others $150.75 from 5 transactions'
            );
        });

        test('should handle database errors', async () => {
            getUserDebts.mockRejectedValue(new Error('Database error'));
            
            await expect(totalDebtCommand.execute(mockInteraction)).rejects.toThrow('Database error');
        });
    });

    describe('Cross-Server Query', () => {
        test('should query debts across all servers by passing null guildId', async () => {
            getUserDebts.mockResolvedValue({
                totalAmount: 100,
                debtCount: 3
            });
            pluralize.mockReturnValue('from 3 transactions');
            
            await totalDebtCommand.execute(mockInteraction);
            
            expect(getUserDebts).toHaveBeenCalledWith(null, 'user123');
        });
    });

    describe('Message Formatting', () => {
        test('should not include transaction count when debtCount is 0', async () => {
            getUserDebts.mockResolvedValue({
                totalAmount: 0,
                debtCount: 0
            });
            
            await totalDebtCommand.execute(mockInteraction);
            
            expect(pluralize).not.toHaveBeenCalled();
            const replyContent = mockInteraction.reply.mock.calls[0][0];
            expect(replyContent).toBe('<@user123> owes others $0 ');
        });

        test('should include transaction count when debtCount > 0', async () => {
            getUserDebts.mockResolvedValue({
                totalAmount: 100,
                debtCount: 3
            });
            pluralize.mockReturnValue('from 3 transactions');
            
            await totalDebtCommand.execute(mockInteraction);
            
            expect(pluralize).toHaveBeenCalled();
            const replyContent = mockInteraction.reply.mock.calls[0][0];
            expect(replyContent).toContain('from 3 transactions');
        });
    });
});