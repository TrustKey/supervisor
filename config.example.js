module.exports = [
    "./node_modules/@trustkey/crypto-rng",
    {
        packagePath: "./core",
        servers: [
            {
                server_id: "D000000000000000",
                websocket_endpoint: 'ws://127.0.0.1:4002',
                tag: 'local',
                priority: 5,
                supervise_constantly: true
            }
            /*,{
                server_id: "D000000000000001",
                websocket_endpoint: 'ws://159.65.26.3:4002',
                tag: 'remote',
                priority: 1000,
                supervise_constantly: true
            }
            /**/
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
    },
    "./plugins/algorithms",
    "./plugins/trustkey_argon2d",
    "./plugins/trustkey_first_perfect",
    "./plugins/tk-promise",
    //"./plugins/tk-http-server",
    //"./plugins/calculator",
];