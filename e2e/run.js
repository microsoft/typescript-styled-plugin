const createServer = require('./server-fixture');
const path = require('path');
const glob = require('glob');

function run() {
    const files = glob.sync('specs/*.js', {
        cwd: __dirname,
    });
    const specs = files.reduce((queue, file) => {
        return queue.then(() => {
            let spec;
            try {
                spec = require(path.join(__dirname, file));
            } catch (e) {
                console.error(`${file} is not server spec...`);
                return Promise.reject(e);
            }
            const server = createServer();
            return spec(server).then(() => server.close());
        });
    }, Promise.resolve(null));
    specs.then(() => {
        console.log(`🌟  ${files.length} specs were passed.`);
    }).catch(reason => {
        console.log('😢  some specs were failed...');
        console.error(reason);
        process.exit(1);
    });
}

run();
