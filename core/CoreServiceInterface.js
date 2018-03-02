const errorCodes = require('./coreServiceErrorCodes');

module.exports = class CoreServiceInterface {
    constructor(app) {
        this.app = app;
        this.supervisors = app.supervisors;
    }

    get errorCodes() {
        return errorCodes;
    }

    getSupervisorByTag(tag) {
        let supervisor = this.supervisors.filter((s) => s.config.tag === tag)[0];

        let response = {
            success: !!supervisor
        };

        if(!supervisor) {
            const errorCode = 100;
            response.error_code = errorCode;
            response.error = errorCodes[errorCode];
        }
        else
            response.result = supervisor.interface;

        return response;
    };

    getSupervisorByServerId(serverId) {
        let supervisor = this.supervisors.filter((s) => s.serverInfo ? s.serverInfo.server_id === serverId : false)[0];

        let response = {
            success: !!supervisor
        };

        if(!supervisor) {
            const errorCode = 101;
            response.error_code = errorCode;
            response.error = errorCodes[errorCode];
        }
        else
            response.result = supervisor.interface;

        return response;
    };

    getMaxPrioritySupervisor(query) {
        const minPriority = -99999999;

        let sortedSupervisors = this.supervisors.sort((a, b) =>
            (b.config.priority || minPriority) - (a.config.priority || minPriority)
        );

        let supervisor = null;

        for(let k in sortedSupervisors) {
            const s = sortedSupervisors[k];

            if(typeof(query.connected) === 'boolean') {
                if(s.interface.connected === query.connected) {
                    supervisor = s;
                    break;
                }
            }
            else {
                supervisor = s;
                break;
            }
        }

        let response = {
            success: !!supervisor
        };

        if(!supervisor) {
            const errorCode = 102;
            response.error_code = errorCode;
            response.error = errorCodes[errorCode];
        }
        else
            response.result = supervisor.interface;

        return response;
    };
};