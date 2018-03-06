const WebSocketClient = require('websocket').client;
const EventEmitter = require('events').EventEmitter;
const crypto = require('crypto');
const CoreServiceSupervisorInterface = require('./CoreServiceSupervisorInterface');
const HashInputSet = require('./HashInputSet');

module.exports = class TKServerSupervisor {
    constructor(app, config) {
        this.app = app;
        this.client = new WebSocketClient();
        this.appConfig = app.config;
        this.events = new EventEmitter;

        this.interface = new CoreServiceSupervisorInterface(this);
        this.config = config;
        this.currentHashInputSet = new HashInputSet();
        this.nextHashInputSet = new HashInputSet();
        this.currentDigest = null;
        this.currentSupervisorInput = null;
        this.nextSupervisorInput = null;
        this.connection = null;
        this.serverInfo = null;
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

            this.currentHashInputSet = this.nextHashInputSet;
            this.nextHashInputSet = new HashInputSet();

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
            this.currentHashInputSet.tryPostInput(inputBytes);
        });

        this.events.on('hash', (data) => {
            this.nextHashInputSet.tryPostHash(data.hash);
        });

        this.events.on('trust_key', (data) => {
            ++this.currentRound;

            if(this.currentRound <= trustedRound)
                return; //We need to observe two more full rounds to be able to draw conclusions

            const hashInputSetSummary = this.currentHashInputSet.analyze(this.currentSupervisorInput, data.sha512_hex);

            let summary = hashInputSetSummary;
            summary.ts = this.currentTrustKeyTs;
            //Todo server's command order analysis

            this.trustkeysCollection.insertOne(summary, function (err, res) {
                if(err)
                    throw err;
            });
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

            console.log('Connect Error: ' + error.toString());
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