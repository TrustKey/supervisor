#!/usr/bin/env node

const config = require('./config');
const TKServerSupervisor = require('./TKServerSupervisor');
const MongoClient = require('mongodb').MongoClient;
const Server = require('mongodb').Server;
const DefaultInputGenerator = require('./DefautInputGenerator').InputGenerator;

var path = require('path');
var architect = require("architect");

var configPath = path.join(__dirname, "mconfig.js");
var c = architect.loadConfig(configPath);

architect.createApp(c, function (err, app) {
    app.services.database.get("tim", function (res) {
       console.log(JSON.stringify(res));
    });

    console.log(JSON.stringify(app));
    if (err) throw err;
    console.log("app ready");
});

/*
const c = require('./coroutines');

const app = {
    config: config,
    inputGenerator: new DefaultInputGenerator()
};

const supervisors = app.supervisors = [

];

c.bootstrap(() => {
    c.waitCallback((resolve, reject) => {
        MongoClient.connect(new Server(
            config.mongoDb.server.host,
            config.mongoDb.server.port,
            config.mongoDb.server.options || {},
        ), function(err, client) {
            if(err)
                return reject(err);

            console.log("Connected successfully to MongoDb server");
            app.db = client.db(config.mongoDb.database);
            resolve();
        });
    });

    supervisors.push(new TKServerSupervisor(app, config.servers[0]));

    supervisors.forEach((server) => {
        if(server.config.supervise_constantly)
            server.startSupervisor();
    })
});

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
});

*/