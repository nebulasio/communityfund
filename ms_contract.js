"use strict";

// TODO: 本地测试使用 require1， 发布时使用 require。
let crypto = require1("crypto.js");


function PageList(storage, key) {
    this._storage = storage;
    this._key = key;
    this._pageIndexes = null;
    this._pageSize = 100;
}

PageList.prototype = {

    _indexesKey: function () {
        return "pis_" + this._key;
    },

    _dataKey: function (index) {
        return "pd_" + this._key + "_" + index;
    },

    _lastIndex: function () {
        let indexes = this.getPageIndexes();
        if (indexes.length > 0) {
            return indexes[indexes.length - 1];
        }
        return null;
    },

    _addIndex: function (index) {
        this.getPageIndexes().push(index);
        this._saveIndexes();
    },

    _saveIndexes: function () {
        this._storage.put(this._indexesKey(), this.getPageIndexes());
    },

    // [{i:0, l:0}]
    getPageIndexes: function () {
        if (!this._pageIndexes) {
            this._pageIndexes = this._storage.get(this._indexesKey());
        }
        if (!this._pageIndexes) {
            this._pageIndexes = [];
        }
        return this._pageIndexes;
    },

    getPageData: function (index) {
        let r = this._storage.get(this._dataKey(index));
        if (!r) {
            r = [];
        }
        return r;
    },

    add: function (obj) {
        let index = this._lastIndex();
        let i = 0;
        if (index) {
            i = index.i;
            if (index.l >= this._pageSize) {
                i += 1;
                index = null;
            }
        }
        if (!index) {
            index = {i: i, l: 0};
            this._addIndex(index);
        }
        let d = this.getPageData(index.i);
        d.push(obj);
        index.l += 1;
        this._saveIndexes();
        this._storage.put(this._dataKey(index.i), d);
    }
};


let Base = {
    VALUE_YES: 1,
    VALUE_NO: 2,

    UNIT: new BigNumber("1000000000000000000"),
    INFINITY: "INFINITY",

    TYPE_UPDATE_CONSTITUTION: "update-constitution",
    TYPE_ADD_SIGNER: "add-signer",
    TYPE_REMOVE_SIGNER: "remove-signer",
    TYPE_REPLACE_SIGNER: "replace-signer",
    TYPE_TRANSFER: "transfer",

    ACTION_TRANSFER: "transfer",

    _verifyAddresses: function () {
        for (let i = 0; i < arguments.length; ++i) {
            if (0 === Blockchain.verifyAddress(arguments[i])) {
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

    _serialize: function (o) {
        if (o == null || typeof o === "undefined") {
            return "";
        }
        let r = "";
        if (typeof o === "object") {
            if (o.constructor === Array) {
                for (let i = 0; i < o.length; ++i) {
                    r += this._serialize(o[i]);
                }
            } else {
                let keys = Object.keys(o).sort();
                for (let i = 0; i < keys.length; ++i) {
                    r += keys[i] + this._serialize(o[keys[i]]);
                }
            }
        } else {
            r += o;
        }
        return r;
    },

    _hashFromData: function (data) {
        return crypto.sha3256(this._serialize(data));
    }
};


function DataManager(storage) {
    this._storage = storage;

    this._keyDatas = "datas";
    this._keyUnfinishedDatas = "datas_unfinished";
    this._keyDataPrefix = "data_";
    this._keyVoteResultPrefix = "vote_result_";

    this._keySigners = "signers";
    this._keyConstitution = "constitution";

    this._keyLogsPrefix = "logs_";
    this._keySignerLogs = this._keyLogsPrefix + "signer";
    this._keyConstitutionLogs = this._keyLogsPrefix + "constitution";
}

DataManager.prototype = Object.assign({

    _dataKey: function (hash) {
        return this._keyDataPrefix + hash;
    },

    _voteResultKey: function (hash) {
        return this._keyVoteResultPrefix + hash;
    },

    _dataList: function () {
        if (!this._list) {
            this._list = new PageList(this._storage, this._keyDatas);
        }
        return this._list;
    },

    _addData: function (hash) {
        this.unfinishedDatas().push(hash);
        this._storage.put(this._keyUnfinishedDatas, this.unfinishedDatas());
    },

    _addLogs: function (logKey, name, log, hash) {
        let logs = this._storage.get(logKey);
        if (!logs) {
            logs = [];
        }
        let r = {hash: hash, blockHeight: Blockchain.block.height};
        r[name] = log;
        logs.push(r);
        this._storage.put(logKey, logs);
    },

    _getLogs: function (logKey) {
        let logs = this._storage.get(logKey);
        for (let i = 0; i < logs.length; ++i) {
            let log = logs[i];
            if (log.hash) {
                log.voteData = this.getData(log.hash);
                log.voteResult = this.voteResult(log.hash);
            }
        }
        return logs;
    },

    updateSigners: function (signers, name, hash) {
        let old = Array.from(this.getSigners());
        this._signers = signers;
        this._addLogs(this._keySignerLogs, name, {old: old, new: signers}, hash);
        this._storage.put(this._keySigners, signers);
    },

    getSigners: function () {
        if (!this._signers) {
            this._signers = this._storage.get(this._keySigners);
        }
        if (!this._signers) {
            this._signers = [];
        }
        return Array.from(this._signers);
    },

    updateConstitution: function (constitution, name, hash) {
        let old = this.getConstitution();
        this.constitution = constitution;
        this._addLogs(this._keyConstitutionLogs, name, {old: old, new: constitution}, hash);
        this._storage.put(this._keyConstitution, constitution);
    },

    getConstitution: function () {
        if (!this._constitution) {
            this._constitution = this._storage.get(this._keyConstitution);
        }
        if (!this._constitution) {
            this._constitution = null;
        }
        return this._constitution;
    },

    getSignerLogs: function () {
        return this._getLogs(this._keySignerLogs);
    },

    getConstitutionUpdateLogs: function () {
        return this._getLogs(this._keyConstitutionLogs);
    },

    addData: function (data) {
        let hash = this._hashFromData(data);
        this._storage.put(this._dataKey(hash), data);
        this._addData(hash);
    },

    moveToFinished: function (hash) {
        let u = this.unfinishedDatas();
        let i = u.indexOf(hash);
        if (i < 0) {
            throw "data " + hash + " not found.";
        }
        u.splice(i, 1);
        this._storage.put(this._keyUnfinishedDatas, u);
        this._dataList().add(hash);
    },

    getData: function (hash) {
        return this._storage.get(this._dataKey(hash));
    },

    containsData: function (data) {
        let hash = this._hashFromData(data);
        return this._storage.get(this._dataKey(hash)) != null;
    },

    dataIndexes: function () {
        return this._dataList().getPageIndexes();
    },

    datas: function (index) {
        return this._dataList().getPageData(index);
    },

    unfinishedDatas: function () {
        if (!this._unfinishedDatas) {
            this._unfinishedDatas = this._storage.get(this._keyUnfinishedDatas);
        }
        if (!this._unfinishedDatas) {
            this._unfinishedDatas = [];
        }
        return this._unfinishedDatas;
    },

    saveVoteResult: function (hash, result) {
        this._storage.put(this._voteResultKey(hash), result);
    },

    voteResult: function (hash) {
        let r = this._storage.get(this._voteResultKey(hash));
        if (!r) {
            r = {signers: [], completed: false, approved: false};
        }
        return r;
    },
}, Base);


function SignerManager(dataManager) {
    this._dm = dataManager;
}

SignerManager.prototype = Object.assign({

    _verifyDeleteSigner: function (signer) {
        if (this._dm.getSigners().indexOf(signer) < 0) {
            throw (signer + " could not be found.");
        }
    },

    _verifyAddSigner: function (signer) {
        if (this._dm.getSigners().indexOf(signer) >= 0) {
            throw (signer + " is already a manager.");
        }
    },

    add: function (signer, hash) {
        this._verifyAddSigner(signer);
        let signers = this._dm.getSigners();
        signers.push(signer);
        this._dm.updateSigners(signers, "addSigner", hash);
    },

    remove: function (signer, hash) {
        this._verifyDeleteSigner(signer);
        let signers = this._dm.getSigners();
        let i = signers.indexOf(signer);
        signers.splice(i, 1);
        this._dm.updateSigners(signers, "removeSigner", hash);
    },

    replace: function (oldSigner, newSigner, hash) {
        this._verifyDeleteSigner(oldSigner);
        this._verifyAddSigner(newSigner);
        let signers = this._dm.getSigners();
        let i = signers.indexOf(oldSigner);
        signers.splice(i, 1, newSigner);
        this._dm.updateSigners(signers, "replaceSigner", hash);
    }
}, Base);


function DataValidator(signerManager, dataManager) {
    this._sm = signerManager;
    this._dm = dataManager;
}

DataValidator.prototype = Object.assign({

    _parseCommand: function (cmd) {
        let s = this._serialize(cmd.data);
        let hash = crypto.sha3256(s + cmd.value);
        cmd.hash = crypto.sha3256(s);
        cmd.value = this._getInt(cmd.value);
        cmd.signer = crypto.recoverAddress(1, hash, cmd.sig);
    },

    _containsSigner: function (result, signer) {
        for (let i = 0; i < result.signers.length; ++i) {
            if (result.signers[i].address === signer) {
                return true;
            }
        }
        return false;
    },

    _verifySig: function (cmd) {
        this._verifyAddresses(cmd.signer);
        if (this._dm.getSigners().indexOf(cmd.signer) < 0) {
            throw ("Sig error.");
        }
        let r = this._dm.voteResult(cmd.hash);
        if (this._containsSigner(r, cmd.signer)) {
            throw "hash '" + cmd.hash + "' has voted.";
        }
    },

    _verifyAddSignerData: function (content) {
        this._verifyAddresses(content.address);
        this._sm._verifyAddSigner(content.address);
    },

    _verifyRemoveSignerData: function (content) {
        this._verifyAddresses(content.address);
        this._sm._verifyDeleteSigner(content.address);
    },

    _verifyReplaceSignerData: function (content) {
        this._verifyAddresses(content.oldAddress, content.newAddress);
        this._sm._verifyDeleteSigner(content.oldAddress);
        this._sm._verifyAddSigner(content.newAddress);
        if (content.oldAddress === content.newAddress) {
            throw "Data error.";
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

    _verifyUpdateConstitutionData: function (content) {
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
                if (t.endValue !== this.INFINITY) {
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

    _verifyTransferData: function (data) {
        let action = data.action;
        if (action == null || action.name !== this.ACTION_TRANSFER) {
            throw "Action error.";
        }
        this._verifyAction(action);
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

    _verifyData: function (cmd) {
        if ([this.VALUE_YES, this.VALUE_NO].indexOf(cmd.value) < 0) {
            throw "Vote value error.";
        }
        let data = cmd.data;
        switch (data.type) {
            case this.TYPE_UPDATE_CONSTITUTION:
                this._verifyUpdateConstitutionData(data.content);
                let c = this._dm.getConstitution();
                if (parseInt(c.version) >= parseInt(data.content.version)) {
                    throw "Constitution version error.";
                }
                break;
            case this.TYPE_ADD_SIGNER:
                this._verifyAddSignerData(data.content);
                break;
            case this.TYPE_REMOVE_SIGNER:
                this._verifyRemoveSignerData(data.content);
                break;
            case this.TYPE_REPLACE_SIGNER:
                this._verifyReplaceSignerData(data.content);
                break;
            case this.TYPE_TRANSFER:
                this._verifyTransferData(data);
                break;
            default:
                throw "Type " + data.type + " is not supported.";
        }
        if (data.action) {
            this._verifyAction(data.action);
        }
    },

    verify: function (cmd) {
        this._parseCommand(cmd);
        this._verifySig(cmd);
        this._verifyData(cmd);
    }
}, Base);


function VoteManager(signerManager, dataManager, dataValidator) {
    this._sm = signerManager;
    this._dm = dataManager;
    this._dv = dataValidator;
}

VoteManager.prototype = Object.assign({

    _containsSigner: function (result, signer) {
        for (let i = 0; i < result.signers.length; ++i) {
            if (result.signers[i].address === signer) {
                return true;
            }
        }
        return false;
    },

    _amount: function (transferDta) {
        let r = new BigNumber(0);
        let ds = transferDta.action.detail;
        for (let i = 0; i < ds.length; ++i) {
            let d = ds[i];
            r = r.plus(new BigNumber(d.value));
        }
        return r;
    },

    _getTransferCondition: function (amount, conditions) {
        for (let i = 0; i < conditions.length; ++i) {
            let c = conditions[i];
            let start = new BigNumber(c.startValue);
            let end = new BigNumber("1000000000000");
            if (c.endValue !== this.INFINITY) {
                end = new BigNumber(c.endValue);
            }
            if (amount.gt(start) && end.gte(amount)) {
                return c.condition;
            }
        }
        return null;
    },

    _numberOfCondition: function (c) {
        let total = this._dm.getSigners().length;
        let r = 0;
        if (c.proportion) {
            r = Math.ceil(parseFloat(c.proportion) * total);
        } else {
            let min = parseInt(c.min);
            if (min > 0) {
                r = min;
            } else {
                r = total + parseInt(c.min);
            }
        }
        if (r <= 0) {
            r = 1;
        }
        if (r > total) {
            r = total;
        }
        return r;
    },

    _numberOfVotesRequired: function (data) {
        let cs = this._dm.getConstitution().approvalConditions;
        let r = null;
        switch (data.type) {
            case this.TYPE_UPDATE_CONSTITUTION:
                r = this._numberOfCondition(cs.updateConstitution);
                break;
            case this.TYPE_ADD_SIGNER:
                r = this._numberOfCondition(cs.addSigner);
                break;
            case this.TYPE_REMOVE_SIGNER:
                r = this._numberOfCondition(cs.removeSigner);
                break;
            case this.TYPE_REPLACE_SIGNER:
                r = this._numberOfCondition(cs.replaceSigner);
                break;
            case this.TYPE_TRANSFER:
                let amount = this._amount(data);
                let condition = this._getTransferCondition(amount, cs.transfer);
                r = this._numberOfCondition(condition);
                break;
            default:
                break;
        }
        if (!r) {
            throw "Data error.";
        }
        return r;
    },

    _yesCount: function (result) {
        let c = 0;
        for (let i = 0; i < result.signers.length; ++i) {
            if (result.signers[i].value === this.VALUE_YES) {
                c++;
            }
        }
        return c;
    },

    _otherCount: function (result) {
        let c = 0;
        for (let i = 0; i < result.signers.length; ++i) {
            if (result.signers[i].value !== this.VALUE_YES) {
                c++;
            }
        }
        return c;
    },

    _checkAndSetVoteResult: function (data, result) {
        let total = this._dm.getSigners().length;
        let needs = this._numberOfVotesRequired(data);
        let yesCount = this._yesCount(result);
        let otherCount = this._otherCount(result);

        if (total - otherCount < needs) {
            result.completed = true;
        } else if (yesCount >= needs) {
            result.completed = true;
            result.approved = true;
        }
    },

    _execVoteAction: function (cmd) {
        let data = cmd.data;
        switch (data.type) {
            case this.TYPE_UPDATE_CONSTITUTION:
                this._dm.updateConstitution(data.content, "updateConstitution", cmd.hash);
                return;
            case this.TYPE_ADD_SIGNER:
                this._sm.add(data.content.address, cmd.hash);
                return;
            case this.TYPE_REMOVE_SIGNER:
                this._sm.remove(data.content.address, cmd.hash);
                return;
            case this.TYPE_REPLACE_SIGNER:
                this._sm.replace(data.content.oldAddress, data.content.newAddress, cmd.hash);
                return;
            default:
                break;
        }

        let action = data.action;
        if (!action) {
            return;
        }
        switch (action.name) {
            case this.ACTION_TRANSFER:
                for (let i = 0; i < action.detail.length; ++i) {
                    let t = action.detail[i];
                    let r = Blockchain.transfer(t.to, new BigNumber(t.value).mul(this.UNIT));
                    if (!r) {
                        throw "Transfer failed.";
                    }
                }
                break;
            default:
                break;
        }
    },

    vote: function (cmd) {
        this._dv.verify(cmd);
        if (!this._dm.containsData(cmd.data)) {
            this._dm.addData(cmd.data);
        }
        let r = this._dm.voteResult(cmd.hash);
        if (r.completed) {
            throw "Voting has been completed";
        }
        r.signers.push({address: cmd.signer, value: cmd.value});
        this._checkAndSetVoteResult(cmd.data, r);
        if (r.completed) {
            if (r.approved) {
                this._execVoteAction(cmd);
            }
            this._dm.moveToFinished(cmd.hash);
        }
        this._dm.saveVoteResult(cmd.hash, r);
        return cmd.hash;
    },
}, Base);


function MultiSign() {
    this._contractName = "MultiSign";
    LocalContractStorage.defineMapProperty(this, "storage", null);

    this._dm = new DataManager(this.storage);
    let sm = new SignerManager(this._dm);
    this._dv = new DataValidator(sm, this._dm);
    this._vm = new VoteManager(sm, this._dm, this._dv);
}

MultiSign.prototype = Object.assign({

    init: function (constitution, signers) {
        this._dv._verifyUpdateConstitutionData(constitution);
        this._dm.updateConstitution(constitution, "initConstitution", null);
        for (let i = 0; i < signers.length; ++i) {
            this._verifyAddresses(signers[i]);
        }
        this._dm.updateSigners(signers, "initSigners", null);
    },

    _getVoteResult: function (hash) {
        return {
            data: this._dm.getData(hash),
            result: this._dm.voteResult(hash)
        }
    },

    vote: function () {
        if (arguments.length === 0) {
            throw "arguments error.";
        }
        let r = [];
        for (let i = 0; i < arguments.length; ++i) {
            let c = arguments[i];
            r.push(this._vm.vote(c));
        }
        return r;
    },

    getVoteResult: function (hash) {
        let d = this._dm.getData(hash);
        if (!d) {
            throw "data '" + hash + "' not found";
        }
        return this._getVoteResult(hash);
    },

    getUnfinished: function () {
        let r = [];
        let ds = this._dm.unfinishedDatas();
        for (let i = 0; i < ds.length; ++i) {
            r.push(this._getVoteResult(ds[i]));
        }
        return r;
    },

    getFinishedIndexes: function () {
        return this._dm.dataIndexes();
    },

    getFinished: function (pageIndex) {
        let r = [];
        let ds = this._dm.datas(pageIndex);
        for (let i = 0; i < ds.length; ++i) {
            r.push(this._getVoteResult(ds[i]));
        }
        return r;
    },

    getSigners: function () {
        return this._dm.getSigners();
    },

    getSignerUpdateLogs: function () {
        return this._dm.getSignerLogs();
    },

    getConstitution: function () {
        return this._dm.getConstitution();
    },

    getConstitutionUpdateLogs: function () {
        return this._dm.getConstitutionUpdateLogs();
    },

    accept: function () {
        Event.Trigger("transfer", {
            Transfer: {
                from: Blockchain.transaction.from,
                to: Blockchain.transaction.to,
                value: Blockchain.transaction.value,
            }
        });
    }
}, Base);


module.exports = MultiSign;
