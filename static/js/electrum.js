Interlock.Electrum = new function() {
  this.init = function() {
    var $createButton = $("#open_electrum");
    console.log("[Electrum] Initialization started");
    $createButton.on('click', function(e) { 
      Interlock.Electrum.walletCreateHandler(e);
      return false;
    });
  }

  this.walletCreateHandler = function(e) {
    Interlock.Backend.APIRequest(
      Interlock.Backend.API.electrum.create,
      'POST',
      JSON.stringify({password: "test"}),
      'Electrum.walletCreateCallback', null, null
    );
  }

  this.walletCreateCallback = function(msg) {
    console.log(msg);
  }
}
