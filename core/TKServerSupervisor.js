const WebSocketClient = require('websocket').client;
const EventEmitter = require('events').EventEmitter;
const crypto = require('crypto');
const CoreServiceSupervisorInterface = require('./CoreServiceSupervisorInterface');

module.exports = class TKServerSupervisor {
    constructor(app, config) {
        this.app = app;
        this.client = new WebSocketClient();
        this.appConfig = app.config;
        this.events = new EventEmitter;

        this.interface = new CoreServiceSupervisorInterface(this);
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

        this.currentRound = 0; //Round id after connect
        const trustedRound = 2; //Round after connect to begin TK server supervising

        this.events.on('server_info', (data) => {
            if(data.server_id !==  config.server_id)
                throw "Fatal error: received server id differs from specified in configuration file one";

            this.serverInfo = data;
        });

        this.events.on('round_sync', (data) => {
            this.currentTrustKeyTs = data.current_trustkey_ts;
            this.checkedInputs = new Buffer(0);
            this.hasHashListMiss = false;
            this.currentTKHashList = this.nextTKHashList;
            this.nextTKHashList = [];
            this.receivedInputList = [];

            this.isSupervisorInputReceived = false;
            this.currentSupervisorInput = this.nextSupervisorInput;
            this.nextSupervisorInput =
                app.rng.generate(this.serverInfo.config.input_length);

            if(this.connection && this.connection.connected) {
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

        this.events.on('input', (data) => {
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

        this.events.on('hash', (data) => {
            this.nextTKHashList.push(data.hash);
        });

        this.events.on('trust_key', (data) => {
            ++this.currentRound;

            if(this.currentRound <= trustedRound)
                return; //We need to wait for two full rounds before be able to draw conclusions

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

            this.trustkeysCollection.insertOne(summary, function (err, res) {
            });
            //console.error(summary);
        });

        const connect = () => {
            this.currentRound = 0;
            this.wasInputError = false;
            this.client.connect(config.websocket_endpoint + '?q=server_info|round_sync|hashes|inputs|trust_keys|messages');
        };

        this.client.on('connectFailed', (error)  => {
            if(this.config.supervise_constantly)
                setTimeout(() => {
                    connect();
                }, this.appConfig.reconnect_timeout);

            //console.log('Connect Error: ' + error.toString());
        });

        this.client.on('connect', (connection) => {
            this.connection = connection;

            connection.on('error', (error) => {
                //console.error(error);
            });

            connection.on('close', () => {
                setTimeout(() => {
                    connect();
                }, this.appConfig.reconnect_timeout);
            });

            connection.on('message', (message) => {
                const data = JSON.parse(message.utf8Data);
                this.events.emit(data.type, data);
            });
        });

        this.startSupervisor = () => {
            connect();
        }
    }

    get trustkeysCollection() {
        return this.app.db.collection(this.config.server_id + "_trustkeys");
    };
};