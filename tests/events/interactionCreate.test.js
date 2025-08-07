import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { Events, MessageFlags } from 'discord.js';

// Import the event handler
import interactionCreateEvent from '../../src/events/interactionCreate.js';

describe('InteractionCreate Event', () => {
    let mockInteraction;
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Event Properties', () => {
        test('should have correct event name', () => {
            expect(interactionCreateEvent.name).toBe(Events.InteractionCreate);
        });

        test('should have execute function', () => {
            expect(typeof interactionCreateEvent.execute).toBe('function');
        });
    });

    describe('Interaction Routing', () => {
        test('should handle slash commands', async () => {
            // Setup
            const mockCommand = {
                execute: jest.fn().mockResolvedValue()
            };
            
            mockInteraction = {
                isModalSubmit: () => false,
                isButton: () => false,
                isChatInputCommand: () => true,
                commandName: 'test-command',
                client: {
                    commands: {
                        get: jest.fn().mockReturnValue(mockCommand)
                    }
                }
            };

            // Execute
            await interactionCreateEvent.execute(mockInteraction);

            // Verify command was executed
            expect(mockCommand.execute).toHaveBeenCalledWith(mockInteraction);
        });

        test('should handle missing commands gracefully', async () => {
            // Setup
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            
            mockInteraction = {
                isModalSubmit: () => false,
                isButton: () => false,
                isChatInputCommand: () => true,
                commandName: 'nonexistent-command',
                client: {
                    commands: {
                        get: jest.fn().mockReturnValue(null)
                    }
                }
            };

            // Execute
            await interactionCreateEvent.execute(mockInteraction);

            // Verify error was logged
            expect(consoleSpy).toHaveBeenCalledWith('No command matching nonexistent-command was found.');
            
            consoleSpy.mockRestore();
        });

        test('should handle command execution errors gracefully', async () => {
            // Setup
            const mockCommand = {
                execute: jest.fn().mockRejectedValue(new Error('Command error'))
            };
            
            mockInteraction = {
                isModalSubmit: () => false,
                isButton: () => false,
                isChatInputCommand: () => true,
                commandName: 'error-command',
                replied: false,
                deferred: false,
                client: {
                    commands: {
                        get: jest.fn().mockReturnValue(mockCommand)
                    }
                },
                reply: jest.fn().mockResolvedValue()
            };

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            // Execute
            await interactionCreateEvent.execute(mockInteraction);

            // Verify error response
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: 'There was an error while executing this command!',
                flags: MessageFlags.Ephemeral
            });

            consoleSpy.mockRestore();
        });

        test('should ignore button interactions', async () => {
            // Setup
            mockInteraction = {
                isModalSubmit: () => false,
                isButton: () => true,
                isChatInputCommand: () => false
            };

            // Execute (should return early without error)
            await interactionCreateEvent.execute(mockInteraction);

            // No assertions needed - test passes if no error is thrown
        });

        test('should skip non-command interactions', async () => {
            // Setup
            mockInteraction = {
                isModalSubmit: () => false,
                isButton: () => false,
                isChatInputCommand: () => false
            };

            // Execute (should return early)
            await interactionCreateEvent.execute(mockInteraction);

            // No assertions needed - test passes if no error is thrown
        });
    });
});