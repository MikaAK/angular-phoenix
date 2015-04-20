'use strict'

angular.module('angular-phoenix', [])
  .factory('PhoenixBase', ['$rootScope', ($rootScope) => {
    var phoenix = angular.copy(window.Phoenix)

    phoenix.Channel.prototype.on = (() => {
      var _oldOn = angular.copy(phoenix.Channel.prototype.on)

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
          scope.$on('$destroy', () => this.bindings.splice(newCallback, 1))
      }
    })();

    phoenix.Channel.prototype.receive = (() => {
      var _oldReceive = angular.copy(phoenix.Channel.prototype.receive)

      return function receive(status, callback) {
        if (typeof status === 'function') {
          callback = status
          status   = null
        }

        if (!status)
          status = 'ok'

        return _oldReceive.call(this, status, callback)
      }
    })();

    phoenix.Channel.prototype.push = (() => {
      var _oldPush = angular.copy(phoenix.Channel.prototype.push)

      return function push(...args) {
        var res = _oldPush.apply(this, args)

        res.receive = (() => {
          var oldRecieve = (res.receive)

          return function receive(status, callback) {
            if (typeof status === 'function') {
              callback = status
              status  = null
            }

            if (!status)
              status = 'ok'

            return oldRecieve.call(this, status, callback)
          }
        })();

        return res
      }
    })();

    return phoenix
  }])

  .provider('Phoenix', function() {
    var urlBase           = '/ws',
        _autoJoinSocket   = true

    this.setUrl       = url  => urlBase = url
    this.setAutoJoin  = bool => _autoJoinSocket   = bool

    this.$get = ['PhoenixBase', (PhoenixBase) => {
      var socket     = new PhoenixBase.Socket(urlBase),
          channels   = new Map(),
          joinChannel= (name, message) => {
            var joinRes,
                promise,
                channel = channels.get(name)

            joinRes = (resolve, reject) => {
              channel = socket.join(name, message)

              channels.set(name, {status: 'fetching', channel})

              channel
                .after(5000, reject)
                .receive((chan) => resolve(chan))
            }

            promise = new Promise(joinRes)

            promise
              .then(() => {
                channels.set(name, {status: 'connected', channel, promise})
              })

            return angular.extend(channel, {promise})
          }

      if (_autoJoinSocket)
        socket.connect()

      return {
        base: PhoenixBase,
        socket: socket,
        leave(name) {
          if (!channels.get(name))
            return

          socket.leave(name)
          channels.set(name, {status: 'disconnected'})
        },

        join(name, message = {}) {
          var channel = channels.get(name),
              status  = channel && channel.status

          if (channel)
            if (status === 'fetching')
              return channel.channel
            else if (status === 'connected')
              if (Object.keys(message).length)
                socket.leave(name)
              else
                return channel.channel

          return joinChannel(name, message)
        }
      }
    }]
  })
