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
import viewOwedCommand from '../../src/commands/utility/view-owed.js';

describe('View-Owed Command', () => {
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
            expect(viewOwedCommand.data.name).toBe('view-owed');
            expect(viewOwedCommand.data.description).toBe('View who owes a user money in this server');
        });

        test('should have user option configured correctly', () => {
            const options = viewOwedCommand.data.options;
            expect(options).toHaveLength(1);
            expect(options[0].name).toBe('user');
            expect(options[0].description).toBe('User to view what they are owed');
            expect(options[0].required).toBe(true);
        });
    });

    describe('Execute Function', () => {
        test('should display message when no one owes target user', async () => {
            getUserCreditsByDebtor.mockResolvedValue([]);

            await viewOwedCommand.execute(mockInteraction);

            expect(mockInteraction.deferReply).toHaveBeenCalled();
            expect(getUserCreditsByDebtor).toHaveBeenCalledWith('guild456', 'target123');
            expect(mockInteraction.editReply).toHaveBeenCalledWith({
                content: "No one owes TargetUser money in this server! 💸"
            });
        });

        test('should display credits breakdown with single debtor using username', async () => {
            getUserCreditsByDebtor.mockResolvedValue([
                { debtorId: 'debtor1', totalAmount: '25.50', debtCount: 1 }
            ]);
            pluralize.mockReturnValue('transaction');

            const mockDebtorMember = {
                user: { username: 'DebtorOne' }
            };
            mockGuildMembers.fetch.mockResolvedValue(mockDebtorMember);

            await viewOwedCommand.execute(mockInteraction);

            expect(mockInteraction.deferReply).toHaveBeenCalled();
            expect(getUserCreditsByDebtor).toHaveBeenCalledWith('guild456', 'target123');
            expect(mockGuildMembers.fetch).toHaveBeenCalledWith('debtor1');
            expect(pluralize).toHaveBeenCalledWith('transaction', 1);
            expect(mockInteraction.editReply).toHaveBeenCalledWith({
                content: expect.stringContaining('**People who owe TargetUser:**\n• DebtorOne: $25.50 (from 1 transaction)\n\n**Total: $25.50**')
            });
        });

        test('should display credits breakdown with multiple debtors using usernames', async () => {
            getUserCreditsByDebtor.mockResolvedValue([
                { debtorId: 'debtor1', totalAmount: '100.00', debtCount: 2 },
                { debtorId: 'debtor2', totalAmount: '50.75', debtCount: 1 }
            ]);
            pluralize.mockReturnValue('transactions');

            mockGuildMembers.fetch
                .mockResolvedValueOnce({ user: { username: 'DebtorOne' } })
                .mockResolvedValueOnce({ user: { username: 'DebtorTwo' } });

            await viewOwedCommand.execute(mockInteraction);

            expect(mockInteraction.deferReply).toHaveBeenCalled();
            expect(getUserCreditsByDebtor).toHaveBeenCalledWith('guild456', 'target123');
            expect(mockGuildMembers.fetch).toHaveBeenCalledTimes(2);
            expect(mockInteraction.editReply).toHaveBeenCalledWith({
                content: expect.stringContaining('**People who owe TargetUser:**')
            });

            const replyContent = mockInteraction.editReply.mock.calls[0][0].content;
            expect(replyContent).toContain('DebtorOne: $100.00');
            expect(replyContent).toContain('DebtorTwo: $50.75');
            expect(replyContent).toContain('**Total: $150.75**');
        });

        test('should handle debtor who left server with fallback', async () => {
            getUserCreditsByDebtor.mockResolvedValue([
                { debtorId: 'debtor1', totalAmount: '25.50', debtCount: 1 }
            ]);
            pluralize.mockReturnValue('transaction');

            mockGuildMembers.fetch.mockRejectedValue(new Error('Unknown User'));

            await viewOwedCommand.execute(mockInteraction);

            expect(mockInteraction.deferReply).toHaveBeenCalled();
            const replyContent = mockInteraction.editReply.mock.calls[0][0].content;
            expect(replyContent).toContain('User debtor1: $25.50');
        });

        test('should handle database errors', async () => {
            getUserCreditsByDebtor.mockRejectedValue(new Error('Database error'));

            await expect(viewOwedCommand.execute(mockInteraction)).rejects.toThrow('Database error');
        });
    });

    describe('Message Formatting', () => {
        test('should use public replies (not ephemeral)', async () => {
            getUserCreditsByDebtor.mockResolvedValue([]);

            await viewOwedCommand.execute(mockInteraction);

            expect(mockInteraction.deferReply).toHaveBeenCalled();
            const replyCall = mockInteraction.editReply.mock.calls[0][0];
            expect(replyCall).not.toHaveProperty('ephemeral');
        });

        test('should format individual debtor entries correctly with usernames', async () => {
            getUserCreditsByDebtor.mockResolvedValue([
                { debtorId: 'user456', totalAmount: '75.25', debtCount: 2 }
            ]);
            pluralize.mockReturnValue('transactions');

            mockGuildMembers.fetch.mockResolvedValue({ user: { username: 'SomeUser' } });

            await viewOwedCommand.execute(mockInteraction);

            expect(mockInteraction.deferReply).toHaveBeenCalled();
            const replyContent = mockInteraction.editReply.mock.calls[0][0].content;
            expect(replyContent).toContain('• SomeUser: $75.25 (from 2 transactions)');
            expect(replyContent).not.toContain('<@');
        });
    });
});
