module.exports = class CoreServiceSupervisorInterface {
    constructor (supervisor) {
        this.supervisor = supervisor;
        this.config = supervisor.config;
    }

    get serverInfo() { //May return `undefined` if wasn't connected even once
        return this.supervisor.serverInfo;
    }

    get connected() {
        return this.supervisor.connection && this.supervisor.connection.connected;
    }

    get serverInfo() {
        return this.supervisor.serverInfo;
    }

    get roundTime() {
        return this.serverInfo.config.round_time;
    }

    get trustkeysCollection() {
        return this.supervisor.trustkeysCollection;
    }
};