import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { MessageFlags } from 'discord.js';

// Mock the database functions
jest.mock('../../src/db/dbUpdates.js', () => ({
    addTransaction: jest.fn()
}));

jest.mock('../../src/utils/utils.js', () => ({
    formatNumber: jest.fn()
}));

import { addTransaction } from '../../src/db/dbUpdates.js';
import { formatNumber } from '../../src/utils/utils.js';

// Import the command after mocking
import addDebtCommand from '../../src/commands/utility/add-debt.js';

describe('Add Debt Command', () => {
    let mockInteraction;
    
    beforeEach(() => {
        jest.clearAllMocks();
        
        mockInteraction = {
            user: { id: 'user123' },
            guild: { id: 'guild456' },
            options: {
                getUser: jest.fn().mockReturnValue({ id: 'debtor789' }),
                getNumber: jest.fn().mockReturnValue(50.00),
                getString: jest.fn().mockReturnValue('Lunch money')
            },
            reply: jest.fn()
        };
        
        formatNumber.mockImplementation(num => num);
    });

    describe('Command Data', () => {
        test('should have correct command structure', () => {
            expect(addDebtCommand.data.name).toBe('add-debt');
            expect(addDebtCommand.data.description).toBe('Add a debt that someone owes you');
        });
    });

    describe('Execute Function', () => {
        test('should reject self-debt', async () => {
            mockInteraction.options.getUser.mockReturnValue({ id: 'user123' });
            
            await addDebtCommand.execute(mockInteraction);
            
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: "You can't owe yourself money!",
                flags: MessageFlags.Ephemeral
            });
            expect(addTransaction).not.toHaveBeenCalled();
        });

        test('should successfully add debt transaction', async () => {
            addTransaction.mockResolvedValue();
            
            await addDebtCommand.execute(mockInteraction);
            
            expect(addTransaction).toHaveBeenCalledWith(
                'guild456',
                'user123',
                'debtor789',
                50.00,
                'Lunch money'
            );
            
            expect(mockInteraction.reply).toHaveBeenCalledWith(
                '<@debtor789> now owes <@user123> $50 for "Lunch money"'
            );
        });

        test('should format amount using formatNumber utility', async () => {
            formatNumber.mockReturnValue(25.50);
            mockInteraction.options.getNumber.mockReturnValue(25.5);
            addTransaction.mockResolvedValue();
            
            await addDebtCommand.execute(mockInteraction);
            
            expect(formatNumber).toHaveBeenCalledWith(25.5);
            expect(addTransaction).toHaveBeenCalledWith(
                'guild456',
                'user123',
                'debtor789',
                25.50,
                'Lunch money'
            );
        });

        test('should handle database errors', async () => {
            addTransaction.mockRejectedValue(new Error('Database error'));
            
            await expect(addDebtCommand.execute(mockInteraction)).rejects.toThrow('Database error');
        });
    });

    describe('Option Validation', () => {
        test('should extract correct options from interaction', async () => {
            addTransaction.mockResolvedValue();
            
            await addDebtCommand.execute(mockInteraction);
            
            expect(mockInteraction.options.getUser).toHaveBeenCalledWith('debtor');
            expect(mockInteraction.options.getNumber).toHaveBeenCalledWith('amount');
            expect(mockInteraction.options.getString).toHaveBeenCalledWith('description');
        });
    });
});