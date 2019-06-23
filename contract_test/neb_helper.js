function NebHelper() {
    this.nebulas = require("nebulas");
    this.Account = nebulas.Account;
    this.utils = nebulas.Utils;
    this.cryptoUtils = nebulas.CryptoUtils;
}

NebHelper.prototype = {

    _concat: function () {
        let s = "";
        for (let i in arguments) {
            s += this.cryptoUtils.bufferToHex(arguments[i]).substr(2);
        }
        return this.cryptoUtils.toBuffer('0x' + s);
    },

    _pubKeyToAddress: function (pubKey) {
        let r = this.cryptoUtils.sha3(pubKey);
        r = this.cryptoUtils.ripemd160(r);
        r = this._concat(this.cryptoUtils.toBuffer('0x19'), this.cryptoUtils.toBuffer('0x57'), r);
        let checkSum = this.cryptoUtils.sha3(r).slice(0, 4);
        r = this._concat(r, checkSum);
        return encode(r);
    },

    serialize: function (o) {
        if (o == null || typeof o === "undefined") {
            return "";
        }
        let r = "";
        if (typeof o === "object") {
            if (o.constructor === Array) {
                for (let i = 0; i < o.length; ++i) {
                    r += this.serialize(o[i]);
                }
            } else {
                let keys = Object.keys(o).sort();
                for (let i = 0; i < keys.length; ++i) {
                    r += keys[i] + this.serialize(o[keys[i]]);
                }
            }
        } else {
            r += o;
        }
        return r;
    },

    newAccount: function () {
        return this.Account.NewAccount();
    },

    accountFromPrivateKey: function (privateKey) {
        return new this.Account(privateKey);
    },

    accountFromKeystore: function (keystore, pwd) {
        return this.Account.NewAccount().fromKey(keystore, pwd, false);
    },

    sha3256: function (content) {
        return this.cryptoUtils.bufferToHex(this.cryptoUtils.sha3(content)).substr(2);
    },

    getHash: function (data, value) {
        return this.sha3256(this.serialize(data) + value);
    },

    sign: function (hash, account) {
        return this.cryptoUtils.bufferToHex(this.cryptoUtils.sign('0x' + hash, '0x' + account.getPrivateKeyString())).substr(2);
    },

    recoverAddress: function (hash, sig) {
        let recovery = parseInt(sig.substr(sig.length - 1, 1));
        sig = sig.substr(0, 64 * 2);
        let pubKey = this.cryptoUtils.recover('0x' + hash, '0x' + sig, recovery, false);
        return this._pubKeyToAddress(pubKey);
    },
};
