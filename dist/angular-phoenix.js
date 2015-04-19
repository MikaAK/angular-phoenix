'use strict';

angular.module('angular-phoenix', []).value('PhoenixBase', window.Phoenix).provider('Phoenix', function () {
  var urlBase = '/ws',
      _autoJoinSocket = true;

  this.setUrl = function (url) {
    return urlBase = url;
  };
  this.setAutoJoin = function (bool) {
    return _autoJoinSocket = bool;
  };

  this.$get = ['$rootScope', '$window', 'PhoenixBase', function ($rootScope, $window, PhoenixBase) {
    var socket = new PhoenixBase.Socket(urlBase),
        channels = new Map(),
        helpers = {
      _extendChannel: function _extendChannel(channel) {
        var phoenixReplace = {
          on: function on(scope, event, callback) {
            var _this = this;

            if (typeof scope === 'string') {
              callback = event;
              event = scope;
              scope = null;
            }

            this.bindings.push({ event: event, callback: (function (_callback) {
                function callback(_x) {
                  return _callback.apply(this, arguments);
                }

                callback.toString = function () {
                  return _callback.toString();
                };

                return callback;
              })(function () {
                for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                  args[_key] = arguments[_key];
                }

                callback.apply(undefined, args);
                $rootScope.$apply();
              }) });

            if (scope) scope.$on('$destroy', function () {
              return _this.bindings.splice(callback, 1);
            });
          }
        };

        return angular.extend(channel, phoenixReplace);
      },

      joinChannel: function joinChannel(name, message) {
        var joinRes,
            promise,
            channel = channels.get(name);

        joinRes = function (resolve, reject) {
          channel = socket.join(name, message);

          channel.receive = (function () {
            var _oldReceive = angular.copy(channel.receive);

            return function receive(status, callback) {
              if (typeof status === 'function') {
                callback = status;
                status = null;
              }

              if (!status) status = 'ok';

              _oldReceive.call(this, status, function (chan) {
                return callback(helpers._extendChannel(chan));
              });
            };
          })();

          channels.set(name, { status: 'fetching', channel: channel });

          channel.after(5000, reject).receive(function (chan) {
            return resolve(chan);
          });
        };

        promise = new Promise(joinRes);

        promise.then(function () {
          channels.set(name, { status: 'connected', channel: channel, promise: promise });
        });

        return angular.extend(channel, { promise: promise });
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

        var channel = channels.get(name),
            status = channel && channel.status;

        if (channel) if (status === 'fetching') {
          return channel.channel;
        } else if (status === 'connected') if (Object.keys(message).length) socket.leave(name);else {
          return channel.channel;
        }return helpers.joinChannel(name, message);
      }
    };
  }];
});
