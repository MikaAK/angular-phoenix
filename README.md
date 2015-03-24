Angular Phoenix
===

Provides angular bindings to Phoenix so we can run events within the digest loop.

I've also taken the liberty of Promisifying phoenix!

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
}])
```

**__Now were ready!!!__**

### Joining a channel
You can only join a channel once, if you provide a new message it will leave then rejoin the channel.
Just like normal phoenix we call `Phoenix.join` however we also can take scope!

```javascript
// $scope, eventName, message
Phoenix.join($scope, 'name', {})
  .then(chann => {
    // Now our callbacks will get removed on scope destruction
    chann.on('message', handler)
  })

Phoenix.join('name', {})
  .then(chann => {
    // We didn't pass scope these callbacks will always run
    chann.on('message', hander)
  })
```

### Leaving a channel
`Phoenix.leave('name')`

### Accessing base phoenix or current socket
```javascript
Phoenix.base // Contains original Phoenix
Phoenix.socket // Contains your current socket
```
