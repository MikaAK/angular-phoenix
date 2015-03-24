"use strict";

angular.module("angular-phoenix", []).value("Phoenix", window.Phoenix).provider("Socket", function () {
  var urlBase = "/ws";

  this.setUrl = function (url) {
    return urlBase = url;
  };

  this.$get = ["$rootScope", "Phoenix", function ($rootScope, Phoenix) {
    debugger;
    var socket = new Phoenix.Socket(urlBase),
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

        var on = function on(event, callback) {
          var _this = this;

          this.bindings.push({ event: event, callback: callback });

          if (scope) scope.$on("$destroy", function () {
            return _this.bindings.splice(callback, 1);
          });
        };

        var resolve = function (resolve) {
          var channel;

          if (channel = channels.get(name)) if (!message) return resolve(angular.extend(channel, { on: on }));else socket.leave(name);

          socket.join(name, message, function (channel) {
            channels.set(name, channel);

            resolve(angular.extend(channel, {
              on: on,
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
