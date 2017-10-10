const { fork } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

class TSServer {
    constructor() {
        const logfile = path.join(__dirname, 'log.txt');
        const tsserverPath = path.join(__dirname, '..', 'node_modules', 'typescript', 'lib', 'tsserver');
        const server = fork(tsserverPath, [
            '--logVerbosity', 'verbose',
            '--logFile', logfile
        ], {
                cwd: path.join(__dirname, '..', 'project-fixture'),
                stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
            });
        this._exitPromise = new Promise((resolve, reject) => {
            server.on('exit', code => resolve(code));
            server.on('error', reason => reject(reason));
        });
        server.stdout.setEncoding('utf-8');
        readline.createInterface({
            input: server.stdout
        }).on('line', line => {
            if (line[0] === '{') {
                this.responses.push(JSON.parse(line));
            }
        })

        this._isClosed = false;
        this._server = server;
        this._seq = 0;
        this.responses = [];
    }

    send(command) {
        const seq = ++this._seq;
        const req = JSON.stringify(Object.assign({ seq: seq, type: 'request' }, command)) + '\n';
        this._server.stdin.write(req);
    }

    close() {
        if (!this._isClosed) {
            this._isClosed = true;
            this._server.stdin.end();
        }
        return this._exitPromise;
    }
}

function createServer() {
    return new TSServer();
}

module.exports = createServer;
