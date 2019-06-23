function VoteDataValidator() {
}

VoteDataValidator.prototype = {
    _verifyAddresses: function () {
        for (let i = 0; i < arguments.length; ++i) {
            if (!NebAccount.isValidAddress(arguments[i])) {
                throw (arguments[i] + " is not a valid nas address.");
            }
        }
    },

    _getFloat: function (n) {
        if (n == null || typeof n === "undefined") {
            throw (n + " is not a valid number.");
        }
        n = "" + n;
        if (!/^\-?\d+(\.\d+)?$/.test(n)) {
            throw (n + " is not a valid number.");
        }
        return parseFloat(n);
    },

    _getInt: function (n) {
        if (n == null || typeof n === "undefined") {
            throw (n + " is not a valid integer.");
        }
        n = "" + n;
        if (!/^\-?\d+$/.test(n)) {
            throw (n + " is not a valid integer.");
        }
        return parseInt(n);
    },

    _verifyProportions: function () {
        for (let i = 0; i < arguments.length; ++i) {
            let p = this._getFloat(arguments[i]);
            if (p <= 0 || p > 1) {
                throw ("Proportion error");
            }
        }
    },

    _verifyCondition: function (condition) {
        if (!condition) {
            throw "Condition error.";
        }
        if ((typeof condition.proportion) != 'undefined' && (typeof condition.min) != 'undefined') {
            throw "Condition error.";
        }
        if ((typeof condition.proportion) != 'undefined') {
            this._verifyProportions(condition.proportion);
        } else {
            this._getInt(condition.min);
        }
    },

    _verifyAction: function (action) {
        switch (action.name) {
            case "transfer":
                let detail = action.detail;
                if (!detail || detail.length === 0) {
                    throw "Transfer action data error."
                }
                for (let i = 0; i < detail.length; ++i) {
                    this._verifyAddresses(detail[i].to);
                    this._getFloat(detail[i].value);
                }
                break;
            default:
                throw "Action '" + action + "' is not supported.";
        }
    },

    verifyAddSignerData: function (content) {
        this._verifyAddresses(content.address);
    },

    verifyRemoveSignerData: function (content) {
        this._verifyAddresses(content.address);
    },

    verifyReplaceSignerData: function (content) {
        this._verifyAddresses(content.oldAddress, content.newAddress);
        if (content.oldAddress === content.newAddress) {
            throw "Data error.";
        }
    },

    verifyUpdateConstitutionData: function (content) {
        this._getInt(content.version);
        let cs = content.approvalConditions;
        this._verifyCondition(cs.updateConstitution);
        this._verifyCondition(cs.addSigner);
        this._verifyCondition(cs.removeSigner);
        this._verifyCondition(cs.replaceSigner);
        let ts = cs.transfer;
        if (!ts || ts.length === 0 || ts[0].startValue !== "0") {
            throw "Transfer condition error.";
        }
        let prevEnd = null;
        for (let i = 0; i < ts.length; ++i) {
            let t = ts[i];
            this._getFloat(t.startValue);
            if (i < ts.length - 1) {
                this._getFloat(t.endValue);
            } else {
                if (t.endValue !== "INFINITY") {
                    throw "Transfer condition error.";
                }
            }
            if (i > 0 && t.startValue !== prevEnd) {
                throw "Transfer condition error.";
            }
            prevEnd = t.endValue;
            this._verifyCondition(t.condition);
        }
    },

    verifyTransferData: function (data) {
        let action = data.action;
        if (action == null || action.name !== this.ACTION_TRANSFER) {
            throw "Action error.";
        }
        this._verifyAction(action);
    },
};
