Angular Phoenix
===
Provides angular bindings to Phoenix so we can run events within the digest loop.

### Dependencies

- [Phoenix.js](https://raw.githubusercontent.com/phoenixframework/phoenix/964066d320afef59d99667e2bf84083f27d41e32/priv/static/phoenix.js)


### Installing

```bash
$ bower install --save angular-phoenix
```

### How to use
This is incomplete and only allows for a single socket connection per client

First we need to set our socket base url and add a global dependency.

`angular.module('myApp', ['angular-phoenix'])`

```javascript
.config(['PhoenixProvider', PhoenixProvider => {
  PhoenixProvider.setUrl('ws//localhost:9000/ws')
  PhoenixProvider.setAutoJoin(false) // Phoenix will autojoin the socket unless this is called
  // set default params with autojoin or connect
  PhoenixProvider.defaults = {
    user: 1
  }
}])
```
**Note:** Phoenix when injected will be a instance of `Phoenix.Socket` and will connect instantly unless 
`autoJoin` is false.

**If not with `autoJoin`:** defaults will still apply to Socket.connect() however you can pass custom ones to override 

**__Now were ready!!!__**

### Joining a channel
You can only join a channel once, if you provide a new message it will leave then rejoin the channel.
Just like normal phoenix we call `chan.join` however we also can take scope!

```javascript
var chan = Phoenix.channel('name', {})

// This callback will get removed on scope destruction
chan.on(scope, 'message', handler)

// This will never be destroyed
chnn.on('message', hander)
chan.join()
  .receive('ok', message => {
    
  })

chan.join().promise
  .then(chann => {
    // Now our callbacks will get removed on scope destruction
    chann.on(scope, 'message', handler)
    chann.on('message', hander)
  })
```

### Why add a promise?
For things like UI-Router this allows you to join into a channel as a resolve property!! 
```javascript
.state('chatRoom', {
  url: '/chatRoom/:id',
  resolve: {
    chatChannel: ['$stateParams', 'Phoenix', ($stateParams, Phoenix) => {
      return Phoenix.channel(`chatRoom:${$stateParams.id}`).join().promise
    }]
  }
})

// In the controller
_setupSocket() {
  this.chatChannel.on(this.$, 'new:message', (message) => {
    this.messages.push(message)
  })
  
  // Alternatively with no resolve
  var chan = Phoenix.channel('chatRoom', userParams)

  chan.join()
    .after(5000, () => console.warn('it didn\'t work'))
    // This is the same as just passing in "ok" and a callback
    .receive((message) => {
        this.message.push(message)
    })

  // Pass the current scope in so that when destroyed
  // the channel is left
  chan.join(scope)
}
```

## Accessing Phoenix
`Phoenix.BasePhoenix` is the original phoenix instance.
