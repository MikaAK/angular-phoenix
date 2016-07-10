'use strict';

angular.module('angular-phoenix', []).value('PhoenixBase', Phoenix).provider('Phoenix', [function () {
  var _this = this;

  var urlBase = '/ws',
      _autoJoinSocket = true;

  this.setUrl = function (url) {
    return urlBase = url;
  };
  this.setAutoJoin = function (bool) {
    return _autoJoinSocket = bool;
  };
  this.defaults = null;

  this.$get = ['$q', '$rootScope', 'PhoenixBase', function ($q, $rootScope, PhoenixBase) {
    var socket = new PhoenixBase.Socket(urlBase, { timeout: 5000, params: _this.defaults || {} }),
        runOnDestroy = function runOnDestroy(scope, cb) {
          return scope.$on('$destroy', cb);
        };

    PhoenixBase.Channel.prototype.on = function () {
      var _oldOn = angular.copy(PhoenixBase.Channel.prototype.on);

      return function on(scope, event, callback) {
        var _this2 = this;

        var newCallback;

        if (typeof scope === 'string') {
          callback = event;
          event = scope;
          scope = null;
        }

        newCallback = function newCallback() {
          callback.apply(undefined, arguments);
          $rootScope.$apply();
        };

        _oldOn.call(this, event, newCallback);

        if (scope) scope.$on('$destroy', function () {
          return _this2.off(event);
        });
      };
    }();

    PhoenixBase.Channel.prototype.join = function () {
      var _oldJoin = angular.copy(PhoenixBase.Channel.prototype.join);

      return function join(scope) {
        var _this3 = this;

        var res = _oldJoin.call(this);

        if (scope) runOnDestroy(scope, function () {
          _this3.leave();
        });

        res.promise = $q(function (resolve, reject) {
          res.receive('ok', function () {
            return resolve(_this3);
          }).receive('error', function () {
            return reject(_this3);
          });
        });

        return res;
      };
    }();

    if (_autoJoinSocket) socket.connect();else {
      var _socket$connect;

      var args = [socket];
      socket.connect = (_socket$connect = socket.connect).bind.apply(_socket$connect, args);
    }

    socket.PhoenixBase = PhoenixBase;

    return socket;
  }];
}]);
