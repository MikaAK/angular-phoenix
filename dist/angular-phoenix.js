"use strict";

angular.module("angular-phoenix", []).value("Phoenix", window.Phoenix).provider("Socket", function () {
  var apiBase = "/ws";

  this.setApi = function (url) {
    return apiBase = url;
  };

  this.$get = ["$rootScope", "Phoenix", function ($rootScope, Phoenix) {
    var socket = new Phoenix.Socket(apiBase),
        channels = new Map();

    return {
      leave: function leave(name) {
        if (!channels.get(name)) {
          return;
        }socket.leave(name);
        channels.set(name, false);
      },

      join: function join(scope, name) {
        var message = arguments[2] === undefined ? {} : arguments[2];

        if (typeof scope === "string") {
          message = name;
          name = scope;
          scope = null;
        }

        var resolve = function (resolve) {
          var channel;

          if (channel = channels.get(name)) return resolve(channel);

          socket.join(name, message, function (channel) {
            channels.set(name, channel);

            resolve(angular.extend(channel, {
              on: function on(eventName, callback) {
                var _this = this;

                if (scope) scope.$on("$destroy", function () {
                  socket.leave(name);
                  channels.set(name, false);
                  _this.bindings.splice(callback, 1);
                });

                channel.on(eventName, callback);
              },

              trigger: function trigger(e, t) {
                this.bindings.filter(function (t) {
                  return t.event === e;
                }).map(function (e) {
                  return $rootScope.$digest(e.callback(t));
                });
              }
            }));
          });
        };

        return new Promise(resolve);
      }
    };
  }];
});
