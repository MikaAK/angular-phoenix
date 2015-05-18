Angular Phoenix
===
Provides angular bindings to Phoenix so we can run events within the digest loop.

### Dependancies 
- [Phoenix.js](https://raw.githubusercontent.com/phoenixframework/phoenix/847754db6b6b378ef4eaa5dfa7a8106e74db6a25/priv/static/phoenix.js)


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
  PhoenixProviver.setAutoJoin(false) // Phoenix will autojoin the socket unless this is called
}])
```
**Note:** Phoenix when injected will be a instance of `Phoenix.Socket` and will connect instantly unless 
`autoJoin` is false.

**__Now were ready!!!__**

### Joining a channel
You can only join a channel once, if you provide a new message it will leave then rejoin the channel.
Just like normal phoenix we call `chan.join` however we also can take scope!

```javascript
var chan = Phoenix.chan('name', {})

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
      return Phoenix.chan(`chatRoom:${$stateParams.id}`).join().promise
    }]
  }
})

// In the controller
_setupSocket() {
  this.chatChannel.on(this.$, 'new:message', (message) => {
    this.messages.push(message)
  })
  
  // Alternatively with no resolve
  var chan = Phoenix.chan('chatRoom', userParams)

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
