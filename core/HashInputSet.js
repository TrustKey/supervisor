const crypto = require('crypto');

class HashInputEntry {
    constructor(hash, input) {
        this.hash = hash || null;
        this.input = input || null;
    }
}

module.exports = class HashInputSet { //Todo: replace with multi index structure instead of list
    constructor() {
        this.summary = {
            has_hash_duplication: false,
            has_input_collision: false,
            has_hash_list_miss: false,
            n_unresolved_hashes: 0,
            observed_hash_list: [],
            observed_input_list: [],
            trustkey: null,
            inputs: null
        };

        this.records = [];
    }

    findRecordByDigest(digestHex) {
        return this.records.filter(x => x.hash === digestHex)[0];
    }

    tryPostHash(digestHex) {
        this.summary.observed_hash_list.push(digestHex);

        digestHex = digestHex.toUpperCase();

        let foundRecord = this.findRecordByDigest(digestHex);
        if (foundRecord) {
            this.summary.has_hash_duplication = true;
            return false;
        }

        this.records.push(new HashInputEntry(digestHex, null));

        return true;
    }

    tryPostInput(inputBytes) {
        this.summary.observed_input_list.push(inputBytes);

        const inputHash = crypto.createHash('sha512').update(inputBytes).digest('hex').toUpperCase();

        let foundRecord = this.findRecordByDigest(inputHash);
        if (!foundRecord) {
            this.summary.has_hash_list_miss = true;
            return false;
        }

        if(foundRecord.input) {
            this.summary.has_input_collision = true;
            return false;
        }

        foundRecord.input = inputBytes;
        return true;
    }

    analyze(supervisorInputBytes, serverTrustkey) {
        const supervisorInputHash = crypto.createHash('sha512').update(supervisorInputBytes).digest('hex').toUpperCase();

        this.summary.has_supervisor_input_miss = true;
        this.summary.n_unresolved_hashes = 0;
        let inputs = new Buffer(0);
        this.records.forEach((r) => {
            if(!r.input) {
                ++this.summary.n_unresolved_hashes;
                return;
            }

            if(r.hash === supervisorInputHash)
                this.summary.has_supervisor_input_miss = false;

            inputs = Buffer.concat([inputs, r.input])
        });

        serverTrustkey = serverTrustkey.toUpperCase();
        const trustkey = crypto.createHash('sha512').update(inputs).digest('hex').toUpperCase();

        this.summary.wrong_trustkey = serverTrustkey !== trustkey;

        this.summary.is_trusted = !this.summary.has_supervisor_input_miss &&
            !this.summary.has_hash_duplication &&
            !this.summary.has_input_collision &&
            !this.summary.has_hash_list_miss &&
            !this.summary.has_hash_duplication &&
            !this.summary.wrong_trustkey;

        if(this.summary.is_trusted) {
            this.summary.inputs = inputs;
            this.summary.trustkey = trustkey;
        }

        return this.summary;
    }
};