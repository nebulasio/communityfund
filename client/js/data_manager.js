function DataManager(listener) {
    this.TYPE_SIGNERS = "signers";
    this.TYPE_CONSTITUTION = "constitution";

    this._listener = listener;
}

DataManager.prototype = {
    init: function () {
        this.refresh();
    },

    _onChanged: function (type) {
        if (this._listener) {
            this._listener(type)
        }
    },

    refresh() {
        var self = this;

        msApi.getSigners(function (result, error) {
            if (!error) {
                self.signers = result;
                self._onChanged(self.TYPE_SIGNERS);
            }
        });

        msApi.getConstitution(function (result, error) {
            if (!error) {
                self.constitution = result;
                self._onChanged(self.TYPE_CONSTITUTION);
            }
        });
    },
};
