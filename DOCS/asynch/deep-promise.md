# deep promise

A Promise manage successes and errors (its state) through chained notation.

More exactly, a deep-promise, as all promises (thx Kris ;)), is a chain handler that inject a result (a success) or an error in chained callbacks, and manage callbacks response (maybe asynchronously) and use it to define it new state, that could be forwarded to more chained callbacks.

Fondamentaly, there is two kinds of callback family : 

* .done(function(success){}) : callback will only be fired if promise state is a success
* .fail(function(error){}) : callback will only be fired if promise state is an error

Those two family could be used together with .then( doneCallBack, failCallBack ), which is exactly the same as doing .done(callBack).fail(callback)

The big difference from simple callback pattern (as nodejs abuse), is that the promise continue to hold its state, long time after primary events, and provides way (when adding a new callback when needed) to get its state at any time after primary events.


Callbacks return rule : 

if returned value is :

* undefined : take previous success
* an error : inject error as failure in chain
* a promise : wait promise resolution to either inject its success or its error in current chain.
* any other type : inject it as success in chain

if an error is thrown : 
* from within any handle : it depends if chain catch errors (by default, it catch them).

Remarque : that's true for both done and fail families. 
That implied that you could always catch and handles errors produced within any callbacks with a .fail(callback) placed after in chain (that will be fired as promise state is error), and then return (in the fail callback) something that's not an Error, and so reset current promise state to success.

example :

```javascript

deep.when(new Error("hello error"))
.done(function(success){
	// this callback will simply be ignored, as promise state is 'error'.
	// ...
})
.fail(function(e){
	// this one will be fired as promise state is 'error'
	// but as it return nothing (so undefined), it does not modifiy promise state.
	console.log("error : ", e.toString());
})
.fail(function(e){    // also fired as promise state stills 'error'.
	return "error handled : continue chain";
})
.done(function(success){ 	// this one will be fired, as state has been reseted to 'success'
	console.log("success : ", success);
});

```


## Additionnal Promise API

### .catchErrors( bool )

set if promise catch or not errors produced within callback. default to true.

### .always(function(success, error){})

will always be executed.

### .log()

always executed.

if you provide no arguments :
will log current state. (success or error)

if you provide a list of arguments (i.e. .log(arg1, "hello", myObject, 12, ...)), it will print them as console log would do.

so you could always multiply .log() as this :

```javascript
deep.when(true)
.log("success  :" )
.log();
```

### .equal( obj )

test success struct equality to obj. Useful for testcasing.

If not equal, it inject a PreconditionFailed error (status 412) in promise, with equality report.

### .when( something )

Not exactly the same thing as deep.when( something ) that return a promise that waiting 'something' (you start a promise as this),
when you use it in an existant promise chain, it will wait 'something' and take it result as current state before continuing.

```javascript

deep.when( something )
.done(function( somethingResult ))
...
.when( anotherthing )
.done(function( anotherthingResult ){
	...
});

```

### .delay( ms )

executed only in success state.
Add an artifical delay in chain execution. useful for test and debug.


### .context(key, value)

For painless asynchrone context management. (thanx [Kris](https://github.com/kriszyp) ! ;)
Set in local deep.context the provided value under 'key'.
See [asynch-context-management](./asynch-context-management.md) for more details.


### .logContext()

same thing as .log() above.
But log current context without arguments.

## Deferred

How to use deferred.

## deep core promised oriented API

### deep.when

### deep.all

### deep.get

### deep.getAll