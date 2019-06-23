var voteTemplates = {

    _addSigner: {
        "type": "add-signer",
        "content": {
            "address": null
        }
    },

    _removeSigner: {
        "type": "remove-signer",
        "content": {
            "address": null
        }
    },

    _replaceSigner: {
        "type": "replace-signer",
        "content": {
            "oldAddress": null,
            "newAddress": null
        }
    },

    _updateConstitution: {
        "type": "update-constitution",
        "content": {
            "version": "0",
            "approvalConditions": {
                "updateConstitution": null,
                "addSigner": null,
                "removeSigner": null,
                "replaceSigner": null,
                "transfer": []
            }
        }
    },

    _transfer: {
        "type": "transfer",
        "content": {
            "subject": null,
            "description": null
        },
        "action": {
            "name": "transfer",
            "detail": []
        }
    },

    _copy: function (o) {
        return JSON.parse(JSON.stringify(o));
    },

    get addSigner() {
        return this._copy(this._addSigner);
    },

    get removeSigner() {
        return this._copy(this._removeSigner);
    },

    get replaceSigner() {
        return this._copy(this._replaceSigner);
    },

    get updateConstitution() {
        return this._copy(this._updateConstitution);
    },

    get transfer() {
        return this._copy(this._transfer);
    },

};
