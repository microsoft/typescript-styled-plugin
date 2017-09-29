const assert = require('chai').assert;
const createServer = require('../server-fixture');

describe('Completeions', () => {
    it('should return color name completions', () => {
        const server = createServer();
        server.send({ command: 'open', arguments: { file: './main.ts', fileContent: 'const q = css`color:`', scriptKindName: "TS" } });
        server.send({ command: 'completions', arguments: { file: 'main.ts', offset: 21, line: 1, prefix: '' } });

        return server.close().then(() => {
            assert.equal(server.responses.length, 3);
            assert.equal(server.responses[2].body.length, 157);
            assert.isTrue(server.responses[2].body.some(item => item.name === 'aliceblue'));
        });
    });

    it('should not return css completions on tag', () => {
        const server = createServer();
        server.send({ command: 'open', arguments: { file: './main.ts', fileContent: 'css.``', scriptKindName: "TS" } });
        server.send({ command: 'completions', arguments: { file: 'main.ts', offset: 5, line: 1, prefix: '' } });

        return server.close().then(() => {
            console.log(server.responses[2]);
            assert.equal(server.responses.length, 3);
            assert.isFalse(server.responses[2].body.some(item => item.name === '-moz-animation'));
        });
    });
})
