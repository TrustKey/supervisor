module.exports = {
    servers: [
        {
            websocket_endpoint: 'ws://127.0.0.1:4002',
            tag: 'main',
            priority: 100,
            supervise_constantly: true
        }
    ],
    reconnect_timeout: 1 * 1000,
    console: {
        enabled: true,

    },
    mongoDb: {
        server: {
            host: "127.0.0.1",
            port: 27017,
            //https://mongodb.github.io/node-mongodb-native/api-generated/server.html
            options: { }
        },
        database: "trustkey"
    }
};