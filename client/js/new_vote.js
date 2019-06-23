function GenAddSigner(ele) {
    this.ele = ele;
}

GenAddSigner.prototype = {

    check: function () {
        return validInput(this.ele.find("#signer"));
    },

    get data() {
        var r = voteTemplates.addSigner;
        r.content.address = this.ele.find("#signer").val();
        return {data: r, value: 1};
    }
};


function GenRemoveSigner(ele) {
    this.ele = ele;
}

GenRemoveSigner.prototype = {
    check: function () {
        return validInput(this.ele.find("#signer"));
    },

    get data() {
        var r = voteTemplates.removeSigner;
        r.content.address = this.ele.find("#signer").val();
        return {data: r, value: 1};
    }
};


function GenReplaceSigner(ele) {
    this.ele = ele;
}

GenReplaceSigner.prototype = {
    check: function () {
        var b = validInput(this.ele.find("#oldSigner"));
        var b1 = validInput(this.ele.find("#newSigner"));
        return b && b1;
    },

    get data() {
        var r = voteTemplates.replaceSigner;
        r.content.oldAddress = this.ele.find("#oldSigner").val();
        r.content.newAddress = this.ele.find("#newSigner").val();
        return {data: r, value: 1};
    }
};


function GenUpdateConstitution(ele) {
    this.ele = ele;
}

GenUpdateConstitution.prototype = {
    check: function () {
        return validInput(this.ele.find("#constitution"));
    },

    get data() {
        var s = this.ele.find("#constitution").val();
        return {data: JSON.parse(s), value: 1};
    },
};


function GenTransfer(ele) {
    this.templateTransferItem = $("#template_transfer_item");
    this.ele = ele;
    var self = this;
    this.ele.find("#btn_add_transfer_item").on("click", function () {
        self.addItem();
    });
    this.addItem();
}

GenTransfer.prototype = {
    get _items() {
        var items = [];
        var container = this.ele.find("#address_list");
        container.children().each(function () {
            var item = $(this);
            items.push({
                to: item.find("#to").val(),
                value: item.find("#value").val(),
                note: item.find("#note").val()
            });
        });
        return items;
    },

    check: function () {
        var items = this._items;
        var r = true;
        this.ele.find("input[type='text']").each(function () {
            let t = $(this);
            if (!validInput(t)) {
                r = false;
            }
        });
        return r;
    },

    get data() {
        var d = voteTemplates.transfer;
        d.content.subject = this.ele.find("#subject").val();
        d.content.description = this.ele.find("#description").val();
        d.action.detail = this._items;
        return d;
    },

    addItem: function () {
        var item = this.templateTransferItem.clone();
        item.find("input[type='text']").on("input propertychange focus", function () {
            validInput($(this));
        });
        item.find("#btn_remove_transfer").on("click", function () {
            cancelAllError(item);
            item.remove();
            hideAllError();
        });
        this.ele.find("#address_list").append(item);
        hideAllError();
    },
};


function GenManager() {
    this.TYPE_ADD_SIGNER = "add-signer";
    this.TYPE_REMOVE_SIGNER = "remove-signer";
    this.TYPE_REPLACE_SIGNER = "replace-signer";
    this.TYPE_UPDATE_CONSTITUTION = "update-constitution";
    this.TYPE_TRANSFER = "transfer";
}

GenManager.prototype = {

    init: function () {
        this.voteContainer = $("#vote_items_container");

        this.templateAddSigner = $("#template_add_signer").attr("vote_type", this.TYPE_ADD_SIGNER);
        this.templateRemoveSigner = $("#template_remove_signer").attr("vote_type", this.TYPE_REMOVE_SIGNER);
        this.templateReplaceSigner = $("#template_replace_signer").attr("vote_type", this.TYPE_REPLACE_SIGNER);
        this.templateUpdateConstitution = $("#template_update_constitution").attr("vote_type", this.TYPE_UPDATE_CONSTITUTION);
        this.templateTransfer = $("#template_transfer").attr("vote_type", this.TYPE_TRANSFER);

        var self = this;
        $("#btn_save_new").on("click", function () {
            self.gen();
        });

        $(".menu_item").on("click", function () {
            var type = $(this).attr("tag");
            self.add(type);
        });
    },

    get items() {
        if (!this._items) {
            this._items = [];
        }
        return this._items;
    },

    add: function (type) {
        var item = this._createItem(type);
        this.voteContainer.append(item.ele);
        this.items.push(item);
        item.ele.find("#btn_close").on("click", function () {
            genManager.remove(item.ele);
        });
        item.ele.find("textarea,input[type='text'],input[type='password']").on("input propertychange focus", function () {
            validInput($(this));
        });
        hideAllError();
    },

    remove: function (ele) {
        cancelAllError(ele);
        ele.remove();
        for (var i in this.items) {
            if (this.items[i].ele === ele) {
                this.items.splice(i, 1);
                break;
            }
        }
        hideAllError();
    },

    check: function () {
        var r = true;
        for (var i in this.items) {
            if (!this.items[i].check()) {
                r = false;
            }
        }
        return r;
    },

    gen: function () {
        if (!this.check()) {
            return;
        }
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
        for (var i in this.items) {
            r.push({data: this.items[i].data, value: 1});
        }
        if (r.length === 0) {
            if (!window.confirm("还没有添加投票项，是否只导出多签账号相关信息(nonce, gasPrice等)")) {
                return;
            }
        }
        saveToFile(JSON.stringify({accountInfo: baseInfo.accountInfo, votes: r}));
    },

    _createItem: function (type) {
        switch (type) {
            case this.TYPE_ADD_SIGNER:
                return new GenAddSigner(this.templateAddSigner.clone());
            case this.TYPE_REMOVE_SIGNER:
                return new GenRemoveSigner(this.templateRemoveSigner.clone());
            case this.TYPE_REPLACE_SIGNER:
                return new GenReplaceSigner(this.templateReplaceSigner.clone());
            case this.TYPE_UPDATE_CONSTITUTION:
                return new GenUpdateConstitution(this.templateUpdateConstitution.clone());
            case this.TYPE_TRANSFER:
                return new GenTransfer(this.templateTransfer.clone());
            default:
                return null;
        }
    }
};

