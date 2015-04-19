'use strict';

angular.module('angular-phoenix', []).value('PhoenixBase', window.Phoenix).provider('Phoenix', function () {
  var urlBase = '/ws',
      _autoJoinSocket = true,
      _disableMultiJoin = true;

  this.setUrl = function (url) {
    return urlBase = url;
  };
  this.setMultiJoin = function (bool) {
    return _disableMultiJoin = bool;
  };
  this.setAutoJoin = function (bool) {
    return _autoJoinSocket = bool;
  };

  this.$get = ['$rootScope', '$window', 'PhoenixBase', function ($rootScope, $window, PhoenixBase) {
    var socket = new PhoenixBase.Socket(urlBase),
        channels = new Map(),
        helpers = {
      _extendChannel: function _extendChannel(scope, channel) {
        var phoenixReplace = {};

        return angular.extend(angular.copy(channel), phoenixReplace);
      },

      joinChannel: function joinChannel(name, message) {
        var joinRes,
            promise,
            channel = channels.get(name);

        joinRes = function (resolve, reject) {
          channel = socket.join(name, message);

          channel.receive = (function () {
            var _oldReceive = angular.copy(channel.receive);

            return function receive(scope, status, callback) {
              if (typeof scope === 'function') {
                callback = angular.copy(scope);
                scope = null;
              }

              if (!callback && typeof status === 'function') {
                callback = angular.copy(status);
                status = null;
              }

              if (!status) status = 'ok';

              return _oldReceive.call(this, status, callback);
            };
          })();

          channels.set(name, { status: 'fetching', channel: channel });

          channel.after(5000, reject).receive(resolve);
        };

        promise = new Promise(joinRes).then(function () {
          return channels.set(name, { status: 'connected', channel: channel, promise: promise });
        });

        return angular.extend(channel, { promise: promise });
      },

      isFetching: function isFetching(name) {
        var channel = channels.get(name);
        return channel && channel.status === 'fetching';
      }
    };

    if (_autoJoinSocket) socket.connect();

    return {
      base: PhoenixBase,
      socket: socket,
      leave: function leave(name) {
        if (!channels.get(name)) {
          return;
        }socket.leave(name);
        channels.set(name, { status: 'disconnected' });
      },

      join: function join(name) {
        var message = arguments[1] === undefined ? {} : arguments[1];

        var channel = channels.get(name);

        if (helpers.isFetching(name)) {
          return channel[1];
        }if (_disableMultiJoin && channel && channel.status === 'connected' && Object.keys(message).length) socket.leave(name);

        return helpers.joinChannel(name, message);
      }
    };
  }];
});

// Copy fn from phoenix.js and addd scope logic
