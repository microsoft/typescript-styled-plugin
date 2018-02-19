const assert = require('chai').assert;
const createServer = require('../server-fixture');
const { openMockFile, getFirstResponseOfType } = require('./_helpers');

const mockFileName = 'main.ts';

describe('Emmet Completions', () => {
    it('shouldnt return emmet property completions when disabled', () => {
        const server = createServer();
        openMockFile(server, mockFileName, 'const q = css`m10-20`');
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 21, line: 1 } });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.body.every(item => item.name !== 'margin: 10px 20px;'));
        });
    });

    it('should return emmet property completions for single line string', () => {
        const server = createServer('emmet-project-fixture');
        openMockFile(server, mockFileName, 'const q = css`m10-20`');
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 21, line: 1 } });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.body.some(item => item.name === 'margin: 10px 20px;'));
        });
    });


    it('should return emmet property completions for multiline string', () => {
        const server = createServer('emmet-project-fixture');
        openMockFile(server, mockFileName, [
            'const q = css`',
            'm10-20',
            '`'
        ].join('\n'));
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 7, line: 2 } });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.body.some(item => item.name === 'margin: 10px 20px;'));
        });
    });

    it('should return emmet property completions for nested selector', () => {
        const server = createServer('emmet-project-fixture');
        openMockFile(server, mockFileName, 'const q = css`position: relative; &:hover { m10-20 }`');
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 51, line: 1 } });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.body.some(item => item.name === 'margin: 10px 20px;'));
        });
    });

    it('should return emmet completions when placeholder is used as property', () => {
        const server = createServer('emmet-project-fixture');
        openMockFile(server, mockFileName, 'css`m10-20 ; boarder: 1px solid ${"red"};`');
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 11, line: 1 } });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.body.some(item => item.name === 'margin: 10px 20px;'));
        });
    });

    it('should return emmet completions after where placeholder is used as property', () => {
        const server = createServer('emmet-project-fixture');
        openMockFile(server, mockFileName, 'css`border: 1px solid ${"red"}; m10-20`');
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 39, line: 1 } });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.body.some(item => item.name === 'margin: 10px 20px;'));
        });
    });

    it('should return emmet completions between were placeholders are used as properties', () => {
        const server = createServer('emmet-project-fixture');
        openMockFile(server, mockFileName, 'css`boarder: 1px solid ${"red"}; color: #12; margin: ${20}; `')
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 44, line: 1 } });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.body.some(item => item.name === '#121212'));
        });
    });

    it('should return emmet completions on tagged template string with placeholder using dotted tag', () => {
        const server = createServer('emmet-project-fixture');
        openMockFile(server, mockFileName, 'css.x`color: #12 ; boarder: 1px solid ${"red"};`');
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 17, line: 1 } });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.success);
            assert.isTrue(completionsResponse.body.some(item => item.name === '#121212'));
        });
    });

    it('should return styled emmet completions inside of nested placeholder', () => {
        const server = createServer('emmet-project-fixture');
        openMockFile(server, mockFileName, 'styled`background: red; ${(() => css`color: #12`)()}`;');
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 48, line: 1 } });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.body.some(item => item.name === '#121212')); 
        });
    });

    it('should handle emmet completions in multiline value placeholder correctly ', () => {
        const server = createServer('emmet-project-fixture');
        openMockFile(server, mockFileName, [
            'css`margin: ${',
            '0',
            "}; color: #12`"].join('\n'));
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 14, line: 3 } });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.body.some(item => item.name === '#121212'));
        });
    });

    it('should handle emmet completions in multiline rule placeholder correctly ', () => {
        const server = createServer('emmet-project-fixture');
        openMockFile(server, mockFileName, [
            'css`',
            '${',
            'css`margin: 0;`',
            '}',
            'color: #12`'].join('\n'));
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 11, line: 5 } });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.body.some(item => item.name === '#121212'));
        });
    });

    it('should return emmet completions inside of nested selector xx', () => {
        const server = createServer('emmet-project-fixture');
        openMockFile(server, mockFileName, [
            'css`',
            '    color: red;',
            '    &:hover {',
            '        color: #12  ',
            '    }',
            '`'].join('\n'));
        server.send({ command: 'completions', arguments: { file: mockFileName, line: 4, offset: 19 } });

        return server.close().then(() => {
            const completionsResponse = getFirstResponseOfType('completions', server);
            assert.isTrue(completionsResponse.body.some(item => item.name === '#121212')); 
        });
    });
})
