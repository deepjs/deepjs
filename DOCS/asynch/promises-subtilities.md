# Promises subitlities

Good promised patterns are sometimes quite subtils and here is some tips to use it more correctly.

## Natural linearisation

Use linear promises management in place of recursive promises call.

good : 

```javascript

deep.when( something )
.done(function(success){
    // success = something
    return something_else;
})
.done(function(success){
    // success = something_else
    return "hello";
})
.done(function(success){
    // final success = "hello"
});

```

bad:

```javascript

deep.when( something )
.done(function(success){
    // success = something
    return deep.when( something_else )
    .done(function(success){
     	// success = something_else
     	return "hello";
	})
})
.done(function(success){
     // final success = "hello"
});

```


## Natural conditional branching

A difference between deep.Promise and other promises (as I know today), is that here : done, fail and always callbacks are executed in chain environnement. i.e. when you use 'this' in such callbacks, you have access to chain handler (deep.Promise or deep.Chain) API.

The cool trick here is that when such callback are executed, current queue (i.e. the functions that was placed in chain (through chain API) and that are not consummed yet) is backup and replaced by an empty queue.

This empty queue could be filled as you want, from within callbacks, using 'this' to access chain (or promise) API.

When such callbacks return, the previous queue is concatened at end of new queue.

The effect is that all chain API's call, from within such callbacks, are queued in front of final queue, and so will be executed before previous queued handles.

From chain point of view : you have inserted new handles between existent ones.

example :

```javascript


	deep.when(true)
	.done(function(s){
		if(s)
			this.done(function(s){
				return "hello";
			})
		else
			this.done(function(s){
				return "bye";
			});
	})
	.log("result : ")
	.log();

```


## linear promise iteration

To handle iteration on collection of objects (that may (or not) be promises) without recursive calls.

Based on same considerations than above.

Try it in a js console to fuly understand what's happening.

```javascript

var toIterates = [ 1, true, deep("hello").delay(10), "world" ];
var stopOnError = false;

var done = function(s){

	// do something with s
	// ...
	console.log("item : ",s);

	// instead of calling recursive function here to handle more items : 
	// we add new handle(s) in chain that will be placed just after this one (they are inserted in front of handles queue when we use 'this' in 'done', 'fail' and 'always' chain handlers.)
	
	if(toIterates.length > 0)
		this.when(toIterates.shift()) 
		.done(done);  	// fail hasn't been consummed : no need to readd it here. 
						// Insertion of done (in chain) will be done just after this done handler
	
	//... return a promise or wathever (including undefined)
};

var fail = function(e){
	if(!stopOnError && toIterates.length > 0)
		this.when(toIterates.shift())
		.done(done)
		.fail(fail);  // fail has been consummed : so we readd it here.
					  // Insertion of done and fail (in chain) will be done just after this fail handler
};

var iterator = deep.when(toIterates.shift())
.done(done)   	// iteration will insert done's iteration just after this one (and while success obviously) 
.fail(fail)   	// if something wrong : fail will be consummed. 
				// It could readd a 'done' and a 'fail' handler just after this handler (before .log())

.log("iteration ended"); // will only be executed once, at end of iteration

```



