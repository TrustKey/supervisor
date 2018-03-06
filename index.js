"use strict";
const crypto = require('crypto');

const path = require('path');
const architect = require("architect");

const configPath = path.join(__dirname, "config.js");
const config = architect.loadConfig(configPath);

const repl = require('repl').start();
let replContext = repl.context;

architect.createApp(config, function (err, app) {
    if(err) {
        console.error("Can't run the application: problem with modules");
        return console.error(err);
    }

    global.services = app.services;
    replContext.__proto__ = services;
    replContext.services = services;

    if(!app.services.core)
        return console.error("No core module service");
});