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

        joinChannel(scope, name, message) {
          var channel = channels.get(name)

          channel = socket.join(name, message)

          // channel.recieve = (() => {
          //   var _oldRecieve = angular.copy(channel.recieve)
          //
          //   return function receive(...args) {
          //     channels.set(name, {status: 'connected', channel: this})
          //
          //     return _oldRecieve(...args)
          //   }
          // })();

          channels.set(name, {status: 'fetching', channel})

          channel
            .after(5000, () => console.log("We're having trouble connecting..."))
            .receive(() => channels.set(name, {status: 'connected', channel}))

          return channel
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

          if (helpers.isFetching(name))
            return channel[1]

          if (channel && channel.status === 'connected' && Object.keys(message).length)
            socket.leave(name)

          return helpers.joinChannel(scope, name, message)
        }
      }
    }]
  })
