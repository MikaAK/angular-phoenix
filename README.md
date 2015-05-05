Angular Phoenix
===

Provides angular bindings to Phoenix so we can run events within the digest loop.

I've also taken the liberty of Promisifying phoenix!

### Installing

```bash
$ bower install --save angular-phoenix
```

**__Note:__** You must have the original `phoenix.js` loaded prior to this, it also makes use of promises so please have a promise library loaded or be using ES6!

### How to use
This is incomplete and only allows for a single socket connection per client

First we need to set our socket base url and add a global dependency.

`angular.module('myApp', ['angular-phoenix'])`

```javascript
.config(['PhoenixProvider', PhoenixProvider => {
  PhoenixProvider.setUrl('ws//localhost:9000/ws')
  PhoenixProiver.setAutoJoin(false) // Phoenix will autojoin the socket unless this is called
}])
```

**__Now were ready!!!__**

### Joining a channel
You can only join a channel once, if you provide a new message it will leave then rejoin the channel.
Just like normal phoenix we call `Phoenix.join` however we also can take scope!

```javascript
Phoenix.join('name', {})
  .receive(chann => {
    // Now our callbacks will get removed on scope destruction
    chann.on(scope, 'message', handler)
    chann.on('message', hander)
  })

Phoenix.join('name', {}).promise
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
      return Phoenix.join(`chatRoom:${$stateParams.id}`).promise
    }]
  }
})
```

### Leaving a channel
`Phoenix.leave('name')`

### Accessing base phoenix or current socket
```javascript
Phoenix.base // Contains original Phoenix
Phoenix.socket // Contains your current socket
```
