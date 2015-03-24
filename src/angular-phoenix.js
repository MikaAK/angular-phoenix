'use strict'

angular.module('angular-phoenix', [])
  .value('PhoenixBase', window.Phoenix)
  .provider('Phoenix', function() {
    var urlBase = '/ws'

    this.setUrl = url => urlBase = url

    this.$get = ['$rootScope', 'PhoenixBase', ($rootScope, PhoenixBase) => {
      var socket     = new PhoenixBase.Socket(urlBase),
          channels   = new Map()

      return {
        base: PhoenixBase,
        socket: socket,
        leave(name) {
          if (!channels.get(name))
            return

          socket.leave(name)
          channels.set(name, false)
        },

        join(scope, name, message = {}) {
          if (typeof scope === 'string') {
            message = angular.isDefined(name) || {}
            name = scope
            scope = null
          }

          var on = function(event, callback) {
            this.bindings.push({event, callback})

            if (scope)
              scope.$on('$destroy', () => this.bindings.splice(callback, 1))
          }



          var resolve = (resolve) => {
            var channel

            if (channel = channels.get(name))
              if (!message)
                return resolve(angular.extend(channel, {on}))
              else
                socket.leave(name)

            socket.join(name, message, channel => {
              channels.set(name, channel)

              resolve(angular.extend(channel, {
                on,
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
