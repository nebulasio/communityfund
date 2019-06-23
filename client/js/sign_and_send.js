function SignAndSend() {
    this.voteDatas = [];
}

SignAndSend.prototype = {

    init: function () {
        this.itemsContainer = $("#vote_data_file_list");
        this.templateVoteDataItem = $("#template_vote_data_file_item");

        this.btnKeyStoreFile = $("#btn_keystore");
        this.btnVoteFile = $("#btn_add_vote_file");
        this.btnSignFile = $("#btn_select_sign_file");

        var self = this;

        $("#btn_sign").on("click", function () {
            self._sign();
        });

        $("#btn_send").on("click", function () {
            self._send();
        });

        $(".file").on("change", function (e) {
            var file = e.target.files[0],
                fr = new FileReader(),
                ele = $(this),
                fileName = file.name;
            fr.onload = function (e) {
                try {
                    switch (ele.attr("id")) {
                        case "keystore_file":
                            self._onGetKeystore({name: fileName, data: e.target.result});
                            break;
                        case "vote_data_file":
                            self._onGetVoteDataFile({name: fileName, data: JSON.parse(e.target.result)});
                            break;
                        case "sign_data_file":
                            self._onGetSignData({name: fileName, data: e.target.result});
                            break;
                    }
                } catch (ex) {
                    alert(ex.message);
                }
            };
            fr.readAsText(file);
        });
    },

    _onGetKeystore: function (data) {
        this.keystore = data;
        this.btnKeyStoreFile.text(data.name);
        cancelError(this.btnKeyStoreFile);
        hideAllError();
    },

    _onGetVoteDataFile: function (data) {
        this.voteDatas.push(data);
        data.ele = this.templateVoteDataItem.clone();
        data.ele.find("#file_name").text(data.name);
        var self = this;
        data.ele.find(".btn_close").on("click", function () {
            data.ele.remove();
            self._removeVoteData(data);
            $("#vote_data_file").val(null);
        });
        this.itemsContainer.append(data.ele);
        cancelError(this.btnVoteFile);
    },

    _onGetSignData: function (data) {
        this.signData = data;
        $("#sign_data").text(data.name);
        cancelError(this.btnSignFile);
    },

    _removeVoteData: function (data) {
        for (var i = 0; i < this.voteDatas.length; ++i) {
            if (this.voteDatas[i] === data) {
                this.voteDatas.splice(i, 1);
            }
        }
    },

    _checkSign: function () {
        var b1 = false;
        if (!this.keystore) {
            setError(this.btnKeyStoreFile, "请选择 Keystore");
        } else {
            cancelError(this.btnKeyStoreFile);
            b1 = true;
        }
        var b2 = validInput($("#pwd"));

        var b3 = false;
        if (this.voteDatas.length === 0) {
            setError(this.btnVoteFile, "请添加投票数据文件.");
        } else {
            cancelError(this.btnVoteFile);
            b3 = true;
        }
        return b1 && b2 && b3;
    },

    _sign: function () {

        if (!this._checkSign()) {
            return;
        }

        if (this.voteDatas.length === 0) {
            alert("请添加投票数据文件.");
            return;
        }

        var a = null;
        try {
            a = nebHelper.accountFromKeystore(this.keystore.data, $("#pwd").val());
        } catch (e) {
            alert(e);
            return;
        }
        if (!a) {
            alert("keystore 或者 密码错误.");
            return;
        }

        var accountInfo = null;
        var r = [];
        for (var i in this.voteDatas) {
            var d = this.voteDatas[i].data;
            if (d.accountInfo) {
                if (accountInfo) {
                    if (accountInfo.address !== d.accountInfo.address) {
                        alert("投票数据文件，多签账号信息不一至");
                        return;
                    }
                } else {
                    accountInfo = d.accountInfo;
                }
            }
            for (var j in d.votes) {
                var v = d.votes[j];
                v.sig = nebHelper.sign(nebHelper.getHash(v.data, v.value), a);
                r.push(v);
            }
        }
        if (!accountInfo) {
            alert("未获取到多签账户信息.");
            return;
        }
        if (accountInfo.address !== a.getAddressString()) {
            alert("Keystore 与 数据文件账户信息不一至.");
            return;
        }
        if (r.length === 0) {
            alert("没有投票数据.");
            return;
        }

        var contract = {
            "source": "",
            "sourceType": "js",
            "function": "vote",
            "args": JSON.stringify(r),
            "binary": "",
            "type": "call"
        };

        try {
            var tx = new NebTransaction(
                parseInt(chainId),
                a, contractAddress, "0",
                parseInt(accountInfo.nonce), accountInfo.gasPrice, accountInfo.gasLimit, contract
            );
            tx.signTransaction();
            saveToFile(tx.toProtoString());
        } catch (e) {
            alert(e);
        }
    },

    _checkSend: function () {
        if (!this.signData) {
            setError(this.btnSignFile, "请选择签名数据文件.");
            return false;
        } else {
            cancelError(this.btnSignFile);
            return true;
        }
    },

    _send: function () {
        if (!this._checkSend()) {
            return;
        }
        showWaiting();
        neb.api.sendRawTransaction(this.signData.data).then(function (resp) {
            hideWaiting();
            if (resp.error) {
                $("#result").text(resp.error);
            } else {
                $("#result").text("Explorer link:");
            }
            var link = explorerLink + resp.txhash;
            $("#hash").attr("href", link);
            $("#hash").text(link);
            $("#hash").show();

            $([document.documentElement, document.body]).animate({
                scrollTop: document.body.scrollHeight
            }, 1000);
        }).catch(function (o) {
            alert(o);
            hideWaiting();
        });
    }

};

