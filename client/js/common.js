var nebulas = require("nebulas");
var NebAccount = nebulas.Account;
var NebUtils = nebulas.Utils;
var NebTransaction = nebulas.Transaction;
var NebUnit = nebulas.Unit;
var neb = new Neb();


// mainnet
// var chainId = 1;
// var contractAddress = "n1zaBD4CfAmoykPEnmhfQ1PrFwrWVnAMnH3";
// var explorerLink = "https://explorer.nebulas.io/#/tx/";
// neb.setRequest(new nebulas.HttpRequest("https://mainnet.nebulas.io"));

// testnet
var chainId = 1001;
var contractAddress = "n1zaBD4CfAmoykPEnmhfQ1PrFwrWVnAMnH3";
var explorerLink = "https://explorer.nebulas.io/#/testnet/tx/";
neb.setRequest(new nebulas.HttpRequest("https://testnet.nebulas.io"));

var showWaitingTime = 0;

function setError(input, msg) {
    input.popover({trigger: 'focus', content: msg, placement: 'auto'});
    input.popover("show");
    input.addClass("input_error");
}

function cancelError(input) {
    if (input.hasClass("input_error")) {
        input.popover('dispose');
        input.removeClass("input_error");
    }
}

function showAllError() {
    $(".input_error").popover("show");
}

function hideAllError() {
    $(".input_error").popover("hide");
}

function cancelAllError(root) {
    root.find(".input_error").each(function () {
        cancelError($(this));
    });
}

function showWaiting() {
    showWaitingTime = new Date().getTime();
    bootbox.dialog({message: "<span style='color:#666666'>Loading...</span>", size: 'large', closeButton: false, buttons: {}});
}

function hideWaiting() {
    var now = new Date().getTime();
    var offset = Math.ceil((now - showWaitingTime));
    if (offset < 1000) {
        offset = 1000;
    }
    window.setTimeout(bootbox.hideAll, offset);
}

function validInput(input) {
    var valid = input.attr("valid");
    if (!valid) {
        return true;
    }
    var vs = valid.split(",");
    for (var i = 0; i < vs.length; ++i) {
        var v = vs[i];
        var array = v.split("|");
        var r = false;
        if (array.length > 1) {
            r = _valid(input, array[0], array[1]);
        } else {
            r = _valid(input, array[0], null);
        }
        if (!r) {
            return false;
        }
    }
    return true;
}

function _valid(input, method, msg) {
    if (method === "required") {
        if (input.val().length === 0) {
            setError(input, msg);
            return false;
        } else {
            cancelError(input);
        }
    } else if (method === "int") {
        if (!_isInt(input.val())) {
            setError(input, msg);
            return false;
        } else {
            cancelError(input);
        }
    } else if (method === "cycle") {
        if (!_isInt(input.val()) || parseInt(input.val()) < 1) {
            setError(input, msg);
            return false;
        } else {
            cancelError(input);
        }
    } else if (method === "amount") {
        var amount = input.val();
        var a = amount.split(".");
        var amountValid = a.length === 1 || a[1].length <= 18;
        amountValid = amountValid && _isFloat(amount);
        if (!amountValid) {
            if (!msg) {
                msg = "Please enter the correct amount of NAS.";
            }
            setError(input, msg);
            return false;
        } else {
            cancelError(input);
        }
    } else if (method === "pledgeAmount") {
        var amount = input.val();
        var valid = parseFloat(amount) >= 5;
        if (!valid) {
            if (!msg) {
                msg = "The amount cannot be less than 5 NAS";
            }
            setError(input, msg);
            return false;
        } else {
            cancelError(input);
        }
    } else if (method === "address") {
        if (!NebAccount.isValidAddress(input.val())) {
            if (!msg) {
                msg = "Please enter the correct neb address";
            }
            setError(input, msg);
            return false;
        } else {
            cancelError(input);
        }
    } else if (method === "oldSigner") {
        if (!NebAccount.isValidAddress(input.val())) {
            if (!msg) {
                msg = "Please enter the correct neb address";
            }
            setError(input, msg);
            return false;
        } else if (dataManager.signers && dataManager.signers.indexOf(input.val()) < 0) {
            setError(input, msg);
            return false;
        } else {
            cancelError(input);
        }
    } else if (method === "newSigner") {
        if (!NebAccount.isValidAddress(input.val())) {
            if (!msg) {
                msg = "Please enter the correct neb address";
            }
            setError(input, msg);
            return false;
        } else if (dataManager.signers && dataManager.signers.indexOf(input.val()) >= 0) {
            setError(input, msg);
            return false;
        } else {
            cancelError(input);
        }
    } else if (method === "constitution") {
        try {
            voteDataValidator.verifyUpdateConstitutionData(JSON.parse(input.val()));
            cancelError(input);
        } catch (e) {
            setError(input, msg);
            return false;
        }
    }
    return true;
}

function _isInt(val) {
    return /^\d+$/.test(val);
}

function _isFloat(val) {
    return /^\d+(\.\d+)?$/.test(val);
}

function saveToFile(str) {
    var fileName = window.prompt("文件名：");
    if (!fileName) {
        return;
    }
    if (!fileName.endsWith(".json")) {
        fileName += ".json";
    }
    blob = new Blob([str], {type: "application/text; charset=utf-8"});
    saveAs(blob, fileName);
}
