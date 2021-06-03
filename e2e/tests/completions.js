const assert = require('chai').assert;
const path = require('path');
const createServer = require('../server-fixture');
const { openMockFile, getFirstResponseOfType } = require('./_helpers');

const mockFileName = path.join(__dirname, '..', 'project-fixture', 'main.ts');

const createServerWithMockFile = (fileContents) => {
    const server = createServer();
    openMockFile(server, mockFileName, fileContents);
    return server;
};

describe('Completions', () => {
    it('should return property value completions for single line string', () => {
        const server = createServerWithMockFile('const q = css`color:`');
        server.sendCommand('completions', { file: mockFileName, offset: 21, line: 1 });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.strictEqual(completionsResponse.body.length, 157);
            assert.isTrue(completionsResponse.body.some((item) => item.name === 'aliceblue'));
            assert.isTrue(completionsResponse.body.some((item) => item.name === 'rgba'));
        });
    });

    it('should not return SCSS functions in property value completions', () => {
        const server = createServerWithMockFile('const q = css`color:`');
        server.sendCommand('completions', { file: mockFileName, offset: 21, line: 1 });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.isFalse(completionsResponse.body.some((item) => item.name === 'darken'));
        });
    });

    it('should return property value completions for multiline string', () => {
        const server = createServerWithMockFile(['const q = css`', 'color:', '`'].join('\n'));
        server.sendCommand('completions', { file: mockFileName, offset: 22, line: 1 });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.strictEqual(completionsResponse.body.length, 157);
            assert.isTrue(completionsResponse.body.some((item) => item.name === 'aliceblue'));
        });
    });

    it('should return property value completions for nested selector', () => {
        const server = createServerWithMockFile('const q = css`position: relative; &:hover { color: }`');
        server.sendCommand('completions', { file: mockFileName, offset: 51, line: 1 });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.strictEqual(completionsResponse.body.length, 157);
            assert.isTrue(completionsResponse.body.some((item) => item.name === 'aliceblue'));
        });
    });

    it('should not return css completions on tag', () => {
        const server = createServerWithMockFile('css.``');
        server.sendCommand('completions', { file: mockFileName, offset: 5, line: 1 });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isFalse(completionsResponse.success);
            assert.strictEqual(completionsResponse.message, 'No content available.');
        });
    });

    it('should return completions when placeholder is used as property', () => {
        const server = createServerWithMockFile('css`color: ; boarder: 1px solid ${"red"};`');
        server.sendCommand('completions', { file: mockFileName, offset: 11, line: 1 });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.strictEqual(completionsResponse.body.length, 157);
            assert.isTrue(completionsResponse.body.some((item) => item.name === 'aliceblue'));
        });
    });

    it('should return completions after where placeholder is used as property', () => {
        const server = createServerWithMockFile('css`border: 1px solid ${"red"}; color:`');
        server.sendCommand('completions', { file: mockFileName, offset: 39, line: 1 });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.strictEqual(completionsResponse.body.length, 157);
            assert.isTrue(completionsResponse.body.some((item) => item.name === 'aliceblue'));
        });
    });

    it('should return completions between were placeholders are used as properties', () => {
        const server = createServerWithMockFile('css`boarder: 1px solid ${"red"}; color: ; margin: ${20}; `');
        server.sendCommand('completions', { file: mockFileName, offset: 40, line: 1 });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.strictEqual(completionsResponse.body.length, 157);
            assert.isTrue(completionsResponse.body.some((item) => item.name === 'aliceblue'));
        });
    });

    it('should return completions on tagged template string with placeholder using dotted tag', () => {
        const server = createServerWithMockFile('css.x`color: ; boarder: 1px solid ${"red"};`');
        server.sendCommand('completions', { file: mockFileName, offset: 13, line: 1 });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.strictEqual(completionsResponse.body.length, 157);
            assert.isTrue(completionsResponse.body.some((item) => item.name === 'aliceblue'));
        });
    });

    it('should return js completions inside placeholder', () => {
        const server = createServerWithMockFile('const abc = 123; css`color: ${};`');
        server.sendCommand('completions', { file: mockFileName, offset: 31, line: 1 });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.isTrue(completionsResponse.body.some((item) => item.name === 'abc'));
        });
    });

    it('should return js completions at end of placeholder', () => {
        const server = createServerWithMockFile('css`color: ${"red".};`');
        server.sendCommand('completions', { file: mockFileName, offset: 20, line: 1 });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.isTrue(completionsResponse.body.some((item) => item.name === 'substr'));
        });
    });

    it('should return styled completions inside of nested placeholder', () => {
        const server = createServerWithMockFile('styled`background: red; ${(() => css`color:`)()}`;');
        server.sendCommand('completions', { file: mockFileName, offset: 44, line: 1 });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.isTrue(completionsResponse.body.some((item) => item.name === 'aliceblue'));
        });
    });

    it('should handle multiline value placeholder correctly ', () => {
        const server = createServerWithMockFile(['css`margin: ${', '0', '}; color: `'].join('\n'));
        server.sendCommand('completions', { file: mockFileName, offset: 10, line: 3 });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.isTrue(completionsResponse.body.some((item) => item.name === 'aliceblue'));
        });
    });

    it('should handle multiline rule placeholder correctly ', () => {
        const server = createServerWithMockFile(['css`', '${', 'css`margin: 0;`', '}', 'color: `'].join('\n'));
        server.sendCommand('completions', { file: mockFileName, offset: 8, line: 5 });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.isTrue(completionsResponse.body.some((item) => item.name === 'aliceblue'));
        });
    });

    it('should return completions when placeholder is used as a selector', () => {
        const server = createServerWithMockFile(['css`${"button"} {', '   color: ;', '}', 'color: ;', '`'].join('\n'));
        server.sendCommand('completions', { file: mockFileName, line: 2, offset: 11 });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.strictEqual(completionsResponse.body.length, 157);
            assert.isTrue(completionsResponse.body.some((item) => item.name === 'aliceblue'));
        });
    });

    it('should return completions inside of nested selector xx', () => {
        const server = createServerWithMockFile(
            ['css`', '    color: red;', '    &:hover {', '        color:   ', '    }', '`'].join('\n')
        );
        server.sendCommand('completions', { file: mockFileName, line: 4, offset: 15 });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.strictEqual(completionsResponse.body.length, 157);
            assert.isTrue(completionsResponse.body.some((item) => item.name === 'aliceblue'));
        });
    });

    it('should support tag that is a function call', () => {
        const server = createServerWithMockFile('const q = css("bla")`color:`');
        server.sendCommand('completions', { file: mockFileName, offset: 28, line: 1 });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.strictEqual(completionsResponse.body.length, 157);
            assert.isTrue(completionsResponse.body.some((item) => item.name === 'aliceblue'));
            assert.isTrue(completionsResponse.body.some((item) => item.name === 'rgba'));
        });
    });

    it('should support tag that is a templated function call', async () => {
        const server = createServerWithMockFile("const q = css<number>('bla')`color:`");
        server.sendCommand('completions', { file: mockFileName, offset: 36, line: 1 });

        await server.close();
        const completionsResponse = getFirstResponseOfType('completions', server);
        assert.isTrue(completionsResponse.success);
        assert.strictEqual(completionsResponse.body.length, 157);
        assert.isTrue(completionsResponse.body.some((item) => item.name === 'aliceblue'));
        assert.isTrue(completionsResponse.body.some((item) => item.name === 'rgba'));
    });

    it('should mark color completions with "color" kindModifier', async () => {
        const server = createServerWithMockFile('const q = css`color:`');
        server.sendCommand('completions', { file: mockFileName, offset: 21, line: 1 });

        await server.close();
        const completionsResponse = getFirstResponseOfType('completions', server);
        assert.isTrue(completionsResponse.success);
        const aliceBlue = completionsResponse.body.find((item) => item.name === 'aliceblue');
        assert.isTrue(aliceBlue.kindModifiers === 'color');
    });

    it('should get completions inside keyframes blocks', async () => {
        const server = createServerWithMockFile('const q = keyframes`0% {color:`');
        server.sendCommand('completions', { file: mockFileName, offset: 31, line: 1 });

        await server.close();
        const completionsResponse = getFirstResponseOfType('completions', server);
        assert.isTrue(completionsResponse.success);
        const aliceBlue = completionsResponse.body.find((item) => item.name === 'aliceblue');
        assert.isTrue(aliceBlue.kindModifiers === 'color');
    });
});
