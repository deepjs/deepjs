# deep promise

[Back to tutorials](../tutorials.md)


A Promise manage successes and errors (its state) through chained notation.

More exactly, a deep-promise, as all promises (thx Kris ;)), is a chain handler that inject a result (a success) or an error in chained callbacks, and manage callbacks response (maybe asynchronously) and use it to define it new state, that could be forwarded to more chained callbacks.

Fondamentaly, there is two kinds of callback family : 

* .done(function(success){}) : callback will only be fired if promise state is a success
* .fail(function(error){}) : callback will only be fired if promise state is an error

Those two families could be used together with .then( doneCallBack, failCallBack ), which is exactly the same as doing .done(callBack).fail(callback)

The big difference from simple callback pattern (as nodejs abuse), is that the promise continue to hold its state, long time after primary events, and provides way (when adding a new callback when needed) to get its state at any time after primary events.


Callbacks return rule : 

if returned value is :

* undefined : take previous success or error (so it does not modify current promise state)
* an error : inject error as failure in chain (so change state to 'error')
* a promise : wait promise resolution to either inject its success or its error in current chain.
* any other type : inject it as success in chain (so if the promise was in 'error' state : it's now in 'success' state)

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

It does not modifiy promise state.

### .equal( obj )

Executed only if promise is in success state.

Test success struct equality to obj. Useful for testcasing.

If not equal, it inject a PreconditionFailed error (status 412) in promise, with equality report.

If equal : it does not modifiy promise state.

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
But log current context in place of promise state.
it does not modifiy promise state.

## Deferred

How to use deferred.

## deep core promised oriented API

### deep.when

### deep.all

### deep.get

### deep.getAll

### promises iterator

direct API

```javascript 
deep.utils.iterate([
	1,2,deep("delayed").delay(10), new Error("hhh"),4
], 
function(s){
    return "e"+s;
}, function(e){
    return "error managed";  // try to coment or not this line 
})
.log(); // ==> ["e1", "e2", "edelayed", "error managed", "e4"]
```

through chain :

```javascript
deep([1,2,deep("delayed").delay(10), new Error("hhh"),4])
.iterate(function(s){
    return "e"+s;
}, function(e){
    return "error managed";
})
.log(); // ==> ["e1", "e2", "edelayed", "error managed", "e4"]
```

Could be used to iterate through functions as :

```javascript 
deep.utils.iterate([
	function(arg){ return deep("hello "+arg).delay(5); }, 
	function(arg){ return deep(arg+" world").delay(8); }
], function(s){
    return s("deep");
})
.log(); // ==> ["hello deep", "deep world"]
```


### wired asynch functions

```javascript 
deep.wired([
	function(arg){
	    return deep.when("arg was : "+arg).delay(5);
	},
	function(arg){
	    return new Error("plaf : "+arg);
	},
	function(arg){
	    return deep.when("arg 2 was : "+arg).delay(5);
	}
],
"hello",
{
    test:1
},
function(s){
    return "{" + s + "}";
},
function(e){
    return "{error managed "+e.message+"}";
})
.log(); // => {arg 2 was : {error managed plaf : {arg was : hello}}}
``` 

```javascript
deep({
    func1:function(arg1, arg2){
        return ["arg11:"+arg1,"arg21:"+arg2];
    },
    func2:function(arg1, arg2){
        return ["arg12:"+arg1,"arg22:"+arg2];
    },
    func3:function(arg1, arg2){
        return ["arg13:"+arg1,"arg23:"+arg2];
    }
})
.query("./(func.*)")
.wired(["hello","world"])
.log(); // => ["arg13:arg12:arg11:hello", "arg23:arg22:arg21:world"]

```



