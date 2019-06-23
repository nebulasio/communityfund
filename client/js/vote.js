function Vote() {
    this.datas = [];
}

Vote.prototype = {
    init: function () {
        this.templateRadioGroup = $("#template_radio_group");
        this.templateRemoveSigner = $("#template_vote_remove_signer");
        this.templateReplaceSigner = $("#template_vote_replace_signer");
        this.templateUpdateConstitution = $("#template_vote_update_constitution");
        this.templateTransfer = $("#template_vote_transfer");

        this.itemsContainer = $("#current_vote_list");

        var self = this;
        $("#btn_save_vote").on("click", function () {
            self.gen();
        });
        this._loadData();
    },

    update: function () {
        this.datas = [];
        if (this.itemsContainer) {
            this.itemsContainer.empty();
        }
        this._loadData();
    },

    gen: function () {
        if (!baseInfo.accountInfo) {
            if (!baseInfo.currentSignerAddress) {
                alert("还未设置当前多签账号");
                return;
            }
            baseInfo.refreshAccountInfo();
            alert("还未获取到当前多签账号信息，请稍候重试");
            return;
        }
        var r = [];
        for (var i in this.datas) {
            if (!this.datas[i].value) {
                continue;
            }
            r.push({data: this.datas[i].data, value: this.datas[i].value});
        }
        if (r.length === 0) {
            if (!window.confirm("还没有添加投票项，是否只导出多签账号相关信息(nonce, gasPrice等)")) {
                return;
            }
        }
        saveToFile(JSON.stringify({accountInfo: baseInfo.accountInfo, votes: r}));
    },

    _loadData: function () {
        showWaiting();
        var self = this;
        msApi.getUnFinished(function (data, error) {
            hideWaiting();
            self.itemsContainer.empty();
            if (!error) {
                self._onGetData(data);
            } else {
                self.itemsContainer.text("加载数据失败, 请刷新页面重试");
            }
        });
    },

    _onGetData: function (datas) {
        if (datas.length === 0) {
            this.itemsContainer.text("暂无数据");
        } else {
            for (var i in datas) {
                this.datas.push(datas[i]);
                this._createView(datas[i]);
            }
        }
    },

    _createView: function (data) {
        var itemView = null;
        switch (data.data.type) {
            case "add-signer":
                itemView = this._createAddSignerView(data);
                break;
            case "remove-signer":
                itemView = this._createRemoveSignerView(data);
                break;
            case "replace-signer":
                itemView = this._createReplaceSignerView(data);
                break;
            case "update-constitution":
                itemView = this._createUpdateConstitutionView(data);
                break;
            case "transfer":
                itemView = this._createTransferView(data);
                break;
            default:
                break;
        }
        if (itemView) {
            this.itemsContainer.append(itemView);
        }
    },

    _createAddSignerView: function (data) {
        var v = this.templateAddSigner.clone();
        v.find("#signer").text(data.data.content.address);
        this._updateVoteList(v, data);
        this._createRadioGroup(v, data);
        return v;
    },

    _createRemoveSignerView: function (data) {
        var v = this.templateRemoveSigner.clone();
        v.find("#signer").text(data.data.content.address);
        this._updateVoteList(v, data);
        this._createRadioGroup(v, data);
        return v;
    },

    _createReplaceSignerView: function (data) {
        var v = this.templateReplaceSigner.clone();
        v.find("#signer").html("被替换者:" + data.data.content.oldAddress + "<br/>替换者:" + data.data.content.newAddress);
        this._updateVoteList(v, data);
        this._createRadioGroup(v, data);
        return v;
    },

    _createUpdateConstitutionView: function (data) {
        var v = this.templateUpdateConstitution.clone();
        v.find("#content").text(JSON.stringify(data.data, null, 2));
        this._updateVoteList(v, data);
        this._createRadioGroup(v, data);
        return v;
    },

    _createTransferView: function (data) {
        var v = this.templateTransfer.clone();
        var list = data.data.action.detail;
        var s = "";
        for (var i in list) {
            var item = list[i];
            s += item.value + " NAS &nbsp;&nbsp; -> &nbsp;&nbsp; " + item.to + " &nbsp; (备注:&nbsp;" + item.note + ")<br/>";
        }
        v.find("#content").html(s);
        this._updateVoteList(v, data);
        this._createRadioGroup(v, data);
        return v;
    },

    _updateVoteList(v, data) {
        var s = "";
        for (var i in data.result.signers) {
            var item = data.result.signers[i];
            s += item.address + " &nbsp;&nbsp; " + (item.value === 1 ? "YES" : "NO") + "<br/>";
        }
        v.find("#vote_list").html(s);
    },

    _voted: function (data) {
        for (var i in data.result.signers) {
            if (data.result.signers[i].address === baseInfo.currentSignerAddress) {
                return true;
            }
        }
        return false;
    },

    _createRadioGroup: function (v, data) {
        var rg = this.templateRadioGroup.clone();
        if (this._voted(data)) {
            rg.empty();
            rg.text("已投票");
        } else {
            var hash = nebHelper.sha3256(nebHelper.serialize(data.data));
            var eleYes = rg.find("#yes");
            var labelYes = rg.find("#label_yes");
            var eleNo = rg.find("#no");
            var labelNo = rg.find("#label_no");
            eleYes.attr("id", "yes" + hash);
            eleYes.attr("name", "radio" + hash);
            labelYes.attr("id", "label_yes" + hash);
            labelYes.attr("for", eleYes.attr("id"));
            eleNo.attr("id", "no" + hash);
            eleNo.attr("name", "radio" + hash);
            labelNo.attr("id", "label_no" + hash);
            labelNo.attr("for", eleNo.attr("id"));

            function changed() {
                data.value = parseInt($(this).val());
            }

            eleYes.on("change", changed);
            eleNo.on("change", changed);
        }
        v.find("#radio_group_container").append(rg);
    }
};
