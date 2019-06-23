function BaseInfo(listener) {
    this.gasLimit = "400000";
    this.listener = listener;
}

BaseInfo.prototype = {

    get currentSignerAddress() {
        if (!this._currentSignerAddress) {
            this._currentSignerAddress = localStorage.getItem("current_signer");
        }
        return this._currentSignerAddress;
    },

    set currentSignerAddress(address) {
        if (address === this._currentSignerAddress) {
            return;
        }
        this._currentSignerAddress = address;
        localStorage.setItem("current_signer", address);
        this.nonce = this.gasPrice = null;
        this.refreshAccountInfo();
        if (this.listener) {
            this.listener(address);
        }
    },

    get accountInfo() {
        if (!this.gasPrice || !this.nonce) {
            return null;
        }
        return {
            address: this.currentSignerAddress,
            gasLimit: this.gasLimit,
            gasPrice: this.gasPrice,
            balance: this.balance,
            nonce: this.nonce
        }
    },

    init: function () {
        this.currentSigner = $("#current_signer");
        this.membersView = $("#ms_members");
        this.constitutionView = $("#ms_constitution");

        var self = this;
        this.currentSigner.on("change", function () {
            if (validInput($(this))) {
                self.currentSignerAddress = $(this).val();
            }
        });
        if (this.currentSignerAddress) {
            this.currentSigner.val(this.currentSignerAddress);
            this.refreshAccountInfo();
        }
        this.update();
    },

    update: function () {
        if (!this.membersView) {
            return;
        }
        if (dataManager.signers) {
            this.membersView.html(dataManager.signers.join("<br/>"));
            validInput(this.currentSigner);
        }
        if (dataManager.constitution) {
            this.constitutionView.text(JSON.stringify(dataManager.constitution, null, 2));
        }
    },

    refreshAccountInfo: function () {
        var self = this;
        neb.api.gasPrice()
            .then(function (resp) {
                self.gasPrice = NebUtils.toBigNumber(resp.gas_price).mul(NebUtils.toBigNumber("1.5")).toString(10);
                return neb.api.getAccountState(self.currentSignerAddress);
            })
            .then(function (resp) {
                self.balance = resp.balance;
                self.nonce = parseInt(resp.nonce) + 1;
            })
            .catch(function (e) {
            });
    }
};
