'use strict'

angular.module('angular-phoenix', [])
  .value('Phoenix', window.Phoenix)
  .provider('Socket', function() {
    var apiBase = '/ws'

    this.setApi = url => apiBase = url

    this.$get = ['$rootScope', 'Phoenix', ($rootScope, Phoenix) => {
      var socket = new Phoenix.Socket(apiBase),
          channels = new Map()

      return {
        leave(name) {
          if (!channels.get(name))
            return

          socket.leave(name)
          channels.set(name, false)
        },

        join(scope, name, message = {}) {
          if (typeof scope === 'string') {
            message = name
            name = scope
            scope = null
          }

          var resolve = (resolve) => {
            var channel

            if (channel = channels.get(name))
              return resolve(channel)

            socket.join(name, message, channel => {
              channels.set(name, channel)

              resolve(angular.extend(channel, {
                on(eventName, callback) {
                  if (scope)
                    scope.$on('$destroy', () => {
                      socket.leave(name)
                      channels.set(name, false)
                      this.bindings.splice(callback, 1)
                    })

                  channel.on(eventName, callback)
                },

                trigger(e, t) {
                  this.bindings
                    .filter(function(t){return t.event===e})
                    .map(function(e){return $rootScope.$digest(e.callback(t))})
                }
              }))
            })
          }

          return new Promise(resolve)
        }
      }
    }]
  })
