"use strict";

angular.module("angular-phoenix", []).value("PhoenixBase", window.Phoenix).provider("Phoenix", function () {
  var urlBase = "/ws";

  this.setUrl = function (url) {
    return urlBase = url;
  };

  this.$get = ["$rootScope", "$window", "PhoenixBase", function ($rootScope, $window, PhoenixBase) {
    var createSocketUrl = function createSocketUrl(url) {
      var loc = $window.location,
          socketProtocol = loc.protocol === "http:" ? "ws:" : "wss:",
          baseUrl = url.startsWith("/") ? url.substr(1, url.length) : url;

      return "" + socketProtocol + "//" + loc.host + "" + loc.pathname + "" + baseUrl;
    };

    var socketUrl = urlBase.search("ws") === 0 ? urlBase : createSocketUrl(urlBase),
        socket = new PhoenixBase.Socket(urlBase),
        channels = new Map();

    return {
      base: PhoenixBase,
      socket: socket,
      leave: function leave(name) {
        if (!channels.get(name)) {
          return;
        }socket.leave(name);
        channels.set(name, false);
      },

      join: function join(scope, name) {
        var message = arguments[2] === undefined ? {} : arguments[2];

        if (typeof scope === "string") {
          message = angular.isDefined(name) || {};
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
