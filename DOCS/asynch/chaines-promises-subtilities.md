### promise derecursification (or linearisation)

To handle iteration on somethng that may be (or not) promises without recursive calls.

Quite subtil : be sure you understand everything here... Realy important.

Try it in a js console to fuly understand what's happening.

```javascript

var toIterates = [ 1, true, deep("hello").delay(10), "world" ];
var stopOnError = false;

var done = function(s){

	// do something with s
	// ...
	console.log("item : ",s);

	// instead of calling recurive function here to handle more items : 
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


### natural conditional chain branching

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