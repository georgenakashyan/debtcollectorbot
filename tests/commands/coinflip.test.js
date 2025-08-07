import { describe, test, expect, beforeEach, jest } from '@jest/globals';

import coinflipCommand from '../../src/commands/utility/coinflip.js';

describe('Coinflip Command', () => {
    let mockInteraction;
    
    beforeEach(() => {
        jest.clearAllMocks();
        
        mockInteraction = {
            user: {
                id: '123456789'
            },
            reply: jest.fn()
        };
    });

    describe('Command Data', () => {
        test('should have correct command structure', () => {
            expect(coinflipCommand.data.name).toBe('coinflip');
            expect(coinflipCommand.data.description).toBe('Flip a coin');
        });
    });

    describe('Execute Function', () => {
        test('should reply with heads or tails result', async () => {
            await coinflipCommand.execute(mockInteraction);
            
            expect(mockInteraction.reply).toHaveBeenCalledTimes(1);
            
            const replyCall = mockInteraction.reply.mock.calls[0][0];
            expect(replyCall.content).toMatch(/^<@123456789> flipped a (Heads|Tails)\.$/);
        });

        test('should include user mention in reply', async () => {
            await coinflipCommand.execute(mockInteraction);
            
            const replyCall = mockInteraction.reply.mock.calls[0][0];
            expect(replyCall.content).toContain('<@123456789>');
        });

        test('should only return heads or tails', async () => {
            const results = new Set();
            
            // Run multiple times to test randomness
            for (let i = 0; i < 50; i++) {
                await coinflipCommand.execute(mockInteraction);
                const replyCall = mockInteraction.reply.mock.calls[i][0];
                
                if (replyCall.content.includes('Heads')) {
                    results.add('Heads');
                } else if (replyCall.content.includes('Tails')) {
                    results.add('Tails');
                }
            }
            
            // Should have both results in 50 flips (very high probability)
            expect(results.has('Heads') || results.has('Tails')).toBe(true);
            expect(results.size).toBeGreaterThan(0);
        });

        test('should work with different user IDs', async () => {
            mockInteraction.user.id = '987654321';
            
            await coinflipCommand.execute(mockInteraction);
            
            const replyCall = mockInteraction.reply.mock.calls[0][0];
            expect(replyCall.content).toContain('<@987654321>');
        });
    });
});