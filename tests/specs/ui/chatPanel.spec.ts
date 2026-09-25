import { ensureTwoParticipants } from '../../helpers/participants';

describe('Blotter panel', () => {
    it('joins two participants with the permanent panel open', async () => {
        await ensureTwoParticipants();

        expect(await ctx.p1.getChatPanel().isOpen()).toBe(true);
        expect(await ctx.p2.getChatPanel().isOpen()).toBe(true);
        expect(await ctx.p1.driver.$('[aria-label="Close chat"]').isExisting()).toBe(false);
        expect(await ctx.p1.driver.$('[aria-label="Open chat"]').isExisting()).toBe(false);
        expect(await ctx.p1.driver.$('span=Blotter').isExisting()).toBe(true);

        await ctx.p1.driver.$('body').click();
        await ctx.p1.driver.keys([ 'c' ]);
        expect(await ctx.p1.getChatPanel().isOpen()).toBe(true);
    });

    it('removes nickname, smiley, and private-message controls', async () => {
        const { driver } = ctx.p1;

        expect(await driver.$('#nickname').isExisting()).toBe(false);
        expect(await driver.$('#smileys').isExisting()).toBe(false);
        expect(await driver.$('#select-chat-recipient').isExisting()).toBe(false);
        expect(await driver.$('[aria-label="Send private message"]').isExisting()).toBe(false);
        expect(await driver.$('#chat-input-messagebox').isExisting()).toBe(true);
    });

    it('keeps presentation controls visible but disabled', async () => {
        const toolbar = ctx.p1.getToolbar();

        expect(await toolbar.isButtonDisabled('Start sharing your screen')).toBe(true);
        expect(await toolbar.isButtonDisabled('Share video')).toBe(true);
    });

    it('shows sender-only controls and synchronizes ticked terminal state', async () => {
        const message = `tick-${Date.now()}`;
        const p1Blotter = ctx.p1.getChatPanel();
        const p2Blotter = ctx.p2.getChatPanel();

        await p1Blotter.sendMessage(message);
        await Promise.all([ p1Blotter.waitForMessage(message), p2Blotter.waitForMessage(message) ]);

        expect(await p1Blotter.getMessageStatus(message)).toBe('open');
        expect(await p2Blotter.getMessageStatus(message)).toBe('open');
        expect((await p1Blotter.getMessageAppearance(message)).backgroundColor).toBe('rgba(27,94,32,1)');
        expect(await p1Blotter.hasStatusControl(message, 'tick')).toBe(true);
        expect(await p1Blotter.hasStatusControl(message, 'close')).toBe(true);
        expect(await p2Blotter.hasStatusControl(message, 'tick')).toBe(false);
        expect(await p2Blotter.hasStatusControl(message, 'close')).toBe(false);

        const messageId = await (await p1Blotter.getMessage(message)).getAttribute('id');

        await ctx.p2.execute(id => {
            const conference = (APP.store.getState() as any)['features/base/conference'].conference;

            conference.sendEndpointMessage('', {
                name: 'BLOTTER_MESSAGE_STATUS',
                messageId: id,
                status: 'closed'
            });
        }, messageId);
        await ctx.p1.driver.pause(500);
        expect(await p1Blotter.getMessageStatus(message)).toBe('open');

        await p1Blotter.clickStatusControl(message, 'tick');
        await ctx.p2.driver.waitUntil(() => p2Blotter.getMessageStatus(message).then(status => status === 'ticked'));

        expect(await p1Blotter.getMessageStatus(message)).toBe('ticked');
        expect(await p1Blotter.getMessageAppearance(message)).toEqual({
            backgroundColor: 'rgba(183,28,28,1)',
            textDecoration: 'line-through'
        });
        expect(await p1Blotter.hasStatusControl(message, 'tick')).toBe(false);
        expect(await p1Blotter.hasStatusControl(message, 'close')).toBe(false);

        await ctx.p1.execute(id => APP.store.dispatch({
            type: 'SEND_BLOTTER_MESSAGE_STATUS',
            messageId: id,
            status: 'closed'
        }), messageId);
        expect(await p1Blotter.getMessageStatus(message)).toBe('ticked');
        expect(await p2Blotter.getMessageStatus(message)).toBe('ticked');
    });

    it('synchronizes closed state and filters messages to Mine', async () => {
        const p1Message = `close-${Date.now()}`;
        const p2Message = `remote-${Date.now()}`;
        const p1Blotter = ctx.p1.getChatPanel();
        const p2Blotter = ctx.p2.getChatPanel();

        await p1Blotter.sendMessage(p1Message);
        await p1Blotter.waitForMessage(p1Message);
        await p1Blotter.clickStatusControl(p1Message, 'close');
        await ctx.p2.driver.waitUntil(() => p2Blotter.getMessageStatus(p1Message).then(status => status === 'closed'));
        expect(await p2Blotter.getMessageAppearance(p1Message)).toEqual({
            backgroundColor: 'rgba(230,81,0,1)',
            textDecoration: 'line-through'
        });

        await p2Blotter.sendMessage(p2Message);
        await p1Blotter.waitForMessage(p2Message);
        await p1Blotter.selectFilter('mine');

        expect(await p1Blotter.getMessage(p1Message)).toBeTruthy();
        await expect(p1Blotter.getMessage(p2Message)).rejects.toThrow();

        await p1Blotter.selectFilter('all');
        expect(await p1Blotter.getMessage(p2Message)).toBeTruthy();
    });

    it('appends mocked press-and-hold dictation without sending', async () => {
        const { p1 } = ctx;
        const blotter = p1.getChatPanel();
        const countBefore = await blotter.getVisibleMessageCount();

        await p1.driver.execute(() => {
            class MockSpeechRecognition {
                continuous = false;
                interimResults = false;
                lang = '';
                onend?: () => void;
                onerror?: (event: { error: string; }) => void;
                onresult?: (event: any) => void;
                startCalls = 0;
                stopCalls = 0;

                abort() {
                    // No-op in the browser mock.
                }

                start() {
                    this.startCalls++;
                }

                stop() {
                    this.stopCalls++;
                    this.onend?.();
                }
            }

            (window as any).webkitSpeechRecognition = class extends MockSpeechRecognition {
                constructor() {
                    super();
                    (window as any).__blotterRecognition = this;
                }
            };
        });

        await blotter.selectFilter('mine');
        await blotter.selectFilter('all');

        await p1.driver.execute(() => {
            document.querySelector('[data-testid="blotter-dictation"]')
                ?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
            (window as any).__blotterRecognition.onresult({
                results: [ { 0: { transcript: 'dictated words' }, isFinal: false } ]
            });
        });

        expect(await p1.driver.$('#chat-input-messagebox').getValue()).toContain('dictated words');

        await p1.driver.execute(() => window.dispatchEvent(new PointerEvent('pointerup')));
        expect(await p1.execute(() => (window as any).__blotterRecognition.stopCalls)).toBe(1);
        expect(await blotter.getVisibleMessageCount()).toBe(countBefore);

        await p1.driver.execute(() => {
            document.querySelector('[data-testid="blotter-dictation"]')
                ?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
            (window as any).__blotterRecognition.onerror({ error: 'not-allowed' });
        });
        expect(await p1.driver.$('[role="alert"]').getText()).toContain('Microphone permission');
    });
});
