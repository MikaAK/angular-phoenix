'use strict'

angular.module('angular-phoenix', [])
  .value('PhoenixBase', window.Phoenix)
  .provider('Phoenix', function() {
    var urlBase           = '/ws',
        _autoJoinSocket   = true,
        _disableMultiJoin = true

    this.setUrl       = url  => urlBase = url
    this.setMultiJoin = bool => _disableMultiJoin = bool
    this.setAutoJoin  = bool => _autoJoinSocket   = bool

    this.$get = ['$rootScope', '$window', 'PhoenixBase', ($rootScope, $window, PhoenixBase) => {
      var socket     = new PhoenixBase.Socket(urlBase),
          channels   = new Map(),
          helpers    = {
        _extendChannel(scope, channel) {
          var phoenixReplace = {
            // Copy fn from phoenix.js and addd scope logic
          }

          return angular.extend(angular.copy(channel), phoenixReplace)
        },

        joinChannel(name, message) {
          var joinRes,
              promise,
              channel = channels.get(name)

          joinRes = (resolve, reject) => {
            channel = socket.join(name, message)

            channel.receive = (() => {
              var _oldReceive = angular.copy(channel.receive)

              return function receive(scope, status, callback) {
                if (typeof scope === 'function') {
                  callback = angular.copy(scope)
                  scope    = null
                }

                if (!callback && typeof status === 'function') {
                  callback = angular.copy(status)
                  status   = null
                }

                if (!status)
                  status = 'ok'

                return _oldReceive.call(this, status, callback)
              }
            })();

            channels.set(name, {status: 'fetching', channel})

            channel
              .after(5000, reject)
              .receive(resolve)
          }

          promise = new Promise(joinRes)
            .then(() => channels.set(name, {status: 'connected', channel, promise}))

          return angular.extend(channel, {promise})
        },

        isFetching(name) {
          var channel = channels.get(name)
          return channel && channel.status === 'fetching'
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
          var channel = channels.get(name)

          if (channel && channel.status === 'fetching')
            return channel.channel

          if (_disableMultiJoin && channel &&
              channel.status === 'connected' &&
              Object.keys(message).length)
            socket.leave(name)

          return helpers.joinChannel(name, message)
        }
      }
    }]
  })
