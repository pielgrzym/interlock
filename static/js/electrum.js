Interlock.Electrum = new function() {
  this.init = function() {
    var $open_electrum = $("#open_electrum");
    var $open_file_manager = $("#open_file_manager");
    console.log("[Electrum] Initialization started");
    $open_electrum.on('click', function(e) { 
      Interlock.Electrum.electrumLoadHandler(e);
      return false;
    });
    $open_file_manager.on('click', function(e) { 
      Interlock.Electrum.electrumFileManagerHandler(e);
      return false;
    });
  }

  this.electrumLoadHandler = function(e) {
    if (sessionStorage.XSRFToken && sessionStorage.volume) {
      $.get('/templates/electrum.html', function(data) {
        $('body').html(data);
        document.title = 'INTERLOCK - Electrum';

        Interlock.Session.getVersion();
        Interlock.Session.statusPoller();
        Interlock.Electrum.getBalance();
        Interlock.Electrum.listAddresses();
      });
    }
  }

  this.electrumFileManagerHandler = function(e) {
    if (sessionStorage.XSRFToken && sessionStorage.volume) {
      $.get('/templates/file_manager.html', function(data) {
        $('body').html(data);
        document.title = 'INTERLOCK';

        Interlock.Session.getVersion();
        Interlock.Session.statusPoller();
      });
    }
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
    console.log(msg.response.seed);
  }

  this.getBalance = function() {
    Interlock.Backend.APIRequest(
      Interlock.Backend.API.electrum.balance,
      'POST', null,
      'Electrum.getBalanceCallback'
    )
  }

  this.getBalanceCallback = function(msg) {
    var balance = msg.response.balance;
    $("#electrum_balance").text(balance);
  }

  this.listAddresses = function() {
    Interlock.Backend.APIRequest(
      Interlock.Backend.API.electrum.addresses,
      'GET', null,
      'Electrum.listAddressesCallback'
    )
  }

  this.listAddressesCallback = function(msg) {
    var addresses = msg.response.addresses;
    for (addr in addresses) {
      var $li = $("<li></li>");
      $li.text(addr);
      $("#electrum_addresses").append($li);
    }
  }
}
