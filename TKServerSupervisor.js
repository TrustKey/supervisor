var WebSocketClient = require('websocket').client;
var EventEmitter = require('events').EventEmitter;
var crypto = require('crypto');

module.exports = function(app, config) {
    const client = new WebSocketClient();
    const appConfig = app.config;
    const events = new EventEmitter;

    var self = this;

    this.config = config;
    this.currentTKHashList = [];
    this.nextTKHashList = [];
    this.currentDigest = null;
    this.hasHashListMiss = false;
    this.currentSupervisorInput = null;
    this.nextSupervisorInput = null;
    this.isSupervisorInputReceived = false;
    this.connection = null;
    this.serverInfo = null;
    this.receivedInputList = [];
    this.checkedInputs = null;
    this.currentTrustKeyTs = -1;

    this.currentRound = 0;
    const trustedRound = 2; //Round after connect to begin TK server supervising

    events.on('server_info', (data) => {
        this.serverInfo = data;
    });

    events.on('round_sync', (data) => {
        this.currentTrustKeyTs = data.current_trustkey_ts;
        this.checkedInputs = new Buffer(0);
        this.hasHashListMiss = false;
        this.currentTKHashList = this.nextTKHashList;
        this.nextTKHashList = [];
        this.receivedInputList = [];

        this.isSupervisorInputReceived = false;
        this.currentSupervisorInput = this.nextSupervisorInput;
        this.nextSupervisorInput =
            app.inputGenerator.generateInput(this.serverInfo.config.input_length);

        if(this.connection.connected) {
            this.connection.sendUTF(JSON.stringify({
                type: "post_hash",
                sha512_hash: crypto.createHash('sha512')
                    .update(this.nextSupervisorInput)
                    .digest('hex')
            }));

            if (this.currentSupervisorInput) {
                this.connection.sendUTF(JSON.stringify({
                    type: "post_b64input",
                    b64input: this.currentSupervisorInput.toString('base64')
                }));
            }
        }

        this.currentDigest = crypto.createHash('sha512');
    });

    events.on('input', (data) => {
        //if()
        //    return;

        const inputBytes = new Buffer(data.input_base64, 'base64');

        if(this.currentSupervisorInput && inputBytes.equals(this.currentSupervisorInput))
            this.isSupervisorInputReceived = true;

        const inputHash = crypto.createHash('sha512').update(inputBytes).digest('hex').toUpperCase();

        const findRes = this.currentTKHashList.filter((hashHex) => {
            return inputHash === hashHex;
        })[0];

        this.receivedInputList.push(data.input_base64);

        if(findRes) {
            this.currentDigest.update(inputBytes);

            if(!this.checkedInputs)
                this.checkedInputs = inputBytes;
            else
                this.checkedInputs = Buffer.concat([this.checkedInputs, inputBytes]);
        }
        else
            this.hasHashListMiss = true;

        //console.log({input_hash: inputHash, b64: data.input_base64})
    });

    events.on('hash', (data) => {
        this.nextTKHashList.push(data.hash);
    });

    events.on('trust_key', (data) => {
        //if(this.currentRound++ <= trustedRound)
        //    return;

        const observedTrustKey = this.currentDigest.digest('hex').toUpperCase();

        const summary = {
            ts: this.currentTrustKeyTs,
            is_trusted: this.isSupervisorInputReceived &&
                        (data.sha_512_hex === observedTrustKey) &&
                        !this.hasHashListMiss,
            is_supervisor_input_received: this.isSupervisorInputReceived,
            has_hash_list_miss: this.hasHashListMiss,
            server_trustkey: data.sha_512_hex,
            observed_trustkey: observedTrustKey,
            hashes: this.currentTKHashList,
            received_input_list: this.receivedInputList,
            checked_inputs: this.checkedInputs
        };


        app.db.collection(this.serverInfo.server_id).insertOne(summary, function (err, res) {
            console.log(err);
        });

        console.error(summary);
    });

    const connect = () => {
        this.currentRound = 0;
        this.wasInputError = false;
        client.connect(config.websocket_endpoint + '?q=server_info|round_sync|hashes|inputs|trust_keys|messages');
    };

    client.on('connectFailed', (error)  => {
        if(self.config.supervise_constantly)
            setTimeout(() => {
                connect();
            }, appConfig.reconnect_timeout);

        console.log('Connect Error: ' + error.toString());
    });

    client.on('connect', function(connection) {
        self.connection = connection;

        connection.on('error', function(error) {
            console.error(error);
        });

        connection.on('close', function() {
            setTimeout(() => {
                connect();
            }, appConfig.reconnect_timeout);
        });

        connection.on('message', function(message) {
            console.log(message.utf8Data);
            const data = JSON.parse(message.utf8Data);
            events.emit(data.type, data);
        });
    });

    this.startSupervisor = () => {
        connect();
    }
};