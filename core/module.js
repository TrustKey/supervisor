const TKServerSupervisor = require('./TKServerSupervisor');
const MongoClient = require('mongodb').MongoClient;
const Server = require('mongodb').Server;
const c = require('./coroutines');
const EventEmitter = require('events').EventEmitter;
const CoreServiceInterface = require('./CoreServiceInterface');

module.exports = function setup(options, imports, register) {
    console.log("core module setup");

    const app = {
        rng: imports.rng,
        config: options
    };

    const supervisors = app.supervisors = [ ];

    c.bootstrap(() => {
        c.waitCallback((resolve, reject) => {
            MongoClient.connect(new Server(
                options.mongoDb.server.host,
                options.mongoDb.server.port,
                options.mongoDb.server.options || {},
            ), function(err, client) {
                if(err)
                    return reject(err);

                console.log("Connected successfully to MongoDb server");
                app.db = client.db(options.mongoDb.database);
                resolve();
            });
        });

        options.servers.forEach((server) => {
            c.waitCallback((resolve, reject) =>
                app.db.collection(server.server_id + "_trustkeys").ensureIndex({"ts": 1}, {"unique": true},
                    (err, res) => err ? reject(err) : resolve())
            );

            supervisors.push(new TKServerSupervisor(app, server));
        });

        supervisors.forEach((server) => {
            if(server.config.supervise_constantly)
                server.startSupervisor();
        })
    });

    const serviceInterface = {
        initEvents: new EventEmitter(),
        globalEvents: new EventEmitter(),
        
    };

    register(null, {
        core: new CoreServiceInterface(app)
    });
};