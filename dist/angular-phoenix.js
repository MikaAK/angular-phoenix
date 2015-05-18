'use strict';

angular.module('angular-phoenix', []).value('PhoenixBase', Phoenix).provider('Phoenix', [function () {
  var urlBase = '/ws',
      _autoJoinSocket = true;

  this.setUrl = function (url) {
    return urlBase = url;
  };
  this.setAutoJoin = function (bool) {
    return _autoJoinSocket = bool;
  };

  this.$get = ['$q', '$rootScope', 'PhoenixBase', function ($q, $rootScope, PhoenixBase) {
    var socket = new PhoenixBase.Socket(urlBase),
        runOnDestroy = function runOnDestroy(scope, cb) {
      return scope.$on('$destroy', cb);
    };

    PhoenixBase.Channel.prototype.on = (function () {
      var _oldOn = angular.copy(PhoenixBase.Channel.prototype.on);

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
          return _this.off(event);
        });
      };
    })();

    PhoenixBase.Channel.prototype.join = (function () {
      var _oldJoin = angular.copy(PhoenixBase.Channel.prototype.join);

      return function join(scope) {
        var _this2 = this;

        debugger;
        var res = _oldJoin.call(this);

        if (scope) runOnDestroy(scope, function () {
          _this2.leave();
        });

        this.promise = $q(function (resolve, reject) {
          res.after(5000, reject).receive('ok', function () {
            return resolve(_this2);
          }).receive('error', function () {
            return reject(_this2);
          });
        });

        return res;
      };
    })();

    if (_autoJoinSocket) socket.connect();

    socket.PhoenixBase = PhoenixBase;

    return socket;
  }];
}]);
