deep : the deep core
==========================

# workshop :

	presentation + demo : 1h30
		cadre : 
		http/rest - json - query - couche

		css/jquery inspired

		demo : show magic


	request	(log + read values)   (3 h)
		load, protocoles, usage, syntax 

	navigation	(3 h)
		query, root, parents

	modelisation	(utils)   (6 h)
		up
		bottom
		compose


		backgrounds
		flatten
		closure

	promises 		(run familly)   (6 h)
		closure
		when
		chain
		reject

		
		branches
		recursive promise return
		errors handling

	tests and (asynch) test cases    (+ pushTo familly)   (3 h)

	plugin 	(handler structure)				(2 h)

	//__________________________________________________________



	deep-ui   ((deep)interpretation + deepLoad)      6 h
		(re)loadables
		app-ctrl
		view-ctrl
		deep-linking
		renderables
		closure




	Schema and CCS

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

	current entries : 

		the current set of elements that the handler hold and on what you could apply chained opertations.

# API doc : 

	## start of chain

		deep( root, schema )
		
			root : object || uri || function || promise || chain (which will be seen as a unique promise)
				required
				it's the root object from where you want to start the chain

			schema : object || uri || function || promise
				optional 
				it's the root schema describing root object

	## cancel and rejection of chain.

		There are two functions, that are not chainable at all, that allow to cancel or reject a chain from the exterior.

		when you firing one of those on a chain handler, it will look all the further chained handler after 'then' familly (all others will simply be ignored), and will forward the cancel/reject on the chain on the deferred associated.

		it will empty the callQueue. Nothing more in the chain will be done.

		
	## modelisation 
		
		chain.up( objectToApplyUp || uri ) 

			Apply object (deep-copy from up) on current entries. 
			Load it if necessary.
			Merge _schema and backgrounds if any. 
			Keep protos as array.

		chain.bottom( objectToApplyBottom || uri )

			Apply object (deep-copy from bottom) on current entries. 
			Load it if necessary.
			Merge _schema and backgrounds if any. 
			Keep any collided protos as array of protos.

		chain.flatten()

			Apply any backgrounds property contained in current entries.
			(seek recursively under current entries)

		chain.schemaUp( retrievable, metaSchema )

		chain.schemaBottom( retrievable, metaSchema )

		chain.remove( query )

			remove properties gived by query.
			the root could not be removed.

		chain.replace( query, by )

			replace properties value gived by query by the second argument.
			the root could not be replaced.
			Deep will try to retrieve the second argument, so you could give retrievable

	## navigation 

		chain.query( query, errorIfEmpty )

			select current entries.
				if query start with any '.' : the query will be executed from current entries.
				if query start with any '/' : the query will be executed from root object.
			If errorsIfEmpty : It will produce chained error if results is empty

		chain.first()

			select the first element of current entries (remove others)

		chain.last()

			select the last element of current entries (remove others)

		chain.parents( errorIfEmpty )

			select the parents on current entries

		chain.root(obj||uri||promise||handler||deep_query_node, schema||uri||promise)

			replace current root and his eventual schema before continue.


	## read entries

		chain.each( callBack, { resultType: null || full } )

			callBack receive the current entry value (i.e. forEach equivalent)
			resultType:"full"  will return the DeepQuery nodes themselves (not just the entries values)

		chain.values( callBack )

			callBack receive the array of current entries schemas

		chain.paths( callBack )

			callBack receive the array of current entries paths

		chain.nodes( callBack )

			callBack receive the array of current entries themselves (DeepQuery nodes)

		chain.schemas( callBack )

			callBack receive the array of current entries schemas

	## calls

		chain.run( function || string, { reportCallBack : null||function, args : null||array })

			if(arg1 == function)
				arg1.apply(entries[i], args)    // if it's function : call it with each entry as "this"
			else
				entries[i][string](args) 		// if it's string : fire the corresponding method on any entry (if any)

			If the executed function return promise : the chain will wait 'resolve' or 'reject' before continue.
			If promise is rejected : the error is injected in the chain and could be read by .errors(...).
			If the executed function throw something, it will be catched by the chain and injected as error...

		chain.exec(function, { reportCallBack : null||function, args : null||array })

			will excute provided function without changing it's "this"

			If the executed function return promise : the chain will wait 'resolve' or 'reject' before continue.
			If promise is rejected : the error is injected in the chain and could be read by .errors(...).
			If the executed function throw something, it will be catched by the chain and injected as error... 

	## log

		chain.log(arguments)

			will log arguments as console do it (separate args with simple ',')

		chain.logValues(title, { pretty:null || true })

			will log current entries

	## delay

		chain.delay(ms)

			will delay the execution of any followers in chain.

		chain.wait( promise )

			will delay the execution of any followers until the promise is resolved
			continueIfRejected:null || false

	## loads

		How load externals content.

		chain.load( retrievable )

			if retrievable is provided (optional) : load it and replace current entries values by it.
			if no argument is provided, try to retrieve current entries values and replace by loaded contents (if any)
			if any throw or reject when loading : the error is injected in the chain (and could be catched with .errors( .. )).

		chain.deepLoad( )

			recursively analyse current entries and seek after string and functions.
			Retrieve them (see retrievable) and place loaded content at same place.
			if any throw or reject when loading : the error is injected in the chain (and could be catched with .errors( .. )).

	## interpret

		Interpretation of strings : any strings that contain '{ myDottedPth }' are interpretable.
		You give a context that will be used for replacement.
		ex: "hello { name }"  with context {name:"john"}  will give "hello john".

		ex : 

		deep({ msg:"hello { name }" }).deepInterpret({ name:"john" }).logValues().equal({ msg:"hello john" });

		//______

		deep({
		    msg:"hello { name }"
		})
		.query("./msg")
		.interpret({ name:"john" })
		.logValues()
		.equal("hello john");

		chain.interpret( context )

			if context (required) is a retrievable : load it before interpretation.
			
		chain.deepInterpret( context )

			recursively analyse current entries and seek after strings to interpret.
			if context (required) is a retrievable : load it before interpretation.


	## fail, done and then

		chain.fail( callback )

			callback : null || function(errors, branchCreator){ ... } 
			stopIfErrors: null(false) || true

		chain.done( callback )

			callback : null || function(success, branchCreator){ ... } 
			stopIfErrors: null(false) || true

		chain.then( callbackSuccess, callBackError )

			callbackSuccess : null || function(successes, branchCreator){ ... } 
			callbackError : null || function(errors, branchCreator){ ... } 
			stopIfErrors: null(false) || true

	## branches

		chain.branches( func )

			the way to start a bunch of branches in the chained calls.
			By default, if you don't return a promise all created branches are paralleles, 
			the inital chain is not delayed until branches are ended.
			If you want to delay the inital chain execution until all branches are completed : 
			you could return 'branches' (see below) that will be converted in promise.

			ex :
			chain.branches( function(branches)
			{
				branches.branch().query(...).load().errors(console.log);
				branches.branch().query(...).post().errors(console.log);
				//...
				return branches;
			});

			if you want to return a subset of branches promises : 
			you could use deep.all([array_of_promises]) :

				var branch = branches.create().myChain()...;
				//...
				return deep.all([deep.promise(branch), ...]);

	## tests, equality and validation

		chain.equal(needed, callBack)

			test strict equality with 'needed' on each current entry.
			callBack will receive the report.
			if any entry not match and stopIfNotEquals : the chain is stoped.
	
		chain.valuesEqual(needed, callBack)

			test strict equality b0,etween 'needed' and whole current entries values array.
			So 'needed' need to be an array.
			callBack will receive the report.
			if the array does not match and stopIfNotEquals : the chain is stoped.
	
		chain.assertTrue( testFunc, options )

			testFunc must return true 
			options (optional) could contains : 
				callBack : the callBack that will receive the report
				args : the args that will be passed to test function
				continueIfErrors : null||true
	
		chain.validate()

			validate current entries against their respective schema.

	## push to ...

		chain.pushHandlerTo(array)

		chain.pushNodesTo(array)

		chain.pushValuesTo(array)

		chain.pushPathsTo(array)

		chain.pushSchemasTo(array)

# deep.compose : Chained Aspect Oriented Programming

	When you collide two functions together, you could use deep.compose to manage how collision is resolved.
	Keep in mind that if you collide a simple function (up) on a composition (chained or not) : it mean : simply overwrite the composition by the function.
	So if you apply a composition from bottom on a function, the composition will never b applied.
	If you collide two compositions : they will be merged to give a unique composition chain.

	deep.compose.before( func )

		If it returns something, it will be injected as argument(s) in next function.
		If it return nothing, th original arguments are injected in next function.
		If it returns a promise or a chain : it will wait until the resolution of the returned value.
		If the returned object isn't a promise, the next function is executed immediately.

		ex : 

		var base = {
		    myFunc:deep.compose.after(function(arg)
		    {
		        return arg + " _ myfunc base";
		    })
		}

		deep(base)
		.bottom({
		    myFunc:function(arg){
		        return arg + " _ myfunc from bottom";
		    }
		});

		base.myFunc("hello");


	deep.compose.after( func )

		If the previous returns something, it will be injected as argument(s) in 'func'.
		If the previous return nothing, th original arguments are injected in 'func'.
		If the previous returns a promise or a chain : it will wait until the resolution of the returned value before executing 'func'.
		If the previous returned object isn't a promise, 'func' is executed immediately.

		Same thing for returned object(s) from 'func' : it will be chained..

		ex : 

		var base = {
		    myFunc:function(arg)
		    {
		        return arg + " _ myfunc base";
		    }
		}

		deep(base)
		.up({
		    myFunc:deep.compose.after(function(arg){
		        return arg + " _ myfunc from after";
		    })
		});

		base.myFunc("hello");

	deep.compose.around( func )

		here you want to do your own wrapper.
		Juste provid a function that receive in argument the collided function (the one which is bottom),
		an which return the function that use this collided function.

		ex : 

		var base = {
			myFunc:function(arg)
			{
				return arg + " _ myfunc base";
			}
		}

		deep(base)
		.up({
		    myFunc:deep.compose.around(function(collidedMyFunc){
		    	return function(arg){
		    		return collidedMyFunc.apply(this, [arg + " _ myfunc from around"]);
		    	}
		    })
		});

		base.myFunc("hello");


	deep.compose.parallele( func )

		when you want to call a function in the same time of an other, and to wait that both function are resolved (even if deferred)
		before firing eventual next composed function, you could use deep.compose.parallele( func )

		Keep in mind that the output of both functions will be injected as a single array argument in next composed function.
		Both will receive in argument either the output of previous function (if any, an even if deferred), or the original(s) argument(s).

		So as implies a foot print on the chaining (the forwarded arguments become an array) : 
		It has to be used preferently with method(s) that do not need to handle argument(s), and that return a promise just for maintaining the chain asynch management.

		An other point need to be clarify if you use deep(this).myChain()... in the composed function.
		As you declare a new branch on this, you need to be careful if any other of the composed function (currently parallelised) do the same thing.

		You'll maybe work on the same (sub)objects in the same time.

	## compositions chaining 

		You could do 
		var obj = {
			func:deep.compose.after(...).before(...).around(...)...
		}
		It will wrap, in the order of writing, and immediately, the compositions themselves.
		You got finally an unique function that is itself a composition (and so could be applied later an other functions).

		So when you do : 

			deep.parallele(...).before(...) and deep.before(...).parallel(...)

			it does not give the same result of execution.

			In first : you wrap the collided function with a parallele, and then you chain with a before.
			So finally the execution will be : the before and then the parallelised call.

			In second : you wrap the collided function with a before, and then wrap the whole in a parallele.
			So the execution will be the parallelised call, but on one branche, there is two chained calls (the before and the collided function). 

			Keep in mind that you WRAP FUNCTIONS, in the order of writing, and IMMEDIATELY.

# deep(this)	

		in any function/method of an object, you could use deep(this).myChain()...
		It will start a new chain on the current object.

		As when you use your chain, you could want to do queries that go anywhere else, from the ROOT, starting from 'this' :
		deep need to know where 'this' is locate in the whole layer (and to know its parent etc.).

		So if you use deep to fire a function somewhere in a layer, deep place the deep-query node needed 
		to achieve relatives and absolutes queries in the object, just the time of the call (if deferred : will wait the resolution before removing the node).

		So, if you want to do deep(this).query("../") from a method/function in your object, you NEED to fire this function/method through a chain.run() (see chain.run API)

# deep utils

	## deep.promise

		deep.promise( obj )

			if obj is a deferred (jquery or promised-io) : return its promise.
			if obj is DeepHandler (a chainable object) : simply return it.
			if obj is a branches creator (see chain.branches) : return all the branches promises (wait until last)

		deep.when( obj )

			return a chain on the object. the chain act as deferred/promise. You could add then, done, fail, ... and catch the result.
		
		deep.all( array )

			will return a chain that will wait until all promises contained in array are resolved.
			will be rejected at first promise from array that are rejected 
 
	
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

# examples

//______

deep("./json/simple.json").logValues("simple.json : ");

//______

deep("swig::./templates/simple.html")
.run(null, {args:{ names:"john", zip:12 }})
.log();

//______

deep("swig::./templates/simple.html")
.done( function( templates ){ 
	$("#content-container").html( templates[0]( { names:"Deep", zip:1060 } ) ); 
})
.log();

//_________

deep({template:"swig::./templates/simple.html"})
.deepLoad()
.run(function(){
  return $("#content-container").html( this.template({ name:"john" } ));
})
.log();

//_________

deep({
    template:"swig::./templates/simple.html", 
    datas:"json::./json/simple.json", 
    load:function(synchHandler){
    	return deep(this).query("/[template,datas]").load();
    },
    render:function(){
        $("#content-container").html(this.template(this));
    },
    setBehaviour:function(){

	}
})
.load()
.root()
.run("render")
.run("setBehaviour")
.log("____ refreshed");

//_____


var h = deep({})
.delay(500)
.log("first")
.delay(500)
.log("second");

deep.when(h).then(function(suc){
	console.log("success : ",suc);
}, 
function(arg){
	console.log("errors : ",arg);
});

h.reject({msg:"test rejection"});




# License
	authors : 
		Gilles Coomans <gilles.coomans@gmail.com>
	LGPL