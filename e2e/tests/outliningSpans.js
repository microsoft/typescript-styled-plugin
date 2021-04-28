//@ts-check
const path = require('path');
const assert = require('chai').assert;
const createServer = require('../server-fixture');
const { openMockFile, getFirstResponseOfType } = require('./_helpers');

const mockFileName = path.join(__dirname, '..', 'project-fixture', 'main.ts');

describe('OutliningSpans', () => {
    it('should return basic css outlining spans', async () => {
        const spans = await getOutlingSpansForMockFile([
            'const q = css`',
            'a {',
            'color: red;',
            '}',
            'div {',
            '',
            '}',
            '`'
        ].join('\n'));

        assert.strictEqual(spans.length, 3);

        // The first span represents the root
        const [, span2, span3] = spans;
        assertPosition(span2.textSpan.start, 2, 1);
        assertPosition(span2.textSpan.end, 3, 1);

        assertPosition(span3.textSpan.start, 5, 1);
        assertPosition(span3.textSpan.end, 6, 1);
    });
});

function getOutlingSpansForMockFile(contents) {
    const server = createServer();
    openMockFile(server, mockFileName, contents);
    server.sendCommand('getOutliningSpans', { file: mockFileName });

    return server.close().then(() => getFirstResponseOfType('getOutliningSpans', server).body);
}

function assertPosition(pos, line, offset) {
    assert.strictEqual(pos.line, line);
    assert.strictEqual(pos.offset, offset);
}