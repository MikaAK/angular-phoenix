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
          scope.$on('$destroy', () => this.bindings.splice(this.bindings.indexOf(newCallback), 1))
      }
    })();

    return phoenix
  }])

  .provider('Phoenix', function() {
    var urlBase           = '/ws',
        _autoJoinSocket   = true

    this.setUrl       = url  => urlBase = url
    this.setAutoJoin  = bool => _autoJoinSocket   = bool

    this.$get = ['$q', 'PhoenixBase', ($q, PhoenixBase) => {
      var socket      = new PhoenixBase.Socket(urlBase),
          channels    = new Map(),
          joinChannel = (name, message) => {
            var joinRes,
                promise,
                channel

            joinRes = (resolve, reject) => {
              channel = socket.chan(name, message).join()

              channels.set(name, {status: 'fetching', channel})

              channel
                .after(5000, reject)
                .receive('ok', chan => resolve(chan))
                .receive('error', reject)
            }

            promise = new $q(joinRes)

            promise
              .then(() => {
                channels.set(name, {status: 'connected', channel, promise})
              }, () => console.warn('connection timed out...'))

            return angular.extend(channel, {promise})
          }

      if (_autoJoinSocket)
        socket.connect()

      PhoenixBase.Channel.prototype.leave = (() => {
        var _oldLeave = angular.copy(PhoenixBase.Channel.prototype.leave)

        return function leave() {
          channels.set(this.topic, {status: 'disconnected'})

          return _oldLeave.call(this)
        }
      })();


      return {
        base: PhoenixBase,
        socket: socket,
        leave(chan) {
          var channel = channels.get(chan.topic)
          if (!channel || channel.status === 'disconnected')
            return

          channel.leave()
        },

        join(scope, name, message = {}) {
          if (typeof scope === 'string') {
            message = name
            name    = scope
            scope   = null
          }

          var resChannel,
              channel = channels.get(name),
              status  = channel && channel.status

          if (channel)
            if (status === 'fetching')
              return channel.channel
            else if (status === 'connected')
              if (Object.keys(message).length)
                socket.leave(name)
              else
                return channel.channel

          resChannel = joinChannel(name, message)

          if (scope)
            resChannel.promise
              .then((chan) => {
                scope.$on('$destroy', () => chan.leave())
              })

          return resChannel
        }
      }
    }]
  })
