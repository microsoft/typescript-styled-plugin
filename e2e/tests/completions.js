const assert = require('chai').assert;
const createServer = require('../server-fixture');

describe('Completions', () => {
    it('should return property value completions single line string', () => {
        const server = createServer();
        server.send({ command: 'open', arguments: { file: './main.ts', fileContent: 'const q = css`color:`', scriptKindName: 'TS' } });
        server.send({ command: 'completions', arguments: { file: 'main.ts', offset: 21, line: 1, prefix: '' } });

        return server.close().then(() => {
            assert.strictEqual(server.responses.length, 3);
            const completionsResponse = server.responses[2];
            assert.isTrue(completionsResponse.success);
            assert.strictEqual(completionsResponse.body.length, 157);
            assert.isTrue(completionsResponse.body.some(item => item.name === 'aliceblue'));
        });
    });

    it('should return property value completions for multiline string', () => {
        const server = createServer();
        server.send({
            command: 'open', arguments: {
                file: './main.ts',
                fileContent: [
                    'const q = css`',
                    'color:',
                    '`'
                ].join('\n'),
                scriptKindName: 'TS'
            }
        });
        server.send({ command: 'completions', arguments: { file: 'main.ts', offset: 22, line: 1, prefix: '' } });

        return server.close().then(() => {
            assert.strictEqual(server.responses.length, 3);
            const completionsResponse = server.responses[2];
            assert.isTrue(completionsResponse.success);
            assert.strictEqual(completionsResponse.body.length, 157);
            assert.isTrue(completionsResponse.body.some(item => item.name === 'aliceblue'));
        });
    });

    it('should not return css completions on tag', () => {
        const server = createServer();
        server.send({ command: 'open', arguments: { file: './main.ts', fileContent: 'css.``', scriptKindName: 'TS' } });
        server.send({ command: 'completions', arguments: { file: 'main.ts', offset: 5, line: 1, prefix: '' } });

        return server.close().then(() => {
            assert.strictEqual(server.responses.length, 3);
            assert.isFalse(server.responses[2].success);
        });
    });

    
})
