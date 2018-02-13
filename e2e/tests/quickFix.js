// @ts-check

const assert = require('chai').assert;
const createServer = require('../server-fixture');
const { openMockFile, getFirstResponseOfType, getResponsesOfType } = require('./_helpers');

const mockFileName = 'main.ts';

describe('QuickFix', () => {
    it('should return quickFix for misspelled properties fooa', () => {
        const server = createServer();
        openMockFile(server, mockFileName, 'const q = css`boarder: 1px solid black;`');
        server.send({
            command: 'getCodeFixes',
            arguments: {
                file: mockFileName,
                startLine: 1,
                startOffset: 16,
                endLine: 1,
                endOffset: 16,
                errorCodes: [9999]
            }
        });

        return server.close().then(() => {
            const response = getFirstResponseOfType('getCodeFixes', server);
            assert.isTrue(response.success);
            assert.strictEqual(response.body.length, 3);
            assert.isOk(response.body.find(fix => fix.description === 'Rename to \'border\''));
        });
    });

    it('should not return quickFixes for correctly spelled properties', () => {
        const server = createServer();
        openMockFile(server, mockFileName, 'const q = css`border: 1px solid black;`');
        server.send({
            command: 'getCodeFixes',
            arguments: {
                file: mockFileName,
                startLine: 1,
                startOffset: 16,
                endLine: 1,
                endOffset: 16,
                errorCodes: [9999]
            }
        });

        return server.close().then(() => {
            const response = getFirstResponseOfType('getCodeFixes', server);
            assert.isTrue(response.success);
            assert.strictEqual(response.body.length, 0);
        });
    });

    it('should only return spelling quickFix when range includes misspelled property', () => {
        const server = createServer();
        openMockFile(server, mockFileName, 'const q = css`boarder: 1px solid black;`');
        server.send({
            command: 'getCodeFixes',
            arguments: {
                file: mockFileName,
                startLine: 1,
                startOffset: 14,
                endLine: 1,
                endOffset: 14,
                errorCodes: [9999]
            }
        });

        server.send({
            command: 'getCodeFixes',
            arguments: {
                file: mockFileName,
                startLine: 1,
                startOffset: 22,
                endLine: 1,
                endOffset: 22,
                errorCodes: [9999]
            }
        });

        return server.close().then(() => {
            const responses = getResponsesOfType('getCodeFixes', server);
            assert.strictEqual(responses.length, 2);
            {
                const response = responses[0]
                assert.isTrue(response.success);
                assert.strictEqual(response.body.length, 0);
            }
            {
                const response = responses[1]
                assert.isTrue(response.success);
                assert.strictEqual(response.body.length, 0);
            }
        });
    });
});
