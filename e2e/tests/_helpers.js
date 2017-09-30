exports.openMockFile = (server, mockFileName, fileContent) => {
    server.send({
        command: 'open',
        arguments: {
            file: mockFileName,
            fileContent,
            scriptKindName: 'TS'
        }
    });
    return server;
};
