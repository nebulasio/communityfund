function MSApi() {
}

MSApi.prototype = {

    _call: function (method, args, callback) {
        try {
            neb.api.call({
                from: "n1JvS1LDTJRxSdq4F5cDd1x78ihHTTRyWif",
                to: contractAddress,
                value: 0,
                nonce: 0,
                gasPrice: "20000000000",
                gasLimit: "400000",
                contract: {
                    "source": "",
                    "sourceType": "js",
                    "function": method,
                    "args": JSON.stringify(args),
                    "binary": "",
                    "type": "call"
                }
            }).then(function (r) {
                if (r.execute_err && r.execute_err.length > 0) {
                    callback(null, r.error);
                } else {
                    let p = JSON.parse(r.result);
                    callback(p, null);
                }
            }).catch(function (e) {
                callback(null, e);
            });
        } catch (e) {
            callback(null, e);
        }
    },

    getSigners: function (callback) {
        this._call("getSigners", [], callback);
    },

    getConstitution: function (callback) {
        this._call("getConstitution", [], callback);
    },

    getSignerLogs: function (callback) {
        this._call("getSignerUpdateLogs", [], callback);
    },

    getConstitutionLogs: function (callback) {
        this._call("getConstitutionUpdateLogs", [], callback);
    },

    getUnFinished: function (callback) {
        this._call("getUnfinished", [], callback);
    },

    getHistoryPageIndexes: function (callback) {
        this._call("getFinishedIndexes", [], callback);
    },

    getHistory: function (pageIndex, callback) {
        this._call("getFinished", [pageIndex], callback);
    },
};
