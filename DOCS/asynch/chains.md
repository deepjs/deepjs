# deep chain

[Back to tutorials](../tutorials.md)

First, a deep chain is like a [Promise](./deep-promise.md). It inherit directly from Promise API.
You could wait for the chain resolution or rejection.

In addition of state (that promise API manage) a deep chain hold some values between chained callBacks and offer an API to manipulate them.

Think about jquery. When your doing something like this : 

```javascript 
$('.my-selector').find('.other-selector').click(function(e){ ... });
```
Here, you selecting something in DOM elements, then doing a second query to find elements from the first results set, and finaly you attach a click handler to them. Simple...

You could do something equivalent with deep.
```javascript
deep( anObject ).query("/my/query").query("./second/query").up(deep.compose.after(function(){ ... }));
```
Here you start from an arbitrary object (equivalent to root DOM in jquery), make queries to select something from this root, make a second query to select something from previously selected set, and finaly attach some functions to some objects (or compose them, etc.).

So, jquery :
* helps you to manipulate DOM's elements
* allows you to select DOM's elements with a jquery selector (extension of CSS selector)
* and a jquery handler holds DOM elements between call on this handler

deepjs chain : 
* helps you to manipulate standard javascript objects, values and functions
* allows you to select js objects, values and functions with a deep-query
* and a deep chain handler holds javascript objects, values and functions between call on this handler

Same same... but different... ;)

Now, keep in mind that deep chain it's not just there for sugar-chained-syntax as jquery does principaly.

deep.Chain is mainly there to help you managing asynchrone stuffs.

So as promise's API wait any promise returned from any chained callback before continuing, chain particular API do the same.
And as much as possible, chain API hides difference between synch and asynch calls.

example :

```javascript

var obj = {
	func1:function(arg){
		console.log("func1 : ", arg);
		// we could return anything here, including promises
		return "my arg was : "+arg;
	},
	func2:function(arg){
		console.log("func2 : ", arg);
		// we could return anything here, including promises
		return "my arg was : "+arg;
	}
}

// Without chain
deep.when(obj.func1("hello"))
.done(function(success){
	console.log("func1 result : ", success);
    return obj.func2("world");		// we use [natural promise linearisation](./promises-subtilities.md)
})
.done(function(success){
	console.log("func2 result : ", success);
    console.log("end of calls");
});


// with chain
deep(obj)
.run("func1", ["hello"])
.log()
.run("func2", ["world"])
.log();

```

The fact here is that in real world, you often don't want to know if obj.func1 and obj.func2 return or not a promise (so maybe some asynch stuffs to fetch).
So when using deep chain, you could use it transparently.

## start of chain

```javascript
deep( root, schema )
``` 
return a deep.Chain handler.

root : primitive_var || object || array || function || uri || promise || chain (which will be seen as a unique promise)
	required
	it's the root object from where you want to start the chain

schema : object || uri || function || promise
	optional 
	it's the root schema describing root object
		
## modelisation 
		
### chain.up( object(s)ToApplyUp || uri(s) ) 

Apply object (deep-copy from up) on current entries. 
Load them if necessary.

### chain.bottom( object(s)ToApplyBottom || uri(s) )

Apply object(s) (deep-copy from bottom) on current entries. 
Load them if necessary.

### chain.flatten()

Apply any backgrounds properties contained in current entries.
(seek recursively (deeply) under current entries).
See [backgrounds-and-flatten.md](../backgrounds-and-flatten.md).

### chain.remove( query )

remove properties gived by query.
the root could not be removed.

### chain.replace( query, by )

replace properties value gived by query by the second argument.
Deep will try to retrieve the second argument, so you could give retrievable

## navigation 

### chain.query( query, errorIfEmpty )

select current entries.
	if query start with any '.' : the query will be executed from current entries.
	if query start with any '/' : the query will be executed from root object.
If errorsIfEmpty : It will produce chained error if results is empty

### chain.first()

select the first element of current entries (remove others)

### chain.last()

select the last element of current entries (remove others)

### chain.parents( errorIfEmpty )

select the parents on current entries

### chain.deep(obj||uri||promise||handler||deep_query_node, schema||uri||promise)

continue chain with new root and (optional) schema

## read entries

### chain.each( callBack )

callBack receive each chain's node value (i.e. forEach equivalent)

### chain.values( callBack )

callBack receive the array of current entries schemas. If chain holds a single object, it will be wrap in an array before injection.

### chain.val( callBack )

callBack receive the holded object(s) (if chain hold a single object : will return this object. if chain hold an array : return this array)

### chain.nodes( callBack )

callBack receive the array of current nodes themselves (DeepQuery nodes)

## calls

### chain.run( function || string, args : array )

Will cycle on each chain's nodes and execute provided function if any.
If no function (or string) is provided (or set to null), will look if node's value is a function, and so will fired it from its original context.


```javascript
if(typeof fn === 'function')
	// if 'fn' is function : call it with each node's value as "this"
	return fn.apply(this._nodes[i].value, args);

else if(typeof fn === 'string' && typeof this._nodes[i].value[fn] === 'function')
	// if 'fn' is string : fire the corresponding method on any entry (if any)
	return this._nodes[i].value[fn].apply(this._nodes[i].value, args);

else if(!fn && typeof this._nodes[i].value === 'function')
	return this._nodes[i].value.apply(this._nodes[i].ancestor.value, args);
	
```

If the executed function return promise : the chain will wait promise resolution (or rejection) before injecting its state in current chain.

If the executed function throw something, it will be catched by the chain and injected as error.

Usage examples :
```javascript

deep({
	a:function(arg){
		console.log("hello world : ", arg);
	},
	b:function(arg){
		console.log("b say : Hi ! : ", arg)
	},
	title:"my object's title"
})
.run("a","deepjs powaaa!")
.run(function(){
	console.log("this is : ", this);
})
.query("/[a,b]")
.run(null, "last call !");

```
output : 

	hello world : deepjs powaaa!
	this is : Object { title="my object's title", a=function(), b=function()}
	hello world : last call !
	b say : Hi ! : last call !


Note that if fired function is runned multiple time (as with query in example above) and return promises,
they are executed parallely, not serialy.

So the chain fires function(s), wait for all results (promised or not) parallely, and inject the results as success (or error) in current chain.


### chain.exec(function, { reportCallBack : null||function, args : null||array })

will excute once provided function without changing it's environnement (i.e. with doing .apply or .call on function itself)

If the executed function return promise : the chain will wait 'resolve' or 'reject' before continue.
If promise is rejected : the error is injected in the chain and could be read by .errors(...).
If the executed function throw something, it will be catched by the chain and injected as error... 


## chain.logValues(title, { pretty:null || true })

will log current entries

## loads

How to load externals content.

### chain.load( context, destructive )

	if no argument is provided, try to retrieve current entries values and replace by loaded contents (if any)
	if any throw or reject when loading : the error is injected in the chain (and could be catched with .errors( .. )).

### chain.deepLoad( context, destructive )

	recursively analyse current entries and seek after string and functions.
	Retrieve them (see retrievable) and place loaded content at same place.
	if any throw or reject when loading : the error is injected in the chain (and could be catched with .errors( .. )).

## interpret

		Interpretation of strings : any strings that contain '{ myDottedPth }' are interpretable.
		You give a context that will be used for replacement.
		ex: "hello { name }"  with context {name:"john"}  will give "hello john".
		
		if context (required) is a retrievable : load it before interpretation.

		ex : 
```javascript
deep({
    msg:"hello { name }"
})
.query("./msg")
.interpret({ name:"john" })
.logValues()
.equal("hello john");
```

## branches

### chain.branches( func )

the way to start a bunch of branches in the chained calls.
By default, if you don't return a promise all created branches are paralleles, 
the inital chain is not delayed until branches are ended.
If you want to delay the inital chain execution until all branches are completed : 
you could return 'branches' (see below) that will be converted in promise.

ex :
```javascript 
chain.branches( function(branches)
{
	branches.branch().query(...).load().errors(console.log);
	branches.branch().query(...).post().errors(console.log);
	//...
	return branches;
});
```
if you want to return a subset of branches promises : 
you could use deep.all([array_of_promises]) :
```javascript
	var branch = branches.create().myChain()...;
	//...
	return deep.all([deep.promise(branch), ...]);
```
## tests, equality and validation


### chain.valuesEqual(needed)

test strict equality b0,etween 'needed' and whole current entries values array.
So 'needed' need to be an array.
callBack will receive the report.
if the array does not match and stopIfNotEquals : the chain is stoped.

### chain.assertTrue( testFunc, options )

testFunc must return true 
options (optional) could contains : 
	callBack : the callBack that will receive the report
	args : the args that will be passed to test function
	continueIfErrors : null||true

### chain.validate()

validate current entries against their respective schema.
see [validation](../json-schemas/validations.md).

# deep utils

## deep.utils

	deep.utils.up(src, target, schema)

	deep.utils.bottom(src, target, schema)

	deep.utils.deepArrayFusion2(first, second, schema)

	deep.utils.arrayUnique(arr, uniqueOn)

	deep.utils.setValueByPath(object, path, value, pathDelimitter)

	deep.utils.deletePropertyByPath(object, path, pathDelimitter)

	deep.utils.retrieveValueByPath(object, path, pathDelimitter)

	deep.utils.retrieveFullSchemaByPath(schema, path, pathDelimitter)

## deep.query(root, query, options)

## deep.rql(array, rql, options)

# Lexic
	
	deep-copy up(above,below)

		apply object together as a stack of layer.
		The values contained in the layer above will override any collided values from the layer below.
		If the layer above contain deep.collider or deep.compose : they will be applied or wrapped.

	deep-copy bottom(below,above)

		apply object together as a stack of layer.
		The values contained in the layer above will override any collided values from the layer below.
		If the layer above contain deep.collider or deep.compose : they will be applied or wrapped.

	chain

		a chain of functions calls that manage synch/asynch for you

	select

		when we say "select values from queries in the deep handler", it mean : take the query result set as the current entries of the handler.

	merge : see deep-copy

	retrievable : 
			any string in deep request format (ex: "swig::template.html", "json::/campaigns/?owner=15" )
			any promise
			any object
			any function

	query : 

		a deep query

	current entries (or nodes) : 

		the current set of elements that the handler hold and on what you could apply chained opertations.


# examples

```javascript
//______

deep("json::./json/simple.json").logValues("simple.json : ");

//______

deep("swig::./templates/simple.html")
.run(null, { names:"john", zip:12 })
.log();

//______

deep("swig::./templates/simple.html")
.done( function( template ){ 
	$("#content-container").html( template( { names:"Deep", zip:1060 } ) ); 
})
.log();

//_________

deep({template:"swig::./templates/simple.html"})
.deepLoad(null, true)
.run(function(){
  return $("#content-container").html( this.template({ name:"john" } ));
})
.log();

//_________

deep({
    template:"swig::./templates/simple.html", 
    datas:"json::./json/simple.json", 
    load:function(synchHandler){
    	return deep(this).query("/[template,datas]").load(null, true);
    },
    render:function(){
        $("#content-container").html(this.template(this.datas));
    },
    setBehaviour:function(){

	}
})
.load()
.run("render")
.run("setBehaviour")
.log("____ refreshed");

//_____


``` 


# License
	author : 
		Gilles Coomans <gilles.coomans@gmail.com>
	LGPL 3.0
