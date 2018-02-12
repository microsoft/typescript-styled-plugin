const assert = require('chai').assert;
const createServer = require('../server-fixture');
const { openMockFile, getFirstResponseOfType } = require('./_helpers');

const mockFileName = 'main.ts';

describe('Errors', () => {
    it('should return error for unknown property', () => {
        const server = createServer();
        openMockFile(server, mockFileName, 'function css(x) { return x; }; const q = css`boarder: 1px solid black;`');
        server.send({ command: 'semanticDiagnosticsSync', arguments: { file: mockFileName } });

        return server.close().then(() => {
            const errorResponse = getFirstResponseOfType('semanticDiagnosticsSync', server);
            assert.isTrue(errorResponse.success);
            assert.strictEqual(errorResponse.body.length, 1);
            const error = errorResponse.body[0];
            assert.strictEqual(error.text, "Unknown property: 'boarder'");
            assert.strictEqual(error.start.line, 1);
            assert.strictEqual(error.start.offset, 46);
            assert.strictEqual(error.end.line, 1);
            assert.strictEqual(error.end.offset, 53);
        });
    });

    it('should not return errors for empty rulesets', () => {
        const server = createServer();
        openMockFile(server, mockFileName, 'function css(x) { return x; }; const q = css``');
        server.send({ command: 'semanticDiagnosticsSync', arguments: { file: mockFileName } });

        return server.close().then(() => {
            const errorResponse = getFirstResponseOfType('semanticDiagnosticsSync', server);
            assert.isTrue(errorResponse.success);
            assert.strictEqual(errorResponse.body.length, 0);
        });
    });

    it('should not return errors for nested rulesets', () => {
        const server = createServer();
        openMockFile(server, mockFileName, 'function css(x) { return x; }; const q = css`&:hover { border: 1px solid black; }`');
        server.send({ command: 'semanticDiagnosticsSync', arguments: { file: mockFileName } });

        return server.close().then(() => {
            const errorResponse = getFirstResponseOfType('semanticDiagnosticsSync', server);
            assert.isTrue(errorResponse.success);
            assert.strictEqual(errorResponse.body.length, 0);
        });
    });

    it('should not return an error for a placeholder in a property', () => {
        const server = createServer();
        openMockFile(server, mockFileName, 'function css(strings, ...) { return ""; }; const q = css`color: ${"red"};`')
        server.send({ command: 'semanticDiagnosticsSync', arguments: { file: mockFileName } });

        return server.close().then(() => {
            const errorResponse = getFirstResponseOfType('semanticDiagnosticsSync', server);
            assert.isTrue(errorResponse.success);
            assert.strictEqual(errorResponse.body.length, 0);
        });
    });

    it('should not return an error for a placeholder in a property with a multiline string', () => {
        const server = createServer();
        openMockFile(server, mockFileName, [
            'function css(strings, ...) { return ""; }; const q = css`',
            '    color: ${"red"};',
            '`'].join('\n'));
        server.send({ command: 'semanticDiagnosticsSync', arguments: { file: mockFileName } });

        return server.close().then(() => {
            const errorResponse = getFirstResponseOfType('semanticDiagnosticsSync', server);
            assert.isTrue(errorResponse.success);
            assert.strictEqual(errorResponse.body.length, 0);
        });
    });

    it('should return errors when error occures in last position', () => {
        const server = createServer();
        openMockFile(server, mockFileName, 'function css(strings, ...) { return ""; }; const q = css`;`')
        server.send({ command: 'semanticDiagnosticsSync', arguments: { file: mockFileName } });

        return server.close().then(() => {
            const errorResponse = getFirstResponseOfType('semanticDiagnosticsSync', server);
            assert.isTrue(errorResponse.success);
            assert.strictEqual(errorResponse.body.length, 1);
            const error = errorResponse.body[0];
            assert.strictEqual(error.text, '} expected');
            assert.strictEqual(error.start.line, 1);
            assert.strictEqual(error.start.offset, 58);
            assert.strictEqual(error.end.line, 1);
            assert.strictEqual(error.end.offset, 59);
        });
    });

    it('should return error for multiline unknown property #20', () => {
        const server = createServer();
        openMockFile(server, mockFileName, [
            'function css(x) { return x; };',
            'const q = css`',
            'boarder: 1px solid black;',
            '`'
            ].join('\n'));
        server.send({ command: 'semanticDiagnosticsSync', arguments: { file: mockFileName } });

        return server.close().then(() => {
            const errorResponse = getFirstResponseOfType('semanticDiagnosticsSync', server);
            assert.isTrue(errorResponse.success);
            assert.strictEqual(errorResponse.body.length, 1);
            const error = errorResponse.body[0];
            assert.strictEqual(error.text, "Unknown property: 'boarder'");
            assert.strictEqual(error.start.line, 3);
            assert.strictEqual(error.start.offset, 1);
            assert.strictEqual(error.end.line, 3);
            assert.strictEqual(error.end.offset, 8);
        });
    });

    it('should not error with interpolation at start, followed by semicolon #22', () => {
        const server = createServer();

        const lines = [
            "function css(...args){}",
            "const mixin = ''",

            // test single-line
            "css`${mixin}; color: blue;`",

            // test multi-line (normal case)
            "css`",
            "  ${mixin};",
            "  color: blue;",
            "`",

            // test multiple spaces after semi
            "css`",
            "  ${mixin}   ;",
            "  color: blue;",
            "`",

            // test hella semis - will this ever pop up? probably not, but screw it
            "css`",
            "  ${mixin};;; ;; ;",
            "  color: blue;",
            "`",
        ];

        openMockFile(server, mockFileName, lines.join('\n'));

        server.send({ command: 'semanticDiagnosticsSync', arguments: { file: mockFileName } });

        return server.close().then(() => {
            const errorResponse = getFirstResponseOfType('semanticDiagnosticsSync', server);
            assert.isTrue(errorResponse.success);
            assert.strictEqual(errorResponse.body.length, 0);
        });
    });

    it('should not return an error for a placeholder used as a selector (#30)', () => {
        const server = createServer();
        openMockFile(server, mockFileName, 'function css(strings, ...) { return ""; }; const q = css`${"button"} { color: red;  }`')
        server.send({ command: 'semanticDiagnosticsSync', arguments: { file: mockFileName } });

        return server.close().then(() => {
            const errorResponse = getFirstResponseOfType('semanticDiagnosticsSync', server);
            assert.isTrue(errorResponse.success);
            assert.strictEqual(errorResponse.body.length, 0);
        });
    });

    it('should not return an error for a placeholder used as a complex selector (#30)', () => {
        const server = createServer();
        openMockFile(server, mockFileName, `
        function css(strings, ...) { return ""; };
        function fullWidth() { };
        const Button = {};
        const q = css\`
            display: flex;
            \${fullWidth()};
        
            \${Button} {
            width: 100%;
            
            &:not(:first-child):not(:last-child) {
                margin-left: 0;
                margin-right: 0;
                border-radius: 0;
            }
            }
        \``)
        server.send({ command: 'semanticDiagnosticsSync', arguments: { file: mockFileName } });

        return server.close().then(() => {
            const errorResponse = getFirstResponseOfType('semanticDiagnosticsSync', server);
            assert.isTrue(errorResponse.success);
            assert.strictEqual(errorResponse.body.length, 0);
        });
    });
});
