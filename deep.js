
/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>

	Stable : 
		deep-query/rql
		deep
		utils


Cadre : 

Layered/Aspect/OO
	relations, inheritance and relative path
MVC
	up-bottom
	
Asynch
Thin Server / Rest
JSON

Structure :
	utils 						ok
		logs, pushTo, ...

	gestion asynch 				ok
		promises
		chain
		branches
		rejection
		

		cancel 					need more 
	

	modelisation objet 			ok
		up, bottom, etc

	navigation 					stable
        query


	CCS
	class composition

	colliders 


TODO : 
	deep
		.query just execute query (on each current entries) and inject the concatenation of results in the chain
		.move change current entries

	deep-compose : manage classes
	deep-collider : write more
	deep-schema and CCS :
		CCS model and algorithm

	deep-request : complete refactoring
	
	deep-plugin : 
		Handler pattern
		handler base objects

	promise pattern : 
		the first and only argument must give light weight (and secured - in a small dedicated object) API to access the chain handler itself SYNCHRONOUSLY 
		And : for asynch management : it must give access for branches creator and will act as promise when returned (only for branches therefor all other function of the handler are synchro)

		example : 
			deep(...).done(function(success, handler){
				var values = handler.values();
				...
				if(true)
					return handler.cancel();
				...
				if(true)
					return handler.query("./tata");
				...
				if(error)
					return handler.error("what you want")

				handler.branch().mybranch();
				handler.branch().mybranch();
				handler.branch().mybranch();

				return handler;
			})


	test cases pattern : 
		assertEqual
		assertValuesEqual
		assertTrue
		assertFalse
		validate

		maybe pattern to keep (clone) whole trunc to be execute in general test caser on demand (later)
			example :

			to store and execute multiple time the cloned chain (or any chain) for tests purposes : we need something like :

			var d = deep(...).pushTo(tests).keepQueue().mychain()

			and

			d.restart()

			==> implies to modify the nextQueueItem
				and to keep first reference of the chain.


		put condition on tests and validation family : 
			good pattern : keep a global with flags that will be used as condition
				example : 
					deep(...).mychain().assertEqual({}, { condition:console.flags.bazar, callBack:Reporter.report })
				so you could debug live by playing with flags
	autobahn : 
		secured chain
		jsgi stack
		clean headers


 */
/*
ADDITIONAL CHAIN METHODS

reverse

logNodes
logPaths

Queries : 
options:
	deepest
	nearest
	readius
	deepness

whole new functionality
	selector


	call back context : 
	in chain : use synch handler as context (no more second arguments)
	in promises : use simple empty object for the moment (maybe add particular API)
*/

if(typeof define !== 'function')
{
	var define = require('amdefine')(module);
}

define(["require", "deep/ie-hacks","deep/utils", "deep/deep-rql","deep/deep-request", "deep/deep-schema",  "deep/promise", "deep/deep-query", "deep/deep-compose"],
function(require){


	// console.log("Deep init");

	if(!console.warn)
		console.warn = console.log;
	if(!console.error)
		console.error = console.log;
	if(!console.info)
		console.info = console.log;

	var Validator = require("deep/deep-schema");
	var DeepRequest = require("deep/deep-request");
	var utils = require("deep/utils");
	var promise = require("deep/promise");
	var Querier = require("deep/deep-query");
	var deepCompose = require("deep/deep-compose");


	var SynchHandler = function (obj, schema) 
	{
		if(obj instanceof DeepHandler)
		{
			this.chain = obj;
		}	
		else 
			this.chain = deep(obj, schema);
	}
	SynchHandler.prototype = {
		chain:null,
		branches:null,
		query:function (q, options) {
			var res = deep.chain.values(this.chain.query(q, options));
			return res;
		},
		/*select:function (q, options) {
			this.chain.query(q, options);
			return this;
		},*/
		cancelBranches:function (reason) {
			if(this.branches)
				this.branches.forEach(function (b) {
					b.cancel();
				})
			return this;
		},
		values:function () {
			return deep.chain.values(this.chain);
		},
		nodes:function () {
			return deep.chain.nodes(this.chain);
		},
		paths:function () {
			return deep.chain.paths(this.chain);
		},
		schemas:function () {
			return deep.chain.schemas(this.chain);
		},
		branch:function ()
		{
			if(!this.branches)
				this.branches = [];
			var cloned = cloneHandler(this.chain, true);
			cloned.running = false;
			this.branches.push(cloned);
			nextQueueItem.apply(cloned, [this.chain.result, this.chain.failure]);
			return cloned;
		},
		_isBRANCHES_:true,
		replace:function (what, by) {
			this.chain.replace(what,by);
			return thiss;
		},
		remove:function (what) {
			this.chain.remove(what);
			return this;
		},
		up:function () {
			var args = Array.prototype.slice.call(arguments);
			this.chain._entries.forEach(function (e) {
				args.forEach(function  (a) {
					deep.utils.up( a, e.value, e.schema );
				})	
			})
			return this;
		},
		bottom:function () {
			var args = Array.prototype.slice.call(arguments);
			this.chain._entries.forEach(function (e) {
				args.forEach(function  (a) {
					deep.utils.bottom( a, e.value, e.schema );
				});
			})
			return this;
		},
		log:function () {
			var args = Array.prototype.slice.call(arguments);
			this.chain.log.apply(this.chain, args);
			return this;
		},
		logValues:function (msg) {
			this.chain.logValues(msg);
			return this;
		},
		error:function (argument) {
			var er = new Error(argument);
			er.values = deep.chain.values(this.chain);
			return er;
		}
	}



	function callFunctionFromValue(entry, functionName, options) 
	{
		options = options || {};
		if(options.args && !(options.args instanceof Array))
			options.args = [options.args];
		if(entry.value && entry.value[functionName])
		{
			entry.value._deep_entry = entry;
			var prom = entry.value[functionName].apply(entry.value, options.args || []);
			if(prom && prom.then)
				prom.then(function () {
					delete entry.value._deep_entry;
				},
				function () {
					delete entry.value._deep_entry;
				});
			else
				delete entry.value._deep_entry;
			return prom;
		}	
		return prom;
	}
	function runFunctionFromValue(entry, func, options) 
	{
		//console.log("runFunctionFromValue", entry)
		options = options || {};
		entry.value._deep_entry = entry;
		var prom = func.apply(entry.value, options.args || []);
		if(prom && prom.then)
			prom.then(function () {
				delete entry.value._deep_entry;
			},
			function () {
				delete entry.value._deep_entry;
			});
		else
			delete entry.value._deep_entry;
		return prom;
	}



	function nextQueueItem(result, failure )
	{
		//console.log("nextQueueItem ", this.running, " - ", this.callQueue, result, failure);
		if(this.running || this.rejected)
			return;
		this.running = true;
		var self = this;
		if((typeof failure === 'undefined' || failure == null) && (typeof result === 'undefined' || result == null))
		{
			failure = this.reports.failure;
			result = this.reports.result;
		}
		else
		{
			this.reports.failure = failure;
			this.reports.result = result;
		}

		if(this.callQueue.length>0)
		{
			var next = this.callQueue.shift();
			var error = null;
			try{
				var previousContext = deep.context;
				if(previousContext !== this.context){
					if(previousContext && previousContext.suspend){
						previousContext.suspend();
					}
					deep.context = this.context;
					if(this.context && this.context.resume){
						this.context.resume();
					}
				}
				if(!failure)
				{
					if(typeof next === "object")
						next.func(result,failure);
					else
						next(result,failure);
				}
				else if(next._isTHEN_)
					next(result,failure);
				else if(!this.rejected)
					this.reject(failure);
			}
			catch(e)
			{
				var msg = "Internal chain error : ";
				console.error(msg, e);
				if(self.rethrow)
					throw e;
				setTimeout(function(){
					self.running = false;
					nextQueueItem.apply(self, [null, e]);
				}, 1);
			}
			finally{
				if(previousContext !== this.context){
					if(this.context && this.context.suspend){
						this.context.suspend();
					}
					if(previousContext && previousContext.resume){
						previousContext.resume();
					}
					deep.context = previousContext;
				}
			}
		}
		else
		{
			this.running = false;
			if(failure && !this.rejected )
			{
				if(!this.waitingRejection)
				{
					this.waitingRejection = true;
					setTimeout(function(){
						self.running = false;
						nextQueueItem.apply(self, [result, failure]);
					}, 1);
				}
				else
					this.reject(failure);
			}	
		}	
	}
	function addInQueue(func)
	{
		// console.log("add in queue : ", func);
		var last = this.callQueue[this.callQueue.length-1];
		if(func._isPUSH_HANDLER_TO_ && !this.initialised)
		{
			//console.log("addInQueue : _isPUSH_HANDLER_TO_ : running ? ", this.running)
			func();
		}
		else
			this.callQueue.push(func);

		if(!this.running)
			nextQueueItem.apply(this);
	}

	function createSynchHandler(self, s, e){
		return new SynchHandler(self);
	}

	function cloneHandler(handler, cloneValues)
	{
		var newRes = [];
		if(cloneValues)
			handler._entries.forEach(function (old) {
				newRes.push(old);
			});
		var newHandler = handler.newHandler({
			root:handler._root,
			queries:utils.copyArray(handler.queries),
			_entries:newRes
		});
		newHandler.reports.result = handler.reports.result;
		newHandler.reports.failure = handler.reports.failure;
		return newHandler;
	}
	var DeepHandler = function(options)
	{
		this.rethrow = deep.rethrow;
		this.context = deep.context;
		options = options || {};
		this.querier = new Querier();
		this.callQueue = [];
		this._root = options._root || {};
		this._entries = options._entries || [];
		this.queries = [];
		this.deferred = deep.Deferred();
		this.rejected=false;
		this.reports = {
			result:null,
			failure:null
		}
	}
	DeepHandler.prototype = {
		querier:null,
		_entries:null,
		callQueue:null,
		reports:null,
		queries:null,
		reverse:function () {
			var self = this;	
			var create =  function(s,e)
			{
				self._entries.reverse();
				self.running = false;
				nextQueueItem.apply(self, [self._entries, null]);
			};
			addInQueue.apply(this, [create]);
			return self;
		},
		catchError:function () {
			var self = this;	
			var create =  function(s,e)
			{
				self.rethrow = false;
				self.running = false;
				nextQueueItem.apply(self, [s, e]);
			};
			addInQueue.apply(this, [create]);
			return self;
		},
		//_______________________________________________________________  CANCEL AND REJECT

		cancel:function (reason)  // not chainable
		{
			if(this.rejected)
				throw  new Error("deep chain could not be canceled : it has already been rejected! ")
			var queue = this.callQueue;
			this.callQueue = [];
			this.reports.cancel = reason;
			this.deferred.cancel(reason);
		},
		reject:function (reason)  // not chainable
		{
			console.log("deep chain reject : reason : ", reason)
			if(this.rejected)
				throw  new Error("deep chain has already been rejected! ")
			this.reports.failure = reason;
			this.rejected = true;
			this.callQueue = [];
			this.deferred.reject(reason);
		},
		//_____________________________________________________________  BRANCHES

		branches:function ( func ) 
		{
			var self = this;	
			var create =  function(s,e)
			{
				deep.when(func(createSynchHandler(self,s,e))).then(function (success) 
				{
					self.running = false;
					nextQueueItem.apply(self, [success, null]);
				}, 
				function (error) 
				{
					console.error("error : deep.branches : ", error);
					self.running = false;
					nextQueueItem.apply(self, [null, error]);
				});
			};
			addInQueue.apply(this, [create]);
			return self;
		},
		//______________________________________________________ PROMISE INTERFACE
		when:function(prom)
		{
			var self = this;
			function func(){
				return function(s,e){
					deep.when(prom).then(function (datas) {
						if(typeof datas === 'undefined')
							datas = s;
						self.running = false;
						nextQueueItem.apply(self, [datas,null]);
					}, function (e) {
						console.error("error : deep.chain.when : ", e);
						self.running = false;
						nextQueueItem.apply(self, [null,e]);
					});
				}
			}
			addInQueue.apply(this,[func()]);
			return this;
		},
		done:function  (callBack) 
		{
			var self = this;
			var	func = function(s,e)
			{
				//console.log("deep.chain.done : ",s,e)
				if(e || !callBack)
				{
					self.running = false;
					nextQueueItem.apply(self, [s, e]);
					return;
				}
				//console.log("done : self : ", self._entries);

				deep.when(callBack(s, createSynchHandler(self,s,e))).then(function (argument) {
					var error = null;
					if(typeof argument === 'undefined')
						argument = s;
					else if(argument instanceof Error)
					{
						error = argument;
						argument = null;
					}
					self.running = false;
					nextQueueItem.apply(self, [argument, error]);
				}, function (error) {
					self.running = false;
					nextQueueItem.apply(self, [null, error]);
				});
			}
			func._isTHEN_ = true;
			addInQueue.apply(this, [func]);
			return self;
		},
		fail:function (callBack)
		{
			var self = this;
			var func = function(s,e)
			{
				//console.log("deep.chain.fail : ",s,e)
				if((e == null || typeof e === 'undefined') || !callBack)
				{
					self.running = false;
					nextQueueItem.apply(self, [s, e]);
					return;
				}
				deep.when(callBack(e, createSynchHandler(self,s,e))).then(function (argument) {
					if(typeof argument === 'undefined')
					{
						self.running = false;
						nextQueueItem.apply(self, [null, e]);
					}
					else if(argument instanceof Error)
					{
						self.running = false;
						nextQueueItem.apply(self, [null, argument]);
					}
					else
					{
						self.running = false;
						nextQueueItem.apply(self, [argument, null]);
					}
				}, function (error) {
					self.running = false;
					nextQueueItem.apply(self, [null, error]);
				});
			}
			func._isTHEN_ = true;
			addInQueue.apply(this,[func]);
			return self;
		},
		then:function (successCallBack, errorCallBack) 
		{
			if(successCallBack)
				this.done(successCallBack);
			if(errorCallBack)
				this.fail(errorCallBack);
			return this;
		},
		//___________________________________________________________________________ NAVIGATION
		first : function  () 
		{
			var self = this;
			var func = function(){
				self._entries = [self._entries[0]];
				self.running = false;
				nextQueueItem.apply(self, [self._entries]);
			}
			addInQueue.apply(this,[func]);
			return cloned;
		},
		last : function  () 
		{
			var self = this;
			var func = function(){
				self._entries = [self._entries[self._entries.length-1]];
				self.running = false;
				nextQueueItem.apply(self, [self._entries]);
			}
			addInQueue.apply(this,[func]);
			return cloned;
		},
		parents : function  (errorIfEmpty) 
		{
			var self = this;
			var func = function(){
				var res = [];
				self._entries.forEach(function (r) {
					res.push(r.ancestor);
				})
				res = deep.utils.arrayUnique(res, "path");
				self._entries = res;
				if(res.length == 0 && errorIfEmpty)
					throw new Error("deep.parents could not gives empty results")
				self.running = false;
				nextQueueItem.apply(self, [self._entries, null]);
			}
			addInQueue.apply(this,[func]);
			return self;
		},
		root:function (root, schema) 
		{
			var self = this;
			var func = function()
			{
				var alls = [];
				if(root)
					alls = [DeepRequest.retrieve(root)];
				if(schema)
					alls.push(DeepRequest.retrieve(schema));
				if(alls.length > 0)
					deep.all(alls).then(function (results) {
						// console.log("deep.root : ", results)
						var root = results[0];
						var schema = results[1];
						if(root instanceof DeepHandler)
						{
							self.queries = utils.copyArray(root.queries);
							self._entries = [root._root];
							self._root = root._root;
							if(schema)
								root._root.schema= schema;
							if(root.name)
								self.name = "chained:"+root.name;
							else
								self.name = "chained:untitled";
							self.running = false;
							nextQueueItem.apply(self, [self._root.value, null]);
							return;
						}
						if(root && root._isDQ_NODE_)
						{
							//handler._root = root.value;
							if(schema)
								root.schema = schema;
							self._entries = [root];	
							self.queries = [root.path];
						}
						else if(root && root._deep_entry)
						{
							//handler._root = root._deep_entry._root.value;
							if(schema)
								root._deep_entry.schema = schema;
							self._entries = [root._deep_entry];	
							self.queries = [root._deep_entry.path];
							//console.log("deep on node with _deep_entry_ : ", root._deep_entry)
						}
						else
						{
							//handler._root = root;
							self._entries = self.querier.query(root, "/!", {resultType:"full", schema:schema || {}});	
							self.queries = ["/!"];
							if(root && root.uri)
								self.name = root.uri;
							else
								self.name = "untitled";
						}
						self._root = self._entries[0];
						self.running = false;
						nextQueueItem.apply(self, [self._root.value, null]);
					}, function (error) {
						console.log("deep.root chain error : ", error);
						throw new Error("deep.root chain error : "+error);
					});		
				else
				{
					//console.log("deep.root : ", root)
					self._entries = [self._root];	
					self.queries.push("/!");
					self.running = false;
					nextQueueItem.apply(self, [self._root.value, null]);
				}
			}
			addInQueue.apply(this,[func]);
			return this;
		},
		query : function(q, errorIfEmpty)
		{
			var src = this;
			src.queries.push(q);
			if(!(q instanceof Array))
				q = [q];
			var func = function(){
				//console.log("do query : ", q)
				var res = [];
				if(console.flags && console.flags["deep.query.profile"])
					console.time("query")
				src._entries.forEach(function (r) {
					// console.log("do query : ", q , " - on : ", r)
					q.forEach(function (qu) {
						res = res.concat(src.querier.query(r, qu , {resultType:"full"}));
					});
					//console.log("do query : ", q , " - on : ", r, " - results \n", res);
				});
				if(console.flags && console.flags["deep.query.profile"])
					console.timeEnd("query");
				res = deep.utils.arrayUnique(res, "path");
				src._entries = res;
				if(res.length == 0 && errorIfEmpty)
					throw new Error("deep.query could not gives empty results")
				src.running = false;
				nextQueueItem.apply(src, [res, null]);
			}
			addInQueue.apply(src, [func]);
			return src;
		},
		//_________________________________________________________________    MODELISATION
		schema : function(schema)
		{
			//metaSchema = metaSchema || deep.metaSchema || {};
			var self = this;
			var func = function(){
				deep.when(deep.request.retrieve(schema)).then(function (schema) {
					//var schema = schemas.shift();
					//var metaSchema = schemas.shift();
					var alls = [];
					self._entries.forEach(function(result){
						result.schema = schema;
					});
					
					self.running = false;
					nextQueueItem.apply(self, [schema, null]);
					
				})
				.fail(function (error) {
					self.running = false;
					nextQueueItem.apply(self, [null, error]);
				});
			}
			addInQueue.apply(this,[func]);
			return this;
		},
		schemaUp : function(schema, metaSchema)
		{
			metaSchema = metaSchema || deep.metaSchema || {};
			var self = this;
			var func = function(){
				deep.when(deep.request.retrieve(schema))
				.done(function (schema) {
					var alls = [];
					self._entries.forEach(function(result){
						if(!result.schema)
							result.schema = {};
						alls.push(utils.up(schema, result.schema, metaSchema));
					});
					deep.all(alls).then(function (loadeds) {
						self.running = false;
						nextQueueItem.apply(self, [self._entries, null]);
					},
					function (error) {
						console.error("error : deep.schemaUp : ",error)
						throw new Error("error : deep.schemaUp : "+error);
					});
				})
				.fail(function (error) {
					self.running = false;
					nextQueueItem.apply(self, [null, error]);
				});
			}
			addInQueue.apply(this,[func]);
			return this;
		},
		schemaBottom : function(schema, metaSchema)
		{
			metaSchema = metaSchema || deep.metaSchema || {};
			var self = this;
			var func = function(){
				deep.when(deep.request.retrieve(schema))
				.done(function (schema) {
					var alls = [];
					self._entries.forEach(function(result){
						if(!result.schema)
							result.schema = {};
						alls.push(utils.bottom(schema, result.schema, metaSchema));
					});
					deep.all(alls).then(function (loadeds) {
						self.running = false;
						nextQueueItem.apply(self, [self._entries, null]);
					},
					function (error) {
						console.error("error : deep.schemaBottom : ",error)
						throw new Error("error : deep.schemaBottom : "+error);
					});
				})
				.fail(function (error) {
					self.running = false;
					nextQueueItem.apply(self, [null, error]);
				});
			}
			addInQueue.apply(this,[func]);
			return this;
		},
		up : function(retrievables)
		{
			var args = Array.prototype.slice.call(arguments);
			var self = this;
			var func = function(){
				deep.when(deep.request.retrieveAll(args)).then(function (objects) 
				{
					self._entries.forEach(function(result){
						objects.forEach(function (object) {
							utils.up(object, result.value, result.schema, result.ancestor?result.ancestor.value:null, result.key);
						});
					});
					self.running = false;
					nextQueueItem.apply(self, [self._entries, null]);
				},
				function (error) {
					console.error("error : deep.up : ",error);
					throw new Error("error : deep.up : "+error);
				});
			}
			addInQueue.apply(this,[func]);
			return this;
		},
		bottom : function(retrievables)
		{
			var args = Array.prototype.slice.call(arguments);
			
			args.reverse();
			var self = this;
			var func = function(){
				deep.when(deep.request.retrieveAll(args)).then(function (objects) 
				{
					self._entries.forEach(function(result){
						objects.forEach(function (object) {
							utils.bottom(object, result.value, result.schema, result.ancestor?result.ancestor.value:null, result.key);
						});
					});
					self.running = false;
					nextQueueItem.apply(self, [self._entries, null]);
				}, 
				function (argument) {
					//console.error("error : deep.bottom : ",error);
					throw new Error("error : deep.bottom : "+error);
				});
			}
			addInQueue.apply(this,[func]);
			return this;
		},
		replace : function (what, by, options) 
		{
			var self = this;
			var func = function(){
				deep.when(deep.request.retrieve(by, options)).then(function (by) 
				{
					self._entries.forEach(function (r) {
						self.querier.query(r, what, {resultType:"full"}).forEach(function(r){
							if(!r.ancestor)
								return;
							r.ancestor.value[r.key] = r.value = by;
						});
					});
					self.running = false;
					nextQueueItem.apply(self, [by, null]);
				}, function (argument) {
					//console.error("error : deep.replace : ",error);
					throw new Error("error : deep.replace : "+error);
				});
			}
			addInQueue.apply(this,[func]);
			return this;
		},
		remove : function (what) 
		{
			var self = this;
			var func = function(){
				self._entries.forEach(function (r) {
					self.querier.query(r, what, {resultType:"full"}).forEach(function(r)
					{
						if(!r.ancestor)
							return;
						if(r.ancestor.value instanceof Array)
							r.ancestor.value.splice(r.key,1);
						else
							delete r.ancestor.value[r.key];
					});
				});
				self.running = false;
				nextQueueItem.apply(self, [deep.chain.values(self), null]);
			}
			
			addInQueue.apply(this,[func]);
			return this;
		},
		extendsChilds : function(entry)
		{
			if(!entry)
				return entry;
			var toExtends = this.querier.query(entry, "//?backgrounds", {resultType:"full"});
			//console.log("_____________________ extendsChilds : ", path, " \n\n\n________________", obj);
			if(toExtends.length == 0)
				return entry;
			var deferred = deep.Deferred();
			var rec = toExtends[0];
			var handler = deep(rec);
			//console.log("extendsChilds : handler toExtends ", handler)

			handler.flatten().then(function () 
			{
				deep.when(handler.extendsChilds(entry)).then(function () {
				//	console.log("___________________ handler flattened ")
					deferred.resolve(entry);
				}, function (error) {
					deferred.reject(error);
				});
			},
			function (error) {
				deferred.reject(error);
			});
			//console.log("_________________Grrrrrrr");
			return deep.promise(deferred);
		},
		extendsBackgrounds:function (entry)
		{
			//console.log("extendsBackgrounds : entry : ", entry)
			var self = this;
			var value = entry;
			var root = this._root.value;
			if(!entry)
				return [];
			if(entry._isDQ_NODE_)
			{
				value = entry.value;
				root = null;
			}
			if(value.backgrounds)
			{
				var deferred = deep.Deferred();
				if(!value.backgrounds.push)
					value.backgrounds = [ value.backgrounds ];
				//console.log("will retrieve : ", value.backgrounds)
				deep.when(deep.request.retrieveAll(value.backgrounds, { root:root || entry, acceptQueryThis:true })).then(function extendedsLoaded(extendeds){
					var recursion = [];
					//console.log("__________________ extendsBackgrounds : retrieved : ", extendeds)
					while(extendeds.length > 0)
					{
						var exts = extendeds.shift();
						if(exts instanceof Array)
						{
							extendeds = exts.concat(extendeds);
							continue;
						} 
						//console.log("will recurse : ", exts)
						recursion.push(exts);
						recursion.push(self.extendsBackgrounds(exts));
					}
					deep.all(recursion).then(function (extendeds){
						var res = [];
						extendeds.forEach(function (extended){
							res = res.concat(extended);
						});
						delete value.backgrounds;
						//console.log("___________________ bacgrounds extended ")

						deferred.resolve(res);
					},function  (error) {
						console.error("currentLevel extension (backgrounds property) failed to retrieve pointed ressource(s) : "+JSON.stringify(extendeds));
						deferred.reject(error);
					});
				}, function(res){
					console.error("currentLevel extension (backgrounds property) failed to retrieve pointed ressource(s) : "+JSON.stringify(extendeds));
					deferred.reject(res);
				});
				return deep.promise(deferred);
			}	
			return [];
		},
		/*ccs:function (ccs) {
			
				//jquery :
				//$(...).css()
			
			var self = this;
			var func = function (s,e) {
				self._entries.forEach(function (e) {
					if(e.schema)
					{
						var toApply = deep.query(e.schema, "//ccs", { resultType:"full"});

					}
				})
			}
			addInQueue.apply(this,[func]);
			return this;
		},
		*/
		flatten : function()
		{
			var self = this;
			var count = 0;
			var doChilds = function(result)
			{
				//console.log("deep.flatten : doChilds : ", result)
				//delete self._root.value._deep_entry;
				deep.when(self.extendsChilds(result)).then(function () {
					count--;
					if(count == 0)
					{
						//console.log("flatten DONE");
						self.running = false;
						nextQueueItem.apply(self, [deep.chain.values(self), null]);
					}
				}, function (error) {
					console.error("error : deep.flatten : ",error);
					throw new Error("error : deep.flatten : "+error);
				});
			}
			var func = function(){
				//console.log("will flatten : ", self._entries)
				var alls = [];
				self._entries.forEach(function (result) 
				{
					count++;
					if(result.value.backgrounds)
					{
						deep.when(self.extendsBackgrounds(result)).then(function(stack) {
						//	console.log("flatten extendsBackgrounds done.")
							var f = {};
							stack.forEach(function(s){ f = utils.bottom(s, result.value, result.schema); delete s.backgrounds; });
							delete result.value.backgrounds;
							doChilds(result);
						},function (error) {
							console.error("error : deep.flatten : ", error);
							throw new Error("error : deep.flatten : "+error);
						});
						delete result.value.backgrounds;
					}
					else
						doChilds(result);
				});
				if(self._entries.length == 0)
				{
					self.running = false;
					nextQueueItem.apply(self, [deep.chain.values(self), null]);
				}
			}
			addInQueue.apply(this,[func]);
			return this;
		},
		//______________________________________________________________  RUNS
		run : function (func, options) 
		{
			var self = this;
			options = options || {};
			var create = function(){
				// console.log("deep.run : entries : ", self._entries)
				var alls = [];
				self._entries.forEach(function(result){
					// console.log("deep.run : ", func, options, result.value[func])
					if(!func)
					{
						if(typeof result.value != "function")
							return;
						if(result.ancestor)
							alls.push(callFunctionFromValue(result.ancestor, result.key, options));
						else
							alls.push(result.value(options.args || null));
						return;
					}
					if(typeof func === 'function')
						alls.push(runFunctionFromValue(result, func, options));
					else if(typeof func === 'string')
						alls.push(callFunctionFromValue(result, func, options));
					else
						alls.push(result);
				});
				// console.log("deep.run waits for : ", alls);
				deep.all(alls).then(function (loadeds) 
				{
					//console.log("deep.run results : ", loadeds);
					if(options.callBack)
						options.callBack(loadeds);
					self.running = false;
					nextQueueItem.apply(self, [loadeds, null]);
				}, 
				function (error) 
				{
					console.error("error : deep.run : ", error);
					self.running = false;
					nextQueueItem.apply(self, [null, error]);
				});
			}
			addInQueue.apply(this,[create]);
			return this;
		},
		exec : function (func, options) 
		{
			var self = this;
			options = options || {};
			var create = function(){
				deep.when(func(options.args || null)).then(function (loadeds) 
				{
					if(options.callBack)
						options.callBack(loadeds);
					self.running = false;
					nextQueueItem.apply(self, [loadeds, null]);
				}, 
				function (error) 
				{
					console.error("error : deep.exec : ", error);
					self.running = false;
					nextQueueItem.apply(self, [null, error]);
				});
			}
			addInQueue.apply(this,[create]);
			return this;
		},

		//_______________________________________________________________ TESTS AND VALIDATIONS

		valuesEqual : function(obj, callBack)
		{
			var self = this;
			var func = function(){
				var res = deep.chain.values(self);
				var ok = utils.deepEqual(res, obj);
				var o = {equal:ok, needed:obj, needLength:obj.length, valuesLength:res.length, value:res}
				console.info("deep.valuesEqual : "+ JSON.stringify(o, null, ' '));
				if(callBack)
				{
					deep.when(callBack(o)).then(function (argument) {
						if(typeof argument === 'undefined')
							argument = o;
						self.running = false;
						nextQueueItem.apply(self, [argument, null]);	
					}, function (error) {
						self.running = false;
						nextQueueItem.apply(self, [o, error]);							
					});
				}
				else
				{
					self.running = false;
					nextQueueItem.apply(self, [o, !ok]);
				}
			}
			addInQueue.apply(this,[func]);
			return self;
		},
		equal : function(obj, callBack)
		{
			// console.log("deep.equal chaining");
			var self = this;
			var func = function(){
				//console.log("will do deep.equal : self : ", self._entries)
				var res = [];
				var errors = [];
				self._entries.forEach(function(r){
					//console.log("deep.equal : r : ",r);
					var ok = utils.deepEqual(r.value, obj);
					var o = {path:r.path, equal:ok, value:r.value, needed:obj}
					res.push(o);
					if(!ok)
						errors.push(o)
					console.info("deep.equal : "+o.equal+" : ", o);
				});
				var report = {
					equal:(self._entries.length > 0) && (errors.length==0),
					reports:res
				}; 
				if(callBack)
				{
					deep.when(callBack(report)).then(function (argument) {
						if(typeof argument === 'undefined')
							argument = report;
						self.running = false;
						nextQueueItem.apply(self, [argument, null]);
					}, function (error) {
						self.running = false;
						nextQueueItem.apply(self, [null, error]);
					})
				}	
				else
				{
					if(errors.length == 0)
						errors = null;
					self.running = false;
					nextQueueItem.apply(self, [report, errors]);
				}	
			}
			addInQueue.apply(this,[func]);
			return self;
		},
		assertTrue : function (testFunc, options) 
		{
			var self = this;
			options = options || {};

			var create = function(){
				var alls = [];
				var report = {
					valid:true,
					args:options.args || null,
					testFunction:testFunc,
					reports:[]
				};
				self._entries.forEach(function(result){
					var rep = { 
						result:false,
						value:result.value,
						path:result.path
					}
					report.reports.push(rep);
					var def = deep.Deferred();
					deep.when(testFunc(result.value, options.args || null)).then(function (testResult) {
						rep.result = testResult;
						if(testResult === true)
							rep.valid = true;
						else
							rep.valid = false;
						self.running = false;
						if(rep.valid)
							def.resolve(rep);
						else
							def.reject(rep);
					},function (testError) {
						console.error("error : deep.assertTrue : ", testError);
						report.valid = false;
						rep.result = testError;
						rep.valid = false;
						def.reject(rep);
					});
					alls.push(deep.promise(def));
				});
				deep.all(alls).then(function () 
				{
					console.info("deep.assertTrue : report : ", report);
					if(options.callBack)
					{
						deep.when(options.callBack(report)).then(function (argument) {
							if(typeof argument === 'undefined')
								argument = report;
							self.running = false;
							nextQueueItem.apply(self, [argument, null]);
						}, function (error) {
							self.running = false;
							nextQueueItem.apply(self, [report, error]);
						});
					}	
					else
					{
						self.running = false;
						nextQueueItem.apply(self, [report, !report.valid]);
					}
				}, function (error) {
					self.running = false;
					nextQueueItem.apply(self, [report, error]);
				});
			}
			
			addInQueue.apply(this,[create]);
			return this;
		},
		/**

		*/
		validate:function(callBack, options) 
		{
			options = options || {};
			var self = this;
			var func = function(){
				var  a = [];
				//console.log("deep.log : ", self._entries)
				self._entries.forEach(function (e) {
					a.push(Validator.validate(e.value, e.schema));
				})
				
				deep.all( a ).then( function ( reports ) {
					var freport = {
						valid:true,
						errors:[],
						reports:reports
					}
					var errors = []
					reports.forEach ( function ( report ) {
						if(report.valid)
							return;
						freport.valid = false;
						freport.errors.push(report);
					})
					if(options.callBack)
					{
						deep.when(options.callBack(freport)).then(function (argument) {
							if(typeof argument === 'undefined')
								argument = freport;
							self.running = false;
							nextQueueItem.apply(self, [argument, null]);
						}, function (error) {
							self.running = false;
							nextQueueItem.apply(self, [freport, error]);
						});
					}
					else
					{
						self.running = false;
						nextQueueItem.apply(self, [freport, !freport.valid]);
					}
				}, function (error) {
					self.running = false;
					nextQueueItem.apply(self, [null, error]);
				});
			}
			
			addInQueue.apply(this,[func()]);
			return this;
		},

		// __________________________________________________ LOG

		log:function () 
		{
			var self = this;
	
			var args = Array.prototype.slice.call(arguments);
			// if(args.length == 0)
			 //	args.push("deep.log");
			 //console.log("deep.log : args : ",JSON.stringify(arguments))
			var func = function(s,e)
			{
				if(args.length == 0)
				{
					args.push("deep.log : last success : ");	
					args.push(s);
				}
				args.forEach(function (a) {
					console.log(a);
				});
				self.running = false;
				nextQueueItem.apply(self,[s, null]);
			}
			
			addInQueue.apply(this,[func]);
			return this;
		},
		logValues:function (title, options) 
		{
			var self = this;
			options = options || {};
			function func(){
				return function()
				{
					console.log(title||"deep.logValues : ", " ("+self._entries.length+" values)")
					self._entries.forEach(function (e) {
						var val = e;
						var entry = e.value._deep_entry;
						delete e.value._deep_entry;
						if(!options.full)
							val = e.value;
						if(options.pretty)
							val = JSON.stringify(val, null, ' ');
						console.log("\t- entry : ("+e.path+") : ", val);
						if(entry)
							e._deep_entry = entry;
					})
					self.running = false;
					nextQueueItem.apply(self,[true, null]);
				}
			}
			addInQueue.apply(this,[func()]);
			return this;
		},
		// ________________________________________ READ ENTRIES

		each:function(callBack)
		{
			var self = this;
			function func(){
				return function()
				{
					var a = [];
					self._entries.forEach(function(r)
					{
						a.push(callBack(r.value));
					});
					deep.all(a).then(function (argument) {
						self.running = false;
						nextQueueItem.apply(self, [argument,null]);	
					}, function (error) {
						console.error("error : deep.each : ", error);
						self.running = false;
						nextQueueItem.apply(self, [null, error]);
					});
				}
			}
			addInQueue.apply(this,[func()]);
			return self;
		},
		nodes:function  (callBack) 
		{
			var self = this;
			function func(){
				return function()
				{
					var  a = [];
					self._entries.forEach(function (e) {
						a.push(e);
					})
					deep.when(callBack(a)).then(function (argument) {
						self.running = false;
						nextQueueItem.apply(self, [a, null]);
					}, function (error) {
						console.error("error : deep.values : ",error);
						self.running = false;
						nextQueueItem.apply(self, [null, error]);
					});
				}
			}
			addInQueue.apply(this,[func()]);
			return this;
		},
		values:function  (callBack) 
		{
			var self = this;
			function func(){
				return function()
				{
					var  a = [];
					self._entries.forEach(function (e) {
						a.push(e.value);
					})
					deep.when(callBack(a)).then(function (argument) {
						self.running = false;
						nextQueueItem.apply(self, [a, null]);
					}, function (error) {
						console.error("error : deep.values : ",error);
						self.running = false;
						nextQueueItem.apply(self, [null, error]);
					});
				}
			}
			addInQueue.apply(this,[func()]);
			return this;
		},
		paths:function  (callBack) 
		{
			var self = this;
			function func(){
				return function()
				{
					var  a = [];
					self._entries.forEach(function (e) {
						a.push(e.path);
					})
					deep.when(callBack(a)).then(function (argument) {
						self.running = false;
						nextQueueItem.apply(self, [a, null]);
					}, function (error) {
						console.error("error : deep.paths : ",error);
						self.running = false;
						nextQueueItem.apply(self, [null, error]);
					});
				}
			}
			addInQueue.apply(this,[func()]);
			return this;
		},
		schemas:function  (callBack) 
		{
			var self = this;
			function func(){
				return function()
				{
					var  a = [];
					self._entries.forEach(function (e) {
						a.push(e.schema);
					})
					deep.when(callBack(a)).then(function (argument) {
						self.running = false;
						nextQueueItem.apply(self, [a, null]);
					}, function (error) {
						self.running = false;
						nextQueueItem.apply(self, [null, error]);
					});
				}
			}
			addInQueue.apply(this,[func()]);
			return this;
		},
		//___________________________________________________________ WAIT

		delay:function (ms) 
		{
			var self = this;
			function func(){
				return function(s,e){
					//console.log("deep.delay : ", ms)
					setTimeout(function () {
						console.log("deep.delay.end : ", ms)
						self.running = false;
						nextQueueItem.apply(self, [s, null]);
					}, ms);
				}
			}
			addInQueue.apply(this,[func()]);
			return this;
		},

		
		//____________________________________________________________________  LOAD

		deepLoad:function() 
		{
			var self = this;
			function func(){
				return function(s,e){
					var  paths = [];
					var  promises = [];
					//console.log("deepLoad : ", self)
					self._entries.forEach(function (e) {
						var strings = self.querier.query(e, ".//?or(_schema.type=string,_schema.type=function)", {resultType:"full"});
						strings.forEach(function (toLoad) {
							if(!toLoad.ancestor)
								throw new Error("you couldn't interpret root itself.");
							console.log("deep.deepLoad : toLoad : ", toLoad);
							if(typeof toLoad.value === 'function')
								promises.push(toLoad.value())
							else
								promises.push(deep.request.retrieve(toLoad.value, {root:self._root.value, basePath:toLoad.path, acceptQueryThis:true }));
							paths.push(toLoad);
						})
					})
					deep.all(promises).then(
					function (results) {
						var count = 0;
						results.forEach(function  (r) {
							var e = paths[count++];
							if(e.ancestor)
								e.ancestor.value[e.key] = e.value = r;
						})
						self.running = false;
						nextQueueItem.apply(self, [ results, null ]);
					},
					function (error) {
						console.error("error : deep.deepLoad : ", error);
					
						self.running = false;
						nextQueueItem.apply(self, [ null, error ]);
					
					});
				}
			}
			addInQueue.apply(this,[func()]);
			return this;
		},

		load:function (request) 
		{
			var self = this;
			function func(){
				return function(){
					var  paths = [];
					var  promises = [];
					//console.log("deep.load : ", deep.chain.stringify(self))
					//console.log("deep.load : entries : ", self.entries)
					if(request)
						promises.push(deep.request.retrieve(request, { callFunctions:true }));
					else
						self._entries.forEach(function (e) {
							if(!e.value)
								return;
							if(e.value.load)
								promises.push(callFunctionFromValue(e, "load"));
							else if(typeof e.value === 'string')
								promises.push(deep.request.retrieve(e.value, { root:self._root.value, basePath:e.path, callFunctions:true, acceptQueryThis:true }));
							else
								promises.push(e.value);
							paths.push(e);
						})
					deep.all(promises).then(
					function (results) {
						//console.log("deep.load results : ", results)
						var count = 0;
						if(request)
						{
							//console.log("deep.load results from request : ", self._entries)
							self._entries.forEach(function (entry) {
								if(!entry.ancestor)
									//throw new Error("You couldn't interpret root !");
										entry.value = results[0];
									else
										entry.value = entry.ancestor.value[entry.key] = results[0];
							})
						}
						else
							results.forEach(function  (r) {
								//console.log("deep.load results from inner : ", r)
								var item = paths[count++];
								if(!item.value.load)
								{
									if(!item.ancestor)
									//throw new Error("You couldn't interpret root !");
										item.value = r;
									else
										item.value = item.ancestor.value[item.key] = r;
								}
							})
						self.running = false;
						nextQueueItem.apply(self, [results, null]);
					},
					function (error) {
						console.error("deep.load errors : ", error);
						self.running = false;
						nextQueueItem.apply(self, [null, error]);
					});
				}
			}
			addInQueue.apply(this,[func()]);
			return this;
		},

		//________________________________________________________________________ INTERPET STRINGS

		deepInterpret:function(context) 
		{
			var self = this;
			function func(){
				return function(){
					deep.when(deep.request.retrieve(context)).then(function (context) 
					{
						var res = [];
						self._entries.forEach(function (e) {
							var strings = self.querier.query(e, ".//?_schema.type=string", {resultType:"full"});
							strings.forEach(function (interpretable) {
								var r = deep.interpret(interpretable.value, context);
								res.push(r);
								if(!interpretable.ancestor)
									//throw new Error("You couldn't interpret root !");
									interpretable.value = r;
								else
									interpretable.ancestor.value[interpretable.key] = interpretable.value = r;
							})
						});
						self.running = false;
						nextQueueItem.apply(self, [res, null]);
					}, 
					function (error) 
					{
						console.error("error : deep.deepInterpret : ", error);
						self.running = false;
						nextQueueItem.apply(self, [null, error]);
					});
				}
			}
			addInQueue.apply(this,[func()]);
			return this;
		},
		interpret:function(context) 
		{
			var self = this;
			var func = function(){
				deep.when(deep.request.retrieve(context)).then(function (context) {
					var res = [];
					self._entries.forEach(function (interpretable) 
					{
						var r = deep.interpret(interpretable.value, context);
						res.push(r);
						if(!interpretable.ancestor)
							//	throw new Error("You couldn't interpret root !");
							interpretable.value = r;
						else
							interpretable.ancestor.value[interpretable.key] = interpretable.value = r;
					});
					self.running = false;
					nextQueueItem.apply(self, [res, null]);
				}, function (error) {
					console.error("error : deep.interpret : ", error);
					self.running = false;
					nextQueueItem.apply(self, [null, error]);
				});
			}
			
			addInQueue.apply(this,[func]);
			return this;
		},

		//________________________________________________________ PUSH TO

		pushHandlerTo:function(array) 
		{
			var self = this;
			function func(){
				var f = function()
				{
					// console.log("pushHandlerTo : init? ", self.initialised)
					array.push(self);
					if(self.initialised)
					{
						self.running = false;
						nextQueueItem.apply(self, [self, null]);
					}
				}
				f._isPUSH_HANDLER_TO_ = true;
				return f;
			}
			addInQueue.apply(this,[func()]);
			return this;
		},
		pushNodesTo:function(array) 
		{
			var self = this;
			function func(){
				return function(){
					var res = [];
					self._entries.forEach(function (e) {
						array.push(e);
						res.push(e);
					})
					self.running = false;
					nextQueueItem.apply(self, [res, null]);
				}
			}
			addInQueue.apply(this,[func()]);
			return this;
		},
		pushValuesTo:function(array) 
		{
			var self = this;
			function func(){
				return function(){
					var res = [];
					self._entries.forEach(function (e) {
						array.push(e.value);
						res.push(e.value);
					})
					self.running = false;
					nextQueueItem.apply(self, [res, null]);
				}
			}
			addInQueue.apply(this,[func()]);
			return this;
		},
		pushPathsTo:function(array) 
		{
			var self = this;
			var func =function(){
				var res = [];
				self._entries.forEach(function (e) {
					array.push(e.path);
					res.push(e.path);
				})
				self.running = false;
				nextQueueItem.apply(self, [res, null]);
			}
			addInQueue.apply(this,[func]);
			return this;
		},
		pushSchemasTo:function(array) 
		{
			var self = this;
			var func = function(){
				var res = [];
				self._entries.forEach(function (e) {
					array.push(e.schema);
					res.push(e.schema);
				})
				self.running = false;
				nextQueueItem.apply(self, [res, null]);
			}
			addInQueue.apply(this,[func]);
			return this;
		},

		//____________________________________________________   IF familly

		rejectIf : function(totest)
		{
			var self = this;
			function func(){
				return function(){
					if(typeof totest === 'function')
						deep.when(totest()).then(function (res) {
							if(res)
								self.reject(res);
							else
							{
								self.running = false;
								nextQueueItem.apply(self, [res, null]);
							}
						})
					else if(totest)
						self.reject(totest);
					else
					{
						self.running = false;
						nextQueueItem.apply(self, [totest, null]);
					}	
				}
			}
			addInQueue.apply(this,[func()]);
			return self;
		},
		cancelIf : function(totest)
		{
			var self = this;
			function func(){
				return function(){
					if(typeof totest === 'function')
						deep.when(totest()).then(function (res) {
							if(res)
								self.cancel(res);
							else
							{
								self.running = false;
								nextQueueItem.apply(self, [res, null]);
							}
						})
					else if(totest)
						self.cancel(totest);
					else
					{
						self.running = false;
						nextQueueItem.apply(self, [totest, null]);
					}	
				}
			}
			addInQueue.apply(this,[func()]);
			return self;
		},

		//__________________________________________________________

		newHandler:function (options) {
			return new DeepHandler(options);
		}


	}

	

	deep = function(broot, schema)
	{
		var handler = new DeepHandler({path:"/!"});
		handler.running = true;
		var alls = [DeepRequest.retrieve(broot)];

		if(schema)
			alls.push(DeepRequest.retrieve(schema));

		  // console.log("deep(root) init : ", alls);

		deep.all(alls).then(function (results) {
			 // console.log("deep(root) : loaded : ",  results instanceof Array)
			handler.initialised = true;
			var root = results[0];
			var schema = results[1];
			if(typeof root === 'object' && root._isDQ_NODE_)
			{
				// console.log("deep(..) with DQNode : ", root)
				handler._root = root.root;
				handler._entries = [root];	
				handler.queries = [root.path];
			}
			else if(typeof root === 'object' && root._deep_entry)
			{
				 // console.log("deep(..) with _deep_entry")
				handler._root = root._deep_entry;
				handler._entries = [root._deep_entry];	
				handler.queries = [root._deep_entry.path];
			}
			else if(broot instanceof DeepHandler)
			{
				 // console.log("deep(..) with DeepHandler");
				handler._entries = utils.copyArray(broot._entries)	
				handler._root = broot._root;
				handler.queries = utils.copyArray(broot.queries);
			}
			else
			{
				// console.log("deep(..) simple object")
				handler._root = Querier.createRootNode(root, schema);
				handler._entries = [handler._root];	
				handler.queries = ["/!"];
				if(typeof root === 'object' && root.uri)
					handler.name = root.uri;
				else
					handler.name = "untitled";
			}
			// console.log("chain will run next item");
			handler.running = false;
			nextQueueItem.apply(handler, [deep.chain.values(handler), null]);
		}, function (error) {
			console.log("deep start chain error : ", error);
			handler.running = false;
			nextQueueItem.apply(handler, [null, error]);
		});		
		return handler;
	}
	deep.Handler = DeepHandler;
	deep.metaSchema = {};
	deep.request = DeepRequest;
	deep.utils = utils;
	deep.validate = Validator.validate;
	deep.compose = deepCompose;
	deep.chain = {
		nextQueueItem:nextQueueItem,
		addInQueue:addInQueue,
		stringify:function (handler, options) 
		{
			options = options || {};
			var res = "";
			handler._entries.forEach(function (e) {
				if(options.pretty)
					res += JSON.stringify(e.value, null, ' ')+"\n";
				else
					res += JSON.stringify(e.value)+"\n";
			});
			return res;
		},
		values:function (handler) {
			var res = [];
			handler._entries.forEach(function (e) {
				res.push(e.value);
			});
			return res;
		},
		nodes:function (handler) {
			var res = [];
			handler._entries.forEach(function (e) {
				res.push(e);
			});
			return res;
		},
		paths:function (handler) {
			var res = [];
			handler._entries.forEach(function (e) {
				res.push(e.paths);
			});
			return res;
		},
		schemas:function (handler) {
			var res = [];
			handler._entries.forEach(function (e) {
				res.push(e.schema);
			});
			return res;
		}
	}

	function createHandler(arg)
	{
		var handler = new DeepHandler({path:"/!"});
		handler._entries = handler.querier.query(arg, "/!", {resultType:"full", schema:{}});	
		handler.queries = ["/!"];
		if(arg && arg.uri)
			handler.name = arg.uri;
		else
			handler.name = "untitled";
		handler._root = handler._entries[0];
	//	console.log("handler created : root : ", handler._root)
		nextQueueItem.apply(handler, [handler._root.value, null]);
		return handler;
	}

	var DeepDeferred = function () 
	{
		// console.log("new deep deferred")
		this.context = deep.context;
		this.running = true;
		this.queue = [];
		this.promise = new DeepPromise(this);
	}

	DeepDeferred.prototype = {
		context:null,
		promise:null,
		rejected:false,
		resolved:false,
		canceled:false,
		result:null,
		failure:null,
		resolve:function (argument) 
		{
			//console.log("DeepDeferred.resolve");
			if(this.rejected || this.resolved || this.canceled)
				throw new Error("DeepDeferred (resolve) has already been resolved !");
			this.promise.result = this.result =  argument;
			this.resolved = this.promise.resolved = true;
			this.promise.running = false;
			nextPromiseHandler.apply(this.promise, [argument, null]);
		},
		reject:function (argument) 
		{
			//console.log("DeepDeferred.reject");
			if(this.rejected || this.resolved || this.canceled)
				throw new Error("DeepDeferred (reject) has already been rejected !");
			this.promise.failure = this.failure = argument;
			this.rejected = this.promise.rejected = true;
			this.promise.running = false;
			nextPromiseHandler.apply(this.promise, [null, argument]);
		},
		cancel:function (argument) 
		{
			// console.log("DeepDeferred.cancel");
			if(this.rejected || this.resolved || this.canceled)
				throw new Error("DeepDeferred (cancel) has already been canceled !");
			this.canceled = this.promise.canceled = true;
			this.promise.queue = [];
		},
		then:function (sc,ec) {
			this.promise.then(s,e);
		},
		done:function (argument) {
			this.promise.done(argument);
		},
		fail:function (argument) {
			this.promise.fail(argument);
		}
	}
	var DeepPromise = function (deferred) 
	{
		this.running = true;
		if(deferred)
		{
			this.context = deferred.context;
			this.queue = deferred.queue;
		}	
		else
		{
			this.context = deep.context;
			this.queue = [];
		}
			
	}
	DeepPromise.prototype = {
		rejected:false,
		resolved:false,
		canceled:false,
		synch:false,
		result:null,
		failure:null,
		done:function (callBack) 
		{
			//console.log("add done in defInterface : ", this.rejected, this.resolved, this.running)
			var self = this;
			var	func = function(s,e)
			{
				//console.log("deep.chain.done : ",s,e)
				if(e || !callBack)
				{
					self.running = false;
					nextPromiseHandler.apply(self, [s, e]);
					return;
				}
				var r = callBack(s);
				if(r && (r instanceof DeepHandler || r._isBRANCHES_))
					r = deep.promise(r);
				if(r && typeof r.then === 'function')
					r.done(function (argument) {
						if(typeof argument === 'undefined')
							argument = s;
						self.running = false;
						nextPromiseHandler.apply(self, [argument, null]);
					})
					.fail(function (error) {
						self.running = false;
						nextPromiseHandler.apply(self, [null, error]);
					});
				else if(typeof r === 'undefined')
				{
					self.running = false;
					nextPromiseHandler.apply(self, [s, e]);
				}
				else if(r instanceof Error)
				{
					self.running = false;
					nextPromiseHandler.apply(self, [null, r]);
				}
				else
				{
					self.running = false;
					nextPromiseHandler.apply(self, [r, null]);
				}
			}
			this.queue.push(func);
			if((this.resolved || this.rejected) && !this.running)
				nextPromiseHandler.apply(this);
			return self;
		},
		fail:function (callBack)
		{
			var self = this;
			//console.log("add fail in defInterface")
			var func = function(s,e)
			{
				//console.log("deep.chain.fail : ",s,e)
				if((e == null || typeof e === 'undefined') || !callBack)
				{
					self.running = false;
					nextPromiseHandler.apply(self, [s, null]);
					return;
				}
				var r = callBack(e);
				if(r && (r instanceof DeepHandler || r._isBRANCHES_))
					r = deep.when(r);
				if(r && typeof r.then === 'function')
					r.done(function (argument) 
					{
						if(typeof argument === 'undefined')
						{
							self.running = false;
							nextPromiseHandler.apply(self, [null, e]);
						}
						else
						{
							self.running = false;
							nextPromiseHandler.apply(self, [argument, null]);
						}
						
					})
					.fail(function (error) {
						self.running = false;
						nextPromiseHandler.apply(self, [null, error]);
					});
				else if(typeof r === 'undefined')
				{
					self.running = false;
					nextPromiseHandler.apply(self, [null, e]);
				}
				else if(r instanceof Error)
				{
					self.running = false;
					nextPromiseHandler.apply(self, [null, r]);
				}
				else
				{
					self.running = false;
					nextPromiseHandler.apply(self, [r, null]);
				}
			}
			this.queue.push(func);
			if((this.resolved || this.rejected) && !this.running)
				nextPromiseHandler.apply(this);
			return self;
		},
		then:function (successCallBack, errorCallBack) 
		{
			var self = this;
			if(successCallBack)
				this.done(successCallBack);
			if(errorCallBack)
				this.fail(errorCallBack);
			if((this.resolved || this.rejected)  && !this.running)
				nextPromiseHandler.apply(this);
			return self;
		}
	}
	function nextPromiseHandler(result, failure )
	{
		//console.log("nextPromiseHandler ", this.running, " - ", this.queue, result, failure);
		if(this.running)
			return;
		this.running = true;
		var self = this;
		if((typeof failure === 'undefined' || failure == null) && (typeof result === 'undefined' || result == null))
		{
			failure = this.failure;
			result = this.result;
		}
		else
		{
			this.failure = failure;
			this.result = result;
		}

		if(this.result instanceof Error)
		{
			this.failure = result;
			this.result = null;
		}
		if(this.queue.length>0)
		{
			try{
				var previousContext = deep.context;
				if(previousContext !== this.context)
				{
					if(previousContext && previousContext.suspend)
						previousContext.suspend();
					deep.context = this.context;
					if(this.context && this.context.resume)
						this.context.resume();
				}

				//console.log("newQueueThen . will try next item : ",this.queue, result, failure)
				var next = this.queue.shift();
				next(result,failure);
			}
			catch(e)
			{
				var msg = "Internal deep.promise error : ";
				console.error(msg, e);
				if(deep.rethrow)
					throw e;
				setTimeout(function(){
					self.running = false;
					nextPromiseHandler.apply(self, [null, e]);
				}, 1);
			}
			finally{
				if(previousContext !== this.context){
					if(this.context && this.context.suspend){
						this.context.suspend();
					}
					if(previousContext && previousContext.resume){
						previousContext.resume();
					}
					deep.context = previousContext;
				}
			}
		}
		else
		{
			//console.log("stopping run");
			this.running = false;
		}	
	}
	function createImmediatePromise(result)
	{
		//console.log("deep.createImmediatePromise : ", result)
		var prom = new DeepPromise();
		prom.resolved = true;
		prom.running = false;
		if(result instanceof Error)
			prom.failure = result;
		else
			prom.result = result;
		return prom;
	}

	deep.promise = function(arg)
	{
		//console.log("deep.promise : ", arg)
		if(typeof arg === "undefined" || arg == null)
			return createImmediatePromise(arg);
		if(arg._isBRANCHES_)		// chain.branches case
			return deep.all(arg.branches);
		if(arg instanceof DeepHandler)
		{
			//console.log("DEEP promise with deephandler", arg.running);
			if(arg.rejected)
				throw new Error("error : deep.promise : DeepHandler has already been rejected.");
			
			if(arg.running) // need to wait rejection or success
			{
				var def = deep.Deferred();
				arg.done(function (success) { // simply chain done handler in deep chain
					//console.log("deep.promise of DeepHandler : added then")
					if(success && success.then)
						deep.when(success).then(function (success) {
							if(success instanceof Error)
							{
								def.reject(success);
								return;
							}
							def.resolve(success);
						}, function (error) {
							def.reject(error);
						})
					else
						def.resolve(success);
				})
				arg.deferred.fail(function (error) {  // register rejection on deep chain deferred.
					//console.log("deep.promise of DeepHandler : added error")
					def.reject(error);
				})
				return def.promise;
			}
			return arg; // nothing to wait : chain will act as immediate promise
		}
		if(typeof arg.promise === "function" )  // jquery deferred case
			return arg.promise();
		if(arg.promise)			// deep and promised-io deferred case
			return arg.promise;
		if(typeof arg.then === 'function')		//any promise compliant object
			return arg;
		return createImmediatePromise(arg);
	};

	deep.when = function (arg) 
	{
		// console.log("deep.when : ", arg)
		if(arg instanceof DeepHandler)
			return deep.promise(arg);
		if(arg && typeof arg.then === 'function')
			return arg;
		return deep.promise(arg);
	};

	deep.all = function(arr)
	{
		if(arr.length == 0)
			return deep.when([]);
		var def = deep.Deferred();
		var count = arr.length;
		var c = 0, d = -1;
		var res = [];
		arr.forEach(function (a){
			var i = d +1;
			deep.when(a).then(function(r){
				if(r instanceof Error)
				{
					def.reject(r);
					return;
				}

				res[i] = r;
				c++;
				if(c == count)
					def.resolve(res);
			}, function (error){
				def.reject(error);
			})
			d++;
		})
		return deep.promise(def);
	};

	promise.when = deep.when;
	promise.promise = deep.promise;
	promise.all = deep.all;
	deep.Deferred = promise.Deferred = function (){
		return new DeepDeferred();
	}
	deep.metaSchema = {};
	deep.isNode = (typeof process !== 'undefined' && process.versions && process.versions.node);
	deep.rql = require("deep/deep-rql");
	deep.query = Querier.query;
	deep.collider = require("deep/deep-collider");

	deep.interpret = utils.interpret;

	deep.context = null;

	deep.chain.error = function (argument) {
		var f = function (argument) {
			// body...
		}
	}

	deep.sequence = function (funcs, args) 
	{
		if(!funcs || funcs.length == 0)
			return args;
		var current = funcs.shift();
		var def = deep.Deferred();
		var context = {};
		var doIt = function (r) {
			deep.when(r).then(function (r) 
			{
				//console.log("deep.sequence : doIt.when : r : ", r)
				if(funcs.length == 0)
				{
					if(typeof r === 'undefined')
					{
						r = args;
						if(args.length == 1)
							r = args[0];
					}	
					//console.log("deep.sequence. resolve because funcs.length == 0 : ", r)
					def.resolve(r);
					return r;
				}
				if(typeof r === 'undefined')
					r = args;
				else
					r = [r];
				current = funcs.shift();
				doIt(current.apply(context, r));
			}, function (error) {
				def.reject(error);
			});
		}
		doIt(current.apply(context, args));
		return deep.promise(def);
	}

	deep.linker = {
		addToPath:function (section) {
			if(section instanceof DeepHandler)
				section = section._entries[0].value;
			console.log(" DEEP.LINKER Add TO PATH : ", section)
		    var old = $.address.path();
		    if(old[old.length-1] != "/")
		    	old += "/";
		    $.address.path(old+section);
		},
		setPath:function (path) {
			$.address.path(path);
		}		
	}

	// console.log("Deep initialisaed");

	deep.rethrow = true;
	return deep;

	//______________________________________________________________________________________________________________________________________
})
