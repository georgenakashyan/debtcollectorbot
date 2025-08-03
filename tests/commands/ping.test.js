import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { MessageFlags } from 'discord.js';

// Import the command
import pingCommand from '../../src/commands/utility/ping.js';

describe('Ping Command', () => {
    let mockInteraction;
    
    beforeEach(() => {
        jest.clearAllMocks();
        
        mockInteraction = {
            reply: jest.fn()
        };
    });

    describe('Command Data', () => {
        test('should have correct command structure', () => {
            expect(pingCommand.data.name).toBe('ping');
            expect(pingCommand.data.description).toBe('Replies with Pong!');
        });
    });

    describe('Execute Function', () => {
        test('should reply with Pong!', async () => {
            await pingCommand.execute(mockInteraction);
            
            expect(mockInteraction.reply).toHaveBeenCalledWith({
                content: 'Pong!',
                flags: MessageFlags.Ephemeral
            });
        });

        test('should reply with ephemeral flag', async () => {
            await pingCommand.execute(mockInteraction);
            
            const replyCall = mockInteraction.reply.mock.calls[0][0];
            expect(replyCall.flags).toBe(MessageFlags.Ephemeral);
        });
    });
});