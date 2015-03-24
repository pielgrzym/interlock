/**
 * @class
 * @constructor
 *
 * @description
 * Session instance class
 */
Interlock.Session = new function() {
  /** @private */
  var MAX_SESSION_LOGS = 1000;
  var logs = [];

  sessionStorage.lastLog = sessionStorage.lastLog ? sessionStorage.lastLog : 0;
  sessionStorage.logs = sessionStorage.logs ? sessionStorage.logs : JSON.stringify(logs);

  /** @protected */
  this.STATUS_POLLER_INTERVAL = 5000;

  this.appendLog = function (eventObj) {
    try {
      var logs = JSON.parse(sessionStorage.logs);

      /* circular log buffer */
      if (sessionStorage.lastLog >= MAX_SESSION_LOGS) {
        sessionStorage.lastLog = 0;
      }

      /* append the new log */
      logs[sessionStorage.lastLog++] = eventObj.timestamp + ' | ' + eventObj.severity + ' | ' + eventObj.msg;
      sessionStorage.logs = JSON.stringify(logs);
    } catch (e) {
      /* don't use Interlock notifications, display the error using alert() */
      alert('[Interlock.Session.appendLog] ' + e);
    }
  };

  this.refreshStatus = function(status) {
    var $statusDiv = $('#status');
    var notifications = status.notification || [];
    var logs = status.log || [];

    $.extend($statusDiv,
      {uploads: $('#uploads'), logs: $('#logs'), notifications: $('#notifications')});

    $statusDiv.notifications.html('');
    $statusDiv.logs.html('');

    $.each(notifications, function(index, notification) {
      var timestamp =  Date(notification.epoch * 1000);
      $statusDiv.notifications.append($(document.createElement('li')).text(notification.msg)
                                                                     .addClass('severity_' + notification.code)
        .append($(document.createElement('span')).text(Interlock.UI.convertToTimeString(notification.epoch, true))
                                                 .addClass('timestamp'))
      );
    });

    $.each(logs, function(index, log) {
      var timestamp =  Date(log.epoch * 1000);
      $statusDiv.logs.append($(document.createElement('li')).text(log.msg)
                                                            .addClass('severity_' + log.code)
        .append($(document.createElement('span')).text(Interlock.UI.convertToTimeString(log.epoch, true))
                                                 .addClass('timestamp'))
      );
    });
  };
};

/**
 * @function
 * @public
 *
 * @description
 * Create and dispatch the event to the proper notification UI component
 * and save the correspondent log message in the sessionStorage.
 *
 * @param {Object} eventObj data
 * @returns {}
 */
Interlock.Session.createEvent = function(data) {
  var eventObj = { 'timestamp': Math.floor((new Date).getTime() / 1000) };

  /* join all the messages into a single event object in case multiple
     errors are returned by the backend */
  if (data && data.msg) {
    if (data.msg.constructor === String) {
      eventObj.msg = data.msg;
    } else if (data.msg.constructor === Array) {
      eventObj.msg = data.msg.join('\n');
    } else {
      eventObj.msg = '[Interlock.Session.createEvent] invalid event object';
      return false;
    }
  } else {
    eventObj.msg = '[Interlock.Session.createEvent] invalid event object';
    return false;
  }

  switch (data.kind) {
    case 'INVALID_SESSION':
      /* do not dispatch any notification,
         clean-up the session token and redirects to login */
      eventObj.severity = 'error';
      sessionStorage.removeItem('XSRFToken');

      $.get("/templates/login.html", function(data) {
        $('body').html(data);
        document.title = 'Interlock Login';
      });

      break;
    case 'info':
      /* do not dispatch any notification,
         log the event to the browser console */
      eventObj.severity = 'info';

      break;
    case 'notice':
      eventObj.severity = 'notice';

      break;
    case 'error':
      eventObj.severity = 'error';

      break;
    case 'KO':
    case 'INVALID':
    case 'critical':
    default:
      /* notification sent to the user via dialog msg */
      var msgs = [];
      eventObj.severity = 'critical';

      if (data.msg.constructor === String) {
        msgs = [data.msg];
      }

      $.each(msgs, function(index, msg) {
        /* clean up the raw messages from its prefix */
        msgs[index] = msg.substring(msg.indexOf(']') + 1);
      });

      Interlock.UI.errorFormDialog(msgs);
  }

  /* send the log to the browser console and store it in the sessionStorage */
  console.log(eventObj.msg);
  Interlock.Session.appendLog(eventObj);
};

/**
 * @function
 * @public
 *
 * @description
 * Callback function, sets the XSRF token used as XSRF protection and
 * the mounted volume
 *
 * @param {Object} backendData
 * @param {boolean} hideErrors
 * @returns {}
 */
Interlock.Session.loginCallback = function(backendData, hideErrors) {
  try {
    if (backendData.status === 'OK') {
      /* load the file manager view on success */
      Interlock.Session.createEvent({'kind': 'info',
                                     'msg': '[Interlock.Session.loginCallback] opened a new session'});

      sessionStorage.XSRFToken = backendData.response.XSRFToken;
      sessionStorage.volume = backendData.response.volume;

      $.get("/templates/file_manager.html", function(data) {
        $('body').html(data);
        document.title = 'Interlock File Manager';

        Interlock.Session.statusPoller();
      });

      Interlock.Config.setTime();
    } else {
       /* re-load the login page and present the error dialog on failures */
       $.get("/templates/login.html", function(data) {
        $('body').html(data);
        document.title = 'Interlock Login';

        if (hideErrors) {
          Interlock.Session.createEvent({'kind': 'info',
                                         'msg': '[Interlock.Session.loginCallback] ' + backendData.response});
        } else {
          Interlock.Session.createEvent({'kind': 'critical',
                                         'msg': '[Interlock.Session.loginCallback] ' + backendData.response});
        }
      });
    }
  } catch (e) {
    Interlock.Session.createEvent({'kind': 'critical', 'msg': '[Interlock.Session.loginCallback] ' + e});
  }
};

/**
 * @function
 * @public
 *
 * @description
 * Interlock login
 *
 * @param {String} volume
 * @param {String} password
 * @param {String} dispose password after login
 * @param {boolean} showErrors on login
 * @returns {}
 */
Interlock.Session.login = function(volume, pwd, dispose, showErrors) {
  try {
    Interlock.Backend.APIRequest(Interlock.Backend.API.auth.login, 'POST',
      JSON.stringify({ volume: volume, password: pwd, dispose: dispose }),
      'Session.loginCallback', null, showErrors);
  } catch (e) {
    Interlock.Session.createEvent({'kind': 'critical', 'msg': '[Interlock.Session.login] ' + e});
  }
};

/**
 * @function
 * @public
 *
 * @description
 * Callback function, clear the XSRF token and the current mounted volume
 *
 * @param {Object} backendData
 * @returns {}
 */
Interlock.Session.logoutCallback = function(backendData) {
  try {
    if (backendData.status === 'OK') {
      sessionStorage.removeItem('XSRFToken');
      sessionStorage.removeItem('volume');

      $.get("/templates/login.html", function(data) {
        $('body').html(data);
        document.title = 'Interlock Login';
      });

      Interlock.Session.createEvent({'kind': 'info', 'msg':
        '[Interlock.Session.logoutCallback] session closed'});
    } else {
      Interlock.Session.createEvent({'kind': backendData.status,
                                     'msg': '[Interlock.Session.logoutCallback] ' + backendData.response});
    }
  } catch (e) {
    Interlock.Session.createEvent({'kind': 'critical', 'msg':
      '[Interlock.Session.logoutCallback] ' + e});
  }
};

/**
 * @function
 * @public
 *
 * @description
 * Interlock logout
 *
 */
Interlock.Session.logout = function() {
  try {
    Interlock.Backend.APIRequest(Interlock.Backend.API.auth.logout, 'POST',
      null, 'Session.logoutCallback');
  } catch (e) {
    Interlock.Session.createEvent({'kind': 'critical',
      'msg': '[Interlock.Session.logout] ' + e});
  }
};

/**
 * @function
 * @public
 *
 * @description
 * Callback function, parse the notifications and the logs retrieved
 * polling the backend and fill the UI status area
 *
 * @param {Object} backendData
 * @returns {}
 */
Interlock.Session.statusPollerCallback = function(backendData) {
  try {
    if (backendData.status === 'OK') {
      Interlock.Session.refreshStatus(backendData.response);
    } else {
      Interlock.Session.createEvent({'kind': backendData.status,
                                     'msg': '[Interlock.Session.statusPollerCallback] ' + backendData.response});
    }
  } catch (e) {
    Interlock.Session.createEvent({'kind': 'critical',
      'msg': '[Interlock.Session.statusPollerCallback] ' + e});
  } finally {
    /* re-bounce Interlock.Session.statusPoller
     * if the XSFRToken is not present the poller exits */
    if (sessionStorage.XSRFToken) {
      setTimeout(Interlock.Session.statusPoller, Interlock.Session.STATUS_POLLER_INTERVAL);
    }
  }
};

/**
 * @function
 * @public
 *
 * @description
 * Running status poller
 *
 * @param {}
 * @returns {}
 */
Interlock.Session.statusPoller = function() {
  try {
    Interlock.Backend.APIRequest(Interlock.Backend.API.status.running, 'POST',
      null, 'Session.statusPollerCallback');
  } catch (e) {
    Interlock.Session.createEvent({'kind': 'critical', 'msg': '[Interlock.Session.statusPoller] ' + e});
  }
};
