var nebHelper = new NebHelper();

var msApi = new MSApi();

var dataManager = new DataManager(function (type) {
    baseInfo.update();
});

var voteDataValidator = new VoteDataValidator();

var baseInfo = new BaseInfo(function (newAddress) {
    voteManager.update();
});

var genManager = new GenManager();

var voteManager = new Vote();

var signAndSend = new SignAndSend();

$(function () {
    dataManager.init();
    genManager.init();
    voteManager.init();
    baseInfo.init();
    signAndSend.init();

    $("#contract_address").text("多签合约地址: " + contractAddress);

    bootbox.setDefaults({
        className: "neb_boot_box"
    });

    $("textarea,input[type='text'],input[type='password']").on("input propertychange focus", function () {
        validInput($(this));
    });

    $('.dropdown-toggle').dropdown();
    var li = $(".nav li a").get(0).click();

    var s = nebHelper.serialize({
        "type": "transfer",
        "content": {
            "subject": "test",
            "description": "test transfer"
        },
        "action": {
            "name": "transfer",
            "detail": [{
                "to": "n1JvS1LDTJRxSdq4F5cDd1x78ihHTTRyWif",
                "value": "1",
                "note": "note1"
            }]
        }
    });
    console.log("hash", nebHelper.sha3256(s));
});
