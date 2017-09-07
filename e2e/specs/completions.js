const assert = require('assert');

function run(server) {
    server.send({ command: 'open', arguments: { file: './main.ts', fileContent: 'const q = css`.a { color:`', scriptKindName: "TS" } });
    server.send({ command: 'completions', arguments: { file: 'main.ts', offset: 26, line: 1, prefix: '' } });
    return server.close().then(() => {
        assert.equal(server.responses.length, 3);
        assert.equal(server.responses[2].body.length, 157);
        assert(server.responses[2].body.some(item => item.name === 'aliceblue'));
    });
}

module.exports = run;
