import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock the database functions
jest.mock('../../src/db/dbQueries.js', () => ({
    getUserCredits: jest.fn()
}));

jest.mock('../../src/utils/utils.js', () => ({
    pluralize: jest.fn()
}));

import { getUserCredits } from '../../src/db/dbQueries.js';
import { pluralize } from '../../src/utils/utils.js';

// Import the command after mocking
import totalOwedCommand from '../../src/commands/utility/total-owed.js';

describe('Total Owed Command', () => {
    let mockInteraction;
    
    beforeEach(() => {
        jest.clearAllMocks();
        
        mockInteraction = {
            user: { id: 'user123' },
            reply: jest.fn()
        };
    });

    describe('Command Data', () => {
        test('should have correct command structure', () => {
            expect(totalOwedCommand.data.name).toBe('total-owed');
            expect(totalOwedCommand.data.description).toBe('The total you are owed by others across all servers');
        });
    });

    describe('Execute Function', () => {
        test('should display total owed across all servers with no transactions', async () => {
            getUserCredits.mockResolvedValue({
                totalAmount: 0,
                debtCount: 0
            });
            
            await totalOwedCommand.execute(mockInteraction);
            
            expect(getUserCredits).toHaveBeenCalledWith(null, 'user123');
            expect(mockInteraction.reply).toHaveBeenCalledWith(
                '<@user123> is owed $0 '
            );
        });

        test('should display total owed with single transaction', async () => {
            getUserCredits.mockResolvedValue({
                totalAmount: 25.50,
                debtCount: 1
            });
            pluralize.mockReturnValue('from 1 transaction');
            
            await totalOwedCommand.execute(mockInteraction);
            
            expect(getUserCredits).toHaveBeenCalledWith(null, 'user123');
            expect(pluralize).toHaveBeenCalledWith('from 1 transaction', 1);
            expect(mockInteraction.reply).toHaveBeenCalledWith(
                '<@user123> is owed $25.5 from 1 transaction'
            );
        });

        test('should display total owed with multiple transactions', async () => {
            getUserCredits.mockResolvedValue({
                totalAmount: 150.75,
                debtCount: 5
            });
            pluralize.mockReturnValue('from 5 transactions');
            
            await totalOwedCommand.execute(mockInteraction);
            
            expect(getUserCredits).toHaveBeenCalledWith(null, 'user123');
            expect(pluralize).toHaveBeenCalledWith('from 5 transaction', 5);
            expect(mockInteraction.reply).toHaveBeenCalledWith(
                '<@user123> is owed $150.75 from 5 transactions'
            );
        });

        test('should handle database errors', async () => {
            getUserCredits.mockRejectedValue(new Error('Database error'));
            
            await expect(totalOwedCommand.execute(mockInteraction)).rejects.toThrow('Database error');
        });
    });

    describe('Cross-Server Query', () => {
        test('should query credits across all servers by passing null guildId', async () => {
            getUserCredits.mockResolvedValue({
                totalAmount: 100,
                debtCount: 3
            });
            pluralize.mockReturnValue('from 3 transactions');
            
            await totalOwedCommand.execute(mockInteraction);
            
            expect(getUserCredits).toHaveBeenCalledWith(null, 'user123');
        });
    });

    describe('Message Formatting', () => {
        test('should not include transaction count when debtCount is 0', async () => {
            getUserCredits.mockResolvedValue({
                totalAmount: 0,
                debtCount: 0
            });
            
            await totalOwedCommand.execute(mockInteraction);
            
            expect(pluralize).not.toHaveBeenCalled();
            const replyContent = mockInteraction.reply.mock.calls[0][0];
            expect(replyContent).toBe('<@user123> is owed $0 ');
        });

        test('should include transaction count when debtCount > 0', async () => {
            getUserCredits.mockResolvedValue({
                totalAmount: 100,
                debtCount: 3
            });
            pluralize.mockReturnValue('from 3 transactions');
            
            await totalOwedCommand.execute(mockInteraction);
            
            expect(pluralize).toHaveBeenCalled();
            const replyContent = mockInteraction.reply.mock.calls[0][0];
            expect(replyContent).toContain('from 3 transactions');
        });
    });
});