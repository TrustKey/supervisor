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

/*
while(true) {
    var bytes = crypto.randomBytes(config.nBytes);
    var hex = Buffer.from(bytes).toString('hex');
    var hash = crypto.createHash('sha512').update(bytes).digest('hex');
    var digest = hash

    var lastChar = digest[0];

    for (var i = 0; i < digest.length; i++) {
        ++stat[digest.charAt(i)];
    }

    console.log(lastChar);
}

request({
    url: config.endpoint + '/current/hashes',
    method: "POST",
    json: {sha512hash: digest}
}, function (err, resp, body) {
    if(err)
        return console.error(err);

    setTimeout(function () {
        request({
            url: config.endpoint + '/current/inputs',
            method: "POST",
            body: bytes
        }, function (err, resp, body) {
            if(err)
                return console.error(err);

            console.log(body);
        });
    }, 15*1000)

    console.log(body);
});*/