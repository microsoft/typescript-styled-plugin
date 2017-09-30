const assert = require('chai').assert;
const createServer = require('../server-fixture');

const mockFileName = 'main.ts';

const openMockFile = (server, fileContent) => {
    server.send({
        command: 'open',
        arguments: {
            file: mockFileName,
            fileContent,
            scriptKindName: 'TS'
        }
    });
    return server;
};


const getFirstResponseOfType = (command, server) => {
    const response = server.responses.find(response => response.command === command);
    assert.isTrue(response !== undefined);
    return response;
};


describe('Completions', () => {
    it('should return property value completions single line string', () => {
        const server = createServer();
        openMockFile(server, 'const q = css`color:`');
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 21, line: 1, prefix: '' } });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.strictEqual(completionsResponse.body.length, 157);
            assert.isTrue(completionsResponse.body.some(item => item.name === 'aliceblue'));
        });
    });

    it('should return property value completions for multiline string', () => {
        const server = createServer();
        openMockFile(server, [
            'const q = css`',
            'color:',
            '`'
        ].join('\n'));
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 22, line: 1, prefix: '' } });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.strictEqual(completionsResponse.body.length, 157);
            assert.isTrue(completionsResponse.body.some(item => item.name === 'aliceblue'));
        });
    });

    it('should not return css completions on tag', () => {
        const server = createServer();
        openMockFile(server, 'css.``');
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 5, line: 1, prefix: '' } });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isFalse(completionsResponse.success);
        });
    });

    it('should return completions before where placeholder is used as property', () => {
        const server = createServer();
        openMockFile(server, 'css`color: ; boarder: 1px solid ${"red"};`');
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 11, line: 1, prefix: '' } });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.strictEqual(completionsResponse.body.length, 157);
            assert.isTrue(completionsResponse.body.some(item => item.name === 'aliceblue'));
        });
    });

    it('should return completions after where placeholder is used as property', () => {
        const server = createServer();
        openMockFile(server, 'css`boarder: 1px solid ${"red"}; color:`');
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 40, line: 1, prefix: '' } });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.strictEqual(completionsResponse.body.length, 157);
            assert.isTrue(completionsResponse.body.some(item => item.name === 'aliceblue'));
        });
    });

    it('should return completions between were placeholders are used as properties', () => {
        const server = createServer();
        openMockFile(server, 'css`boarder: 1px solid ${"red"}; color: ; margin: ${20}; `')
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 40, line: 1, prefix: '' } });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.strictEqual(completionsResponse.body.length, 157);
            assert.isTrue(completionsResponse.body.some(item => item.name === 'aliceblue'));
        });
    });

    it('should return completions on tagged template string with placeholder using dotted tag', () => {
        const server = createServer();
        openMockFile(server, 'css.x`color: ; boarder: 1px solid ${"red"};`');
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 13, line: 1, prefix: '' } });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.strictEqual(completionsResponse.body.length, 157);
            assert.isTrue(completionsResponse.body.some(item => item.name === 'aliceblue'));
        });
    });

    it('should return js completions inside placeholder', () => {
        const server = createServer();
        openMockFile(server, 'const abc = 123; css`color: ${};`')
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 31, line: 1, prefix: '' } });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.isTrue(completionsResponse.body.some(item => item.name === 'abc'));
        });
    });

    it('should return js completions at end of placeholder', () => {
        const server = createServer();
        openMockFile(server, 'css`color: ${"red".};`');
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 20, line: 1, prefix: '' } });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.isTrue(completionsResponse.body.some(item => item.name === 'substr'));
        });
    });

    it('should return stylde completions inside of nested placeholder', () => {
        const server = createServer();
        openMockFile(server, 'styled`background: red; ${(() => css`color:`)()}`;');
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 44, line: 1, prefix: '' } });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.isTrue(completionsResponse.body.some(item => item.name === 'aliceblue'));
        });
    });
})
