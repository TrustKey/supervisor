var path = require('path');
var architect = require("architect");

var configPath = path.join(__dirname, "config.js");
var config = architect.loadConfig(configPath);

architect.createApp(config, function (err, app) {
    if(err) {
        console.error("Can't run the application: problem with modules");
        return console.error(err);
    }

    global.services = app.services;

    if(!app.services.core)
        return console.error("No core module service");
});