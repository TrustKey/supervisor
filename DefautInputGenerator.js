const crypto = require('crypto');

module.exports = {
    InputGenerator: function() {
        this.generateInput = (length) => {
            return crypto.randomBytes(length);
        }
    }
};