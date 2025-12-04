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
import viewDebtCommand from '../../src/commands/utility/view-debt.js';

describe('View-Debt Command', () => {
    let mockInteraction;
    let mockTargetUser;
    let mockGuildMembers;

    beforeEach(() => {
        jest.clearAllMocks();

        mockTargetUser = {
            id: 'target123',
            username: 'TargetUser'
        };

        mockGuildMembers = {
            fetch: jest.fn()
        };

        mockInteraction = {
            options: {
                getUser: jest.fn().mockReturnValue(mockTargetUser)
            },
            guild: {
                id: 'guild456',
                members: mockGuildMembers
            },
            deferReply: jest.fn().mockResolvedValue(undefined),
            editReply: jest.fn(),
            reply: jest.fn()
        };
    });

    describe('Command Data', () => {
        test('should have correct command structure', () => {
            expect(viewDebtCommand.data.name).toBe('view-debt');
            expect(viewDebtCommand.data.description).toBe('View who a user owes money to in this server');
        });

        test('should have user option configured correctly', () => {
            const options = viewDebtCommand.data.options;
            expect(options).toHaveLength(1);
            expect(options[0].name).toBe('user');
            expect(options[0].description).toBe('User to view debts for');
            expect(options[0].required).toBe(true);
        });
    });

    describe('Execute Function', () => {
        test('should display message when target user has no debts', async () => {
            getUserDebtsByCreditor.mockResolvedValue([]);

            await viewDebtCommand.execute(mockInteraction);

            expect(mockInteraction.deferReply).toHaveBeenCalled();
            expect(getUserDebtsByCreditor).toHaveBeenCalledWith('guild456', 'target123');
            expect(mockInteraction.editReply).toHaveBeenCalledWith({
                content: "TargetUser doesn't owe anyone money in this server! 🎉"
            });
        });

        test('should display debt breakdown with single creditor using username', async () => {
            getUserDebtsByCreditor.mockResolvedValue([
                { creditorId: 'creditor1', totalAmount: '25.50', debtCount: 1 }
            ]);
            pluralize.mockReturnValue('transaction');

            const mockCreditorMember = {
                user: { username: 'CreditorOne' }
            };
            mockGuildMembers.fetch.mockResolvedValue(mockCreditorMember);

            await viewDebtCommand.execute(mockInteraction);

            expect(mockInteraction.deferReply).toHaveBeenCalled();
            expect(getUserDebtsByCreditor).toHaveBeenCalledWith('guild456', 'target123');
            expect(mockGuildMembers.fetch).toHaveBeenCalledWith('creditor1');
            expect(pluralize).toHaveBeenCalledWith('transaction', 1);
            expect(mockInteraction.editReply).toHaveBeenCalledWith({
                content: expect.stringContaining('**TargetUser owes money to:**\n• CreditorOne: $25.50 (from 1 transaction)\n\n**Total: $25.50**')
            });
        });

        test('should display debt breakdown with multiple creditors using usernames', async () => {
            getUserDebtsByCreditor.mockResolvedValue([
                { creditorId: 'creditor1', totalAmount: '100.00', debtCount: 2 },
                { creditorId: 'creditor2', totalAmount: '50.75', debtCount: 1 }
            ]);
            pluralize.mockReturnValue('transactions');

            mockGuildMembers.fetch
                .mockResolvedValueOnce({ user: { username: 'CreditorOne' } })
                .mockResolvedValueOnce({ user: { username: 'CreditorTwo' } });

            await viewDebtCommand.execute(mockInteraction);

            expect(mockInteraction.deferReply).toHaveBeenCalled();
            expect(getUserDebtsByCreditor).toHaveBeenCalledWith('guild456', 'target123');
            expect(mockGuildMembers.fetch).toHaveBeenCalledTimes(2);
            expect(mockInteraction.editReply).toHaveBeenCalledWith({
                content: expect.stringContaining('**TargetUser owes money to:**')
            });

            const replyContent = mockInteraction.editReply.mock.calls[0][0].content;
            expect(replyContent).toContain('CreditorOne: $100.00');
            expect(replyContent).toContain('CreditorTwo: $50.75');
            expect(replyContent).toContain('**Total: $150.75**');
        });

        test('should handle creditor who left server with fallback', async () => {
            getUserDebtsByCreditor.mockResolvedValue([
                { creditorId: 'creditor1', totalAmount: '25.50', debtCount: 1 }
            ]);
            pluralize.mockReturnValue('transaction');

            mockGuildMembers.fetch.mockRejectedValue(new Error('Unknown User'));

            await viewDebtCommand.execute(mockInteraction);

            expect(mockInteraction.deferReply).toHaveBeenCalled();
            const replyContent = mockInteraction.editReply.mock.calls[0][0].content;
            expect(replyContent).toContain('User creditor1: $25.50');
        });

        test('should handle database errors', async () => {
            getUserDebtsByCreditor.mockRejectedValue(new Error('Database error'));

            await expect(viewDebtCommand.execute(mockInteraction)).rejects.toThrow('Database error');
        });
    });

    describe('Message Formatting', () => {
        test('should use public replies (not ephemeral)', async () => {
            getUserDebtsByCreditor.mockResolvedValue([]);

            await viewDebtCommand.execute(mockInteraction);

            expect(mockInteraction.deferReply).toHaveBeenCalled();
            const replyCall = mockInteraction.editReply.mock.calls[0][0];
            expect(replyCall).not.toHaveProperty('ephemeral');
        });

        test('should format individual creditor entries correctly with usernames', async () => {
            getUserDebtsByCreditor.mockResolvedValue([
                { creditorId: 'user456', totalAmount: '75.25', debtCount: 2 }
            ]);
            pluralize.mockReturnValue('transactions');

            mockGuildMembers.fetch.mockResolvedValue({ user: { username: 'SomeUser' } });

            await viewDebtCommand.execute(mockInteraction);

            expect(mockInteraction.deferReply).toHaveBeenCalled();
            const replyContent = mockInteraction.editReply.mock.calls[0][0].content;
            expect(replyContent).toContain('• SomeUser: $75.25 (from 2 transactions)');
            expect(replyContent).not.toContain('<@');
        });
    });
});
