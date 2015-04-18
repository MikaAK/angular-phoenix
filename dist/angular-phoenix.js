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

      joinChannel: function joinChannel(scope, name, message) {
        var channel = channels.get(name);

        channel = socket.join(name, message);

        channel.recieve = (function () {
          _oldRecieve = angular.copy(channel.recieve);

          return function receive() {
            for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
              args[_key] = arguments[_key];
            }

            channels.set(name, { status: 'connected', channel: this });

            return _oldRecieve.apply(undefined, args);
          };
        })();

        channel.after(5000, function () {
          return console.log('We\'re having trouble connecting...');
        });

        channels.set(name, { status: 'fetching', channel: channel });
        debugger;
        return channel;
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
        }if (channel && channel.status === 'connected' && Object.keys(message).length) socket.leave(name);

        return helpers.joinChannel(scope, name, message);
      }
    };
  }];
});

// Copy fn from phoenix.js and addd scope logic
