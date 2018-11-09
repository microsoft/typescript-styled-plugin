// @ts-check
const assert = require('chai').assert;
const path = require('path');
const createServer = require('../server-fixture');
const { openMockFile, getFirstResponseOfType } = require('./_helpers');

const createMockFileForServer = (fileContents, project) => {
    project = project || 'project-fixture'
    const server = createServer(project);
    const mockFileName = path.join(__dirname, '..', project, 'main.ts');
    openMockFile(server, mockFileName, fileContents);
    return { server, mockFileName };
}

describe('Emmet Completions', () => {
    it('shouldnt return emmet property completions when disabled', async () => {
        const { server, mockFileName } = createMockFileForServer(
            'const q = css`m10-20`', 'disabled-emmet-project-fixture');
        server.sendCommand('completions', { file: mockFileName, offset: 21, line: 1 });

        await server.close();
        const completionsResponse = getFirstResponseOfType('completions', server);
        assert.isTrue(completionsResponse.body.every(item => item.name !== 'margin: 10px 20px;'));
    });

    it('should return emmet property completions for single line string', async () => {
        const { server, mockFileName } = createMockFileForServer('const q = css`m10-20`');
        server.sendCommand('completions', { file: mockFileName, offset: 21, line: 1 });

        await server.close();
        const completionsResponse = getFirstResponseOfType('completions', server);
        assert.isTrue(completionsResponse.body.some(item => item.name === 'margin: 10px 20px;'));
    });

    it('should return emmet property completions for multiline string', async () => {
        const { server, mockFileName } = createMockFileForServer([
            'const q = css`',
            'm10-20',
            '`'
        ].join('\n'));
        server.sendCommand('completions', { file: mockFileName, offset: 7, line: 2 });

        await server.close();
        const completionsResponse = getFirstResponseOfType('completions', server);
        assert.isTrue(completionsResponse.body.some(item => item.name === 'margin: 10px 20px;'));
    });

    it('should return emmet property completions for nested selector', async () => {
        const { server, mockFileName } = createMockFileForServer(
            'const q = css`position: relative; &:hover { m10-20 }`');

        server.sendCommand('completions', { file: mockFileName, offset: 51, line: 1 });

        await server.close();
        const completionsResponse = getFirstResponseOfType('completions', server);
        assert.isTrue(completionsResponse.body.some(item => item.name === 'margin: 10px 20px;'));
    });

    it('should return emmet completions when placeholder is used as property', async () => {
        const { server, mockFileName } = createMockFileForServer('css`m10-20 ; boarder: 1px solid ${"red"};`');
        server.sendCommand('completions', { file: mockFileName, offset: 11, line: 1 });

        await server.close();
        const completionsResponse = getFirstResponseOfType('completions', server);
        assert.isTrue(completionsResponse.body.some(item => item.name === 'margin: 10px 20px;'));
    });

    it('should return emmet completions after where placeholder is used as property', async () => {
        const { server, mockFileName } = createMockFileForServer('css`border: 1px solid ${"red"}; m10-20`');
        server.sendCommand('completions', { file: mockFileName, offset: 39, line: 1 });

        await server.close();
        const completionsResponse = getFirstResponseOfType('completions', server);
        assert.isTrue(completionsResponse.body.some(item => item.name === 'margin: 10px 20px;'));
    });

    it('should return emmet completions between were placeholders are used as properties', async () => {
        const { server, mockFileName } = createMockFileForServer('css`boarder: 1px solid ${"red"}; color: #12; margin: ${20}; `')
        server.sendCommand('completions', { file: mockFileName, offset: 44, line: 1 });

        await server.close();
        const completionsResponse = getFirstResponseOfType('completions', server);
        assert.isTrue(completionsResponse.body.some(item => item.name === '#121212'));
    });

    it('should return emmet completions on tagged template string with placeholder using dotted tag', async () => {
        const { server, mockFileName } = createMockFileForServer('css.x`color: #12 ; boarder: 1px solid ${"red"};`');
        server.sendCommand('completions', { file: mockFileName, offset: 17, line: 1 });

        await server.close();
        const completionsResponse = getFirstResponseOfType('completions', server);
        assert.isTrue(completionsResponse.success);
        assert.isTrue(completionsResponse.body.some(item => item.name === '#121212'));
    });

    it('should return styled emmet completions inside of nested placeholder', async () => {
        const { server, mockFileName } = createMockFileForServer('styled`background: red; ${(() => css`color: #12`)()}`;');
        server.sendCommand('completions', { file: mockFileName, offset: 48, line: 1 });

        await server.close();
        const completionsResponse = getFirstResponseOfType('completions', server);
        assert.isTrue(completionsResponse.body.some(item => item.name === '#121212'));
    });

    it('should handle emmet completions in multiline value placeholder correctly ', async () => {
        const { server, mockFileName } = createMockFileForServer([
            'css`margin: ${',
            '0',
            "}; color: #12`"].join('\n'));
        server.sendCommand('completions', { file: mockFileName, offset: 14, line: 3 });

        await server.close();
        const completionsResponse = getFirstResponseOfType('completions', server);
        assert.isTrue(completionsResponse.body.some(item => item.name === '#121212'));
    });

    it('should handle emmet completions in multiline rule placeholder correctly ', async () => {
        const { server, mockFileName } = createMockFileForServer([
            'css`',
            '${',
            'css`margin: 0;`',
            '}',
            'color: #12`'].join('\n'));
        server.sendCommand('completions', { file: mockFileName, offset: 11, line: 5 });

        await server.close();
        const completionsResponse = getFirstResponseOfType('completions', server);
        assert.isTrue(completionsResponse.body.some(item => item.name === '#121212'));
    });

    it('should return emmet completions inside of nested selector xx', async () => {
        const { server, mockFileName } = createMockFileForServer([
            'css`',
            '    color: red;',
            '    &:hover {',
            '        color: #12  ',
            '    }',
            '`'].join('\n'));
        server.sendCommand('completions', { file: mockFileName, line: 4, offset: 19 });

        await server.close();
        const completionsResponse = getFirstResponseOfType('completions', server);
        assert.isTrue(completionsResponse.body.some(item => item.name === '#121212'));
    });
});
