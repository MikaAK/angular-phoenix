'use strict';

angular.module('angular-phoenix', []).factory('PhoenixBase', ['$rootScope', function ($rootScope) {
  var phoenix = angular.copy(window.Phoenix);

  phoenix.Channel.prototype.on = (function () {
    var _oldOn = angular.copy(phoenix.Channel.prototype.on);

    return function on(scope, event, callback) {
      var _this = this;

      var newCallback;

      if (typeof scope === 'string') {
        callback = event;
        event = scope;
        scope = null;
      }

      newCallback = function () {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        callback.apply(undefined, args);
        $rootScope.$apply();
      };

      _oldOn.call(this, event, newCallback);

      if (scope) scope.$on('$destroy', function () {
        return _this.bindings.splice(_this.bindings.indexOf(newCallback), 1);
      });
    };
  })();

  phoenix.Channel.prototype.receive = (function () {
    var _oldReceive = angular.copy(phoenix.Channel.prototype.receive);

    return function receive(status, callback) {
      if (typeof status === 'function') {
        callback = status;
        status = null;
      }

      if (!status) status = 'ok';

      return _oldReceive.call(this, status, callback);
    };
  })();

  phoenix.Channel.prototype.push = (function () {
    var _oldPush = angular.copy(phoenix.Channel.prototype.push);

    return function push() {
      for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      var res = _oldPush.apply(this, args);

      res.receive = (function () {
        var oldRecieve = angular.copy(res.receive);

        return function receive(status, callback) {
          if (typeof status === 'function') {
            callback = status;
            status = null;
          }

          if (!status) status = 'ok';

          return oldRecieve.call(this, status, callback);
        };
      })();

      return res;
    };
  })();

  return phoenix;
}]).provider('Phoenix', function () {
  var urlBase = '/ws',
      _autoJoinSocket = true;

  this.setUrl = function (url) {
    return urlBase = url;
  };
  this.setAutoJoin = function (bool) {
    return _autoJoinSocket = bool;
  };

  this.$get = ['$q', 'PhoenixBase', function ($q, PhoenixBase) {
    var socket = new PhoenixBase.Socket(urlBase),
        channels = new Map(),
        joinChannel = function joinChannel(name, message) {
      var joinRes,
          promise,
          channel = channels.get(name);

      joinRes = function (resolve, reject) {
        channel = socket.join(name, message);

        channels.set(name, { status: 'fetching', channel: channel });

        channel.after(5000, reject).receive(function (chan) {
          return resolve(chan);
        });
      };

      promise = new $q(joinRes);

      promise.then(function () {
        channels.set(name, { status: 'connected', channel: channel, promise: promise });
      }, function () {
        return console.warn('connection timed out...');
      });

      return angular.extend(channel, { promise: promise });
    };

    if (_autoJoinSocket) socket.connect();

    PhoenixBase.Channel.prototype.leave = (function () {
      var _oldLeave = angular.copy(PhoenixBase.Channel.prototype.leave);

      return function leave() {
        channels.set(this.topic, { status: 'disconnected' });

        return _oldLeave.call(this);
      };
    })();

    return {
      base: PhoenixBase,
      socket: socket,
      leave: function leave(chan) {
        var channel = channels.get(chan.topic);
        if (!channel || channel.status === 'disconnected') {
          return;
        }channel.leave();
      },

      join: function join(scope, name) {
        var message = arguments[2] === undefined ? {} : arguments[2];

        if (typeof scope === 'string') {
          message = name;
          name = scope;
          scope = null;
        }

        var resChannel,
            channel = channels.get(name),
            status = channel && channel.status;

        if (channel) if (status === 'fetching') {
          return channel.channel;
        } else if (status === 'connected') if (Object.keys(message).length) socket.leave(name);else {
          return channel.channel;
        }resChannel = joinChannel(name, message);

        if (scope) resChannel.promise.then(function (chan) {
          scope.$on('$destroy', function () {
            return chan.leave();
          });
        });

        return resChannel;
      }
    };
  }];
});
