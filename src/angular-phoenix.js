'use strict'

angular.module('angular-phoenix', [])
  .value('PhoenixBase', window.Phoenix)
  .provider('Phoenix', function() {
    var urlBase           = '/ws',
        _autoJoinSocket   = true

    this.setUrl       = url  => urlBase = url
    this.setAutoJoin  = bool => _autoJoinSocket   = bool

    this.$get = ['$rootScope', '$window', 'PhoenixBase', ($rootScope, $window, PhoenixBase) => {
      var socket     = new PhoenixBase.Socket(urlBase),
          channels   = new Map(),
          helpers    = {
        _extendChannel(channel) {
          var phoenixReplace = {
            on(scope, event, callback) {
              if (typeof scope === 'string') {
                callback = event
                event = scope
                scope = null
              }

              this.bindings.push({event, callback: (...args) => {
                callback(...args)
                $rootScope.$apply()
              }})

              if (scope)
                scope.$on('$destroy', () => this.bindings.splice(callback, 1))
            }
          }

          return angular.extend(channel, phoenixReplace)
        },

        joinChannel(name, message) {
          var joinRes,
              promise,
              channel = channels.get(name)

          joinRes = (resolve, reject) => {
            channel = socket.join(name, message)

            channel.receive = (() => {
              var _oldReceive = angular.copy(channel.receive)

              return function receive(status, callback) {
                if (typeof status === 'function') {
                  callback = status
                  status   = null
                }

                if (!status)
                  status = 'ok'

                _oldReceive.call(this, status, chan => callback(helpers._extendChannel(chan)))
              }
            })();

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

          return helpers.joinChannel(name, message)
        }
      }
    }]
  })
