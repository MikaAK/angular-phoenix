'use strict'

angular.module('angular-phoenix', [])
  .value('PhoenixBase', Phoenix)
  .provider('Phoenix', [function() {
    var urlBase           = '/ws',
        _autoJoinSocket   = true

    this.setUrl       = url  => urlBase         = url
    this.setAutoJoin  = bool => _autoJoinSocket = bool
    this.defaults     = null

    this.$get = ['$q', '$rootScope', 'PhoenixBase', ($q, $rootScope, PhoenixBase) => {
      var socket       = new PhoenixBase.Socket(urlBase),
          runOnDestroy = (scope, cb) => scope.$on('$destroy', cb)

      PhoenixBase.Channel.prototype.on = (() => {
        var _oldOn = angular.copy(PhoenixBase.Channel.prototype.on)

        return function on(scope, event, callback) {
          var newCallback

          if (typeof scope === 'string') {
            callback = event
            event = scope
            scope = null
          }

          newCallback = (...args) => {
            callback(...args)
            $rootScope.$apply()
          }

          _oldOn.call(this, event, newCallback)

          if (scope)
            scope.$on('$destroy', () => this.off(event))
        }
      })();

      PhoenixBase.Channel.prototype.join = (() => {
        var _oldJoin = angular.copy(PhoenixBase.Channel.prototype.join)

        return function join(scope) {
          var res = _oldJoin.call(this)

          if (scope)
            runOnDestroy(scope, () => {
              this.leave()
            })

          res.promise = $q((resolve, reject) => {
            res
              .after(5000, reject)
              .receive('ok',    () => resolve(this))
              .receive('error', () => reject(this))
          })

          return res
        }
      })();

      if (_autoJoinSocket)
        socket.connect(this.defaults || {})
      else {
        let args = [socket]

        if (this.defaults)
          args.push(this.defaults)

        socket.connect = socket.connect.bind(...args)
      }

      socket.PhoenixBase = PhoenixBase

      return socket
    }]
  }])
