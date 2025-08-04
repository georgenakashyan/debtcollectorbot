import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { Events, MessageFlags } from 'discord.js';
import { ObjectId } from 'mongodb';

// Mock the database functions
jest.mock('../../src/db/dbUpdates.js', () => ({
    partiallySettleTransaction: jest.fn()
}));

import { partiallySettleTransaction } from '../../src/db/dbUpdates.js';

// Import the event handler after mocking
import interactionCreateEvent from '../../src/events/interactionCreate.js';

describe('InteractionCreate Event', () => {
    let mockInteraction;
    
    beforeEach(() => {
        jest.clearAllMocks();
        
        mockInteraction = {
            user: { id: 'user123' },
            customId: 'partial_payment_507f1f77bcf86cd799439011',
            fields: {
                getTextInputValue: jest.fn()
            },
            reply: jest.fn(),
            isModalSubmit: jest.fn().mockReturnValue(true),
            isButton: jest.fn().mockReturnValue(false),
            isChatInputCommand: jest.fn().mockReturnValue(false)
        };
    });

    describe('Event Properties', () => {
        test('should have correct event name', () => {
            expect(interactionCreateEvent.name).toBe(Events.InteractionCreate);
        });

        test('should have execute function', () => {
            expect(typeof interactionCreateEvent.execute).toBe('function');
        });
    });

    describe('Partial Payment Modal Handling', () => {
        test('should truncate decimal places to 2 and process valid payment', async () => {
            // Setup
            mockInteraction.fields.getTextInputValue.mockReturnValue('10.123456');
            partiallySettleTransaction.mockResolvedValue({ amount: 5.88 });

            // Execute
            await interactionCreateEvent.execute(mockInteraction);

            // Verify truncation occurred (10.123456 -> 10.12)
            expect(partiallySettleTransaction).toHaveBeenCalledWith(
                'user123',
                new ObjectId('507f1f77bcf86cd799439011'),
                10.12
            );

            // Verify success response
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: '✅ Partial payment of $10.12 applied! Remaining: $5.88',
                flags: MessageFlags.Ephemeral
            });
        });

        test('should truncate 10.999 to 10.99 and process payment', async () => {
            // Setup
            mockInteraction.fields.getTextInputValue.mockReturnValue('10.999');
            partiallySettleTransaction.mockResolvedValue({ amount: 0 });

            // Execute
            await interactionCreateEvent.execute(mockInteraction);

            // Verify truncation occurred (10.999 -> 10.99)
            expect(partiallySettleTransaction).toHaveBeenCalledWith(
                'user123',
                new ObjectId('507f1f77bcf86cd799439011'),
                10.99
            );

            // Verify full settlement response
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: '✅ Partial payment of $10.99 applied! Transaction fully paid off!',
                flags: MessageFlags.Ephemeral
            });
        });

        test('should reject 0.001 after truncation to 0', async () => {
            // Setup
            mockInteraction.fields.getTextInputValue.mockReturnValue('0.001');

            // Execute
            await interactionCreateEvent.execute(mockInteraction);

            // Verify validation error (0.001 truncates to 0, which is invalid)
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: 'Please enter a valid positive number.',
                flags: MessageFlags.Ephemeral
            });

            // Verify database was not called
            expect(partiallySettleTransaction).not.toHaveBeenCalled();
        });

        test('should reject negative numbers after truncation', async () => {
            // Setup
            mockInteraction.fields.getTextInputValue.mockReturnValue('-5.123');

            // Execute
            await interactionCreateEvent.execute(mockInteraction);

            // Verify validation error
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: 'Please enter a valid positive number.',
                flags: MessageFlags.Ephemeral
            });

            // Verify database was not called
            expect(partiallySettleTransaction).not.toHaveBeenCalled();
        });

        test('should reject invalid text input', async () => {
            // Setup
            mockInteraction.fields.getTextInputValue.mockReturnValue('abc');

            // Execute
            await interactionCreateEvent.execute(mockInteraction);

            // Verify validation error
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: 'Please enter a valid positive number.',
                flags: MessageFlags.Ephemeral
            });

            // Verify database was not called
            expect(partiallySettleTransaction).not.toHaveBeenCalled();
        });

        test('should reject empty input', async () => {
            // Setup
            mockInteraction.fields.getTextInputValue.mockReturnValue('');

            // Execute
            await interactionCreateEvent.execute(mockInteraction);

            // Verify validation error
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: 'Please enter a valid positive number.',
                flags: MessageFlags.Ephemeral
            });

            // Verify database was not called
            expect(partiallySettleTransaction).not.toHaveBeenCalled();
        });

        test('should handle transaction not found', async () => {
            // Setup
            mockInteraction.fields.getTextInputValue.mockReturnValue('10.50');
            partiallySettleTransaction.mockResolvedValue(null);

            // Execute
            await interactionCreateEvent.execute(mockInteraction);

            // Verify error response
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: 'Transaction not found or you don\'t have permission to update it.',
                flags: MessageFlags.Ephemeral
            });
        });

        test('should handle database errors gracefully', async () => {
            // Setup
            mockInteraction.fields.getTextInputValue.mockReturnValue('10.50');
            partiallySettleTransaction.mockRejectedValue(new Error('Database error'));
            
            // Mock console.error to avoid test output noise
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            // Execute
            await interactionCreateEvent.execute(mockInteraction);

            // Verify error response
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: 'An error occurred while processing the partial payment.',
                flags: MessageFlags.Ephemeral
            });

            // Verify error was logged
            expect(consoleSpy).toHaveBeenCalledWith('Error processing partial payment:', expect.any(Error));
            
            consoleSpy.mockRestore();
        });

        test('should only handle partial payment modals', async () => {
            // Setup - different custom ID
            mockInteraction.customId = 'some_other_modal';

            // Execute
            await interactionCreateEvent.execute(mockInteraction);

            // Verify no processing occurred
            expect(partiallySettleTransaction).not.toHaveBeenCalled();
            expect(mockInteraction.reply).not.toHaveBeenCalled();
        });
    });

    describe('Non-Modal Interactions', () => {
        test('should ignore button interactions', async () => {
            // Setup
            mockInteraction.isModalSubmit.mockReturnValue(false);
            mockInteraction.isButton.mockReturnValue(true);

            // Execute
            await interactionCreateEvent.execute(mockInteraction);

            // Verify no processing occurred
            expect(partiallySettleTransaction).not.toHaveBeenCalled();
            expect(mockInteraction.reply).not.toHaveBeenCalled();
        });

        test('should handle slash commands', async () => {
            // Setup
            mockInteraction.isModalSubmit.mockReturnValue(false);
            mockInteraction.isButton.mockReturnValue(false);
            mockInteraction.isChatInputCommand.mockReturnValue(true);
            
            const mockCommand = {
                execute: jest.fn()
            };
            
            mockInteraction.client = {
                commands: {
                    get: jest.fn().mockReturnValue(mockCommand)
                }
            };
            mockInteraction.commandName = 'test-command';

            // Execute
            await interactionCreateEvent.execute(mockInteraction);

            // Verify command was executed
            expect(mockCommand.execute).toHaveBeenCalledWith(mockInteraction);
        });
    });

    describe('Decimal Truncation Edge Cases', () => {
        const testCases = [
            { input: '10.00', expected: 10, description: 'whole number with decimals' },
            { input: '10', expected: 10, description: 'whole number' },
            { input: '0.01', expected: 0.01, description: 'minimum valid amount' },
            { input: '9999.999', expected: 9999.99, description: 'large number with truncation' },
            { input: '1.005', expected: 1, description: 'truncating third decimal 1.005' },
            { input: '1.004', expected: 1, description: 'truncating third decimal 1.004' }
        ];

        testCases.forEach(({ input, expected, description }) => {
            test(`should handle ${description}: ${input} -> ${expected}`, async () => {
                // Setup
                mockInteraction.fields.getTextInputValue.mockReturnValue(input);
                partiallySettleTransaction.mockResolvedValue({ amount: 5 });

                // Execute
                await interactionCreateEvent.execute(mockInteraction);

                // Verify correct truncated value was used
                expect(partiallySettleTransaction).toHaveBeenCalledWith(
                    'user123',
                    new ObjectId('507f1f77bcf86cd799439011'),
                    expected
                );
            });
        });
    });
});