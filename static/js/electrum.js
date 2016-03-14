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
  };

  this.electrumLoadHandler = function(e) {
    if (sessionStorage.XSRFToken && sessionStorage.volume) {
      $.get('/templates/electrum.html', function(data) {
        $('body').html(data);
        document.title = 'INTERLOCK - Electrum';

        Interlock.Session.getVersion();
        Interlock.Session.statusPoller();
        Interlock.Electrum.getBalance();
        Interlock.Electrum.listAddresses();
        Interlock.Electrum.statusPoller();
      });
    }
  };

  /** @protected */
  this.STATUS_POLLER_INTERVAL = 30000;

  this.refreshStatus = function(status) {
    console.log(status);
    var conn = status.connected ? "Connected" : "Disconnected";
    $("#electrum_status_connection").text(conn);
    $("#electrum_status_server").text(status.server);
    $("#electrum_status_server_height").text(status.server_height);
    $("#electrum_status_blockchain_height").text(status.blockchain_height);
  }

  this.statusPollerCallback = function(backendData) {
    try {
      if (backendData.status === 'OK') {
        this.refreshStatus(backendData.response.status);
      }
    } catch (e) {
      Interlock.Session.createEvent({'kind': 'critical',
                                    'msg': '[Interlock.Session.statusPollerCallback] ' + e});
    } finally {
      /* re-bounce Interlock.Session.statusPoller
       * if the XSFRToken is not present the poller exits */
      if (sessionStorage.XSRFToken) {
        setTimeout(this.statusPoller, Interlock.Electrum.STATUS_POLLER_INTERVAL);
      }
    }
  };

  this.statusPoller = function() {
    try {
      /* re-bounce Interlock.Session.statusPoller
       * if the XSFRToken is not present the poller exits */
      if (sessionStorage.XSRFToken) {
        Interlock.Backend.APIRequest(Interlock.Backend.API.electrum.status, 'POST',
                                     null, 'Electrum.statusPollerCallback');
      }
    } catch (e) {
      Interlock.Session.createEvent({'kind': 'critical', 'msg': '[Interlock.Session.statusPoller] ' + e});
    }
  };

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
    $.each(addresses, function(i, addr){
      var $li = $("<li>").text(addr);
      $("#electrum_addresses").append($li);
    });
  }
}
