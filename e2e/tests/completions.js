const assert = require('chai').assert;
const createServer = require('../server-fixture');

const getFirstResponseOfType = (command, server) => {
    const response = server.responses.find(response => response.command === command);
    assert.isTrue(response !== undefined);
    return response;
}

describe('Completions', () => {
    it('should return property value completions single line string', () => {
        const server = createServer();
        server.send({ command: 'open', arguments: { file: './main.ts', fileContent: 'const q = css`color:`', scriptKindName: 'TS' } });
        server.send({ command: 'completions', arguments: { file: 'main.ts', offset: 21, line: 1, prefix: '' } });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
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
            const completionsResponse = getFirstResponseOfType('completions', server);
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
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isFalse(completionsResponse.success);
        });
    });

    it('should return completions before where placeholder is used as property', () => {
        const server = createServer();
        server.send({
            command: 'open',
            arguments: {
                file: './main.ts',
                fileContent: 'css`color: ; boarder: 1px solid ${"red"};`',
                scriptKindName: 'TS'
            }
        });
        server.send({ command: 'completions', arguments: { file: 'main.ts', offset: 11, line: 1, prefix: '' } });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.strictEqual(completionsResponse.body.length, 157);
            assert.isTrue(completionsResponse.body.some(item => item.name === 'aliceblue'));
        });
    });

    it('should return completions after where placeholder is used as property', () => {
        const server = createServer();
        server.send({
            command: 'open',
            arguments: {
                file: './main.ts',
                fileContent: 'css`boarder: 1px solid ${"red"}; color:`',
                scriptKindName: 'TS'
            }
        });
        server.send({ command: 'completions', arguments: { file: 'main.ts', offset: 40, line: 1, prefix: '' } });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.strictEqual(completionsResponse.body.length, 157);
            assert.isTrue(completionsResponse.body.some(item => item.name === 'aliceblue'));
        });
    });

    it('should return completions between were placeholders are used as properties', () => {
        const server = createServer();
        server.send({
            command: 'open',
            arguments: {
                file: './main.ts',
                fileContent: 'css`boarder: 1px solid ${"red"}; color: ; margin: ${20}; `',
                scriptKindName: 'TS'
            }
        });
        server.send({ command: 'completions', arguments: { file: 'main.ts', offset: 40, line: 1, prefix: '' } });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.strictEqual(completionsResponse.body.length, 157);
            assert.isTrue(completionsResponse.body.some(item => item.name === 'aliceblue'));
        });
    });

    it('should return js completions inside placeholder', () => {
        const server = createServer();
        server.send({
            command: 'open',
            arguments: {
                file: './main.ts',
                fileContent: 'const abc = 123; css`color: ${};`',
                scriptKindName: 'TS'
            }
        });
        server.send({ command: 'completions', arguments: { file: 'main.ts', offset: 31, line: 1, prefix: '' } });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.isTrue(completionsResponse.body.some(item => item.name === 'abc'));
        });
    });

    it('should return js completions at end of placeholder', () => {
        const server = createServer();
        server.send({
            command: 'open',
            arguments: {
                file: './main.ts',
                fileContent: 'css`color: ${"red".};`',
                scriptKindName: 'TS'
            }
        });
        server.send({ command: 'completions', arguments: { file: 'main.ts', offset: 20, line: 1, prefix: '' } });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.isTrue(completionsResponse.body.some(item => item.name === 'substr'));
        });
    });
})
