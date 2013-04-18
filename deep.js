
/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
*/
/*
ADDITIONAL CHAIN METHODS

.enableLog()
.disableLog()

.condition(...)
.conditionEnd(...)

.sort(...)

logNodes
logPaths

Queries : 
options:
	deepest
	nearest
	readius
	deepness
*/

if(typeof define !== 'function')
{
	var define = require('amdefine')(module);
}

define(["require","./utils", './ie-hacks', "./deep-rql","./deep-request", "./deep-schema",  "./promise", "./deep-query", "./deep-compose"],
function(require)
{
	// console.log("Deep init");
	if(!console.warn)
		console.warn = console.log;
	if(!console.error)
		console.error = console.log;
	if(!console.info)
		console.info = console.log;

	var Validator = require("./deep-schema");
	var DeepRequest = require("./deep-request");
	var utils = require("./utils");
	var promise = require("./promise");
	var Querier = require("./deep-query");
	var deepCompose = require("./deep-compose");

	//________________________________________________________ DEEP Module

	/**
	 * deep : just say : Powaaaaaa ;)
	 * @module deep
	 */

	/**
	 * Start of deep chain
	 *
	 * @example
	 * 		deep("./json/simple.json").logValues("simple.json : ");
	 *
	 * 
	 * @class deep
	 * @constructor
	 * @param  {Object} obj an object (or retrievable string) or an array of objects to start chain. will wait if there is promise
	 * @param  {Object} schema (optional) a schema for entries. could be a retrievable
	 * @param  {Object} options (optional) an option object. could contain : rethrow:true|false
	 * @return {DeepHandler} a deep handler that hold object(s)
	 */
	deep = function (obj, schema, options)
	{
		var alls = [];
		if(obj instanceof Array)
			alls.push(deep.all(obj));
		else if(typeof obj === 'string')
			alls.push(deep.get(obj));
		else
			alls.push(obj);
		if(typeof schema === 'string')
			alls.push(deep.get(schema));
		else if(schema)
			alls.push(schema);
		var handler = new DeepHandler(options);
		handler.running = true;
		deep.all(alls)
		.done(function (results) {
			obj = results.shift();
			if(schema)
				schema = results.shift();
			handler.initialised = true;
			if(obj instanceof Array)
			{
				if(schema && schema.type !== "array")
					schema = { type:"array", items:schema };
				handler._entries = deep.query(obj, "./*", { resultType:"full", schema:schema });
				return forceNextQueueItem(handler, deep.chain.values(handler), null);
			}
			else if(obj instanceof DeepHandler)
				handler._entries = [].concat(obj._entries);
			else if(typeof obj === 'object' && obj._isDQ_NODE_)
				handler._entries = [obj];
			else if(typeof obj === 'object' && obj._deep_entry)
				handler._entries = [obj._deep_entry];
			else
				handler._entries = [Querier.createRootNode(obj, schema)];
			if(handler._entries.length > 1)
				forceNextQueueItem(handler, deep.chain.values(handler), null);
			else
				forceNextQueueItem(handler, deep.chain.val(handler), null);
		})
		.fail(function (error) {
			forceNextQueueItem(handler, null, error);
		});
		return handler;
	};
	/**
	 * rethrow any throw during chain execution.
	 * @property rethrow  
	 * @static
	 * @type {Boolean}
	 */
	deep.rethrow = true;
	deep.metaSchema = {};
	/**
	 * final namespace for deep/utils
	 * @static
	 * @property utils
	 * @type {Object}
	 */
	deep.utils = utils;
	/**
	 * perform a deep-schema validation
	 * @static
	 * @method validate
	 * @type {Function}
	 */
	deep.validate = Validator.validate;
	/**
	 * perform a deep-schema partial validation
	 * @static
	 * @method partialValidation
	 * @type {Function}
	 */
	deep.partialValidation = Validator.partialValidation;
	/**
	 * final namespace for deep/deep-compose
	 * @static
	 * @property compose
	 * @type {Object}
	 */
	deep.compose = deepCompose;
	/**
	 * are you on nodejs or not
	 * @static
	 * @property isNode
	 * @type {Boolean}
	 */
	deep.isNode = (typeof process !== 'undefined' && process.versions && process.versions.node);
	/**
	 * perform a deep-rql query
	 * @static
	 * @method rql
	 * @type {Function}
	 */
	deep.rql = require("./deep-rql");
	/**
	 * perform a deep-query query
	 * @method query
	 * @static
	 * @type {Function}
	 */
	deep.query = Querier.query;
	/**
	 * final namespace for deep/deep-collider 
	 * @static
	 * @property collider
	 * @type {Object}
	 */
	deep.collider = require("./deep-collider");
	/**
	 * final namespace for deep/deep-query
	 * @static
	 * @property Querier
	 * @type {DeepQuery}
	 */
	deep.Querier = Querier;
	/**
	 * shortcut for utils.interpret
	 * @static
	 * @method interpret
	 * @type {Function}
	 */
	deep.interpret = utils.interpret;
	deep.context = null;

	deep.request = DeepRequest;

	//_____________________________________________________________________ local (private) functions

	function callFunctionFromValue(entry, functionName, args)
	{
		if(typeof args === 'undefined')
			args = [];
		else if(!(args instanceof Array))
			args = [args];
		var prom;
		if(entry.value && entry.value[functionName])
		{
			entry.value._deep_entry = entry;
			prom = entry.value[functionName].apply(entry.value, args);
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
	function runFunctionFromValue(entry, func, args)
	{
		//console.log("runFunctionFromValue", entry)
		if(typeof args === 'undefined')
			args = [];
		else if(!(args instanceof Array))
			args = [args];

		if(!entry.value)
			return undefined;
		entry.value._deep_entry = entry;
		var prom = func.apply(entry.value, args);
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
		if(result instanceof Error)
		{
			//console.log("nextChainHandler : result is error : ",result);
			this.reports.failure = failure = result;
			this.reports.result = result = null;
		}
		if((typeof failure === 'undefined' || failure === null) && (typeof result === 'undefined' || result === null))
		{
			failure = this.reports.failure;
			result = this.reports.result;
		}
		else
		{
			this.reports.failure = failure;
			this.reports.result = result;
		}

		if(this.oldQueue)
		{
			this.callQueue = this.callQueue.concat(this.oldQueue);
			delete this.oldQueue;
		}

		if(this.callQueue.length>0)
		{
			var next = this.callQueue.shift();
			var error = null;
			var previousContext = deep.context;
			try{
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
				else if(next._isTHEN_ ||  next._isTRANSPARENT_ || next._isPUSH_HANDLER_TO_)
				{
					//console.log("failure : next isThen");
					next(result,failure);
				}
				/*else // PASSIVE TRANSPARENCY : SKIP CURRENT handle
				{
					self.running = false;
					nextQueueItem.apply(self, [result, failure]);
				}*/
				else if(!this.rejected)
				{
					//console.log("failure : no more Then : reject");
					this.reject(failure);
				}
			}
			catch(e)
			{
				var msg = "Internal chain error : rethrow ? "+ self.rethrow;
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
	function forceNextQueueItem(handler, s, e)
	{
		//console.log("forceNextQueue Item : ", s,e)
		handler.running = false;
		nextQueueItem.apply(handler, [s, e]);
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

	function cloneHandler(handler, cloneValues)
	{
		//console.log("cloneHandler : ", handler);
		var newRes = [];
		if(cloneValues)
			newRes = newRes.concat(handler._entries);
		var newHandler = new DeepHandler({
			_entries:newRes,
			result: handler.reports.result,
			failure: handler.reports.failure
		});
		return newHandler;
	}

	//_________________________________________________________________________________________
	/**
	 * Deep Chain Handler  : manage asynch and synch in one chain
	 * @class DeepHandler
	 * @constructor
	 * @param {Object} obj    [description]
	 * @param {Object} schema [description]
	 */
	var DeepHandler = function(options)
	{
		this.rethrow = deep.rethrow;
		this.positions = [];
		this.context = deep.context;
		options = options || {};
		this.querier = new Querier();
		this.callQueue = [];
		this._entries = options._entries || [];
		this.queries = [];
		this.deferred = deep.Deferred();
		this.rejected=false;
		this.reports = {
			result:options.result || null,
			failure:options.failure || null
		};
	};
	deep.Handler = DeepHandler;
	DeepHandler.prototype = {
		querier:null,
		synch:true,
		_entries:null,
		callQueue:null,
		reports:null,
		queries:null,
		/**
		 * allow to create chain branches 
		 *
		 * synch
		 * transparent : not relevant
		 * 
		 * @method  brancher
		 * @return brancher function 
		 */
		brancher:function ()
		{
			var self = this;
			var brancher = {
				branch:function () {
					if(!this.branches)
						this.branches = [];
					var cloned = cloneHandler(self, true);
					this.branches.push(cloned);
					forceNextQueueItem(cloned,self.reports.result, self.reports.failure);
					return cloned;
				},
				_isBRANCHES_:true
			};
			return brancher;
		},
		/**
		 * reverse entries order
		 *
		 * inject entries values as chain success.
		 * 
		 * @chainable
		 * @method  reverse
		 * @return {DeepHandler} this
		*/
		reverse:function () {
			var self = this;
			var create =  function(s,e)
			{
				self._entries.reverse();
				self.running = false;
				nextQueueItem.apply(self, [deep.chain.values(self), null]);
			};
			addInQueue.apply(this, [create]);
			return self;
		},
		/**
		 * catch any throwned error while chain running
		 *
		 * asycnh
		 * transparent true
		 * 
		 * @method  catchError
		 * @chainable
		 * @param {boolean} catchIt if true : catch all future chain error. (true by default) 
		 * @return {DeepHandler}
		*/
		catchError:function (catchIt) {
			var self = this;
			if(typeof catchIt === 'undefined')
				catchIt = true;
			var create =  function(s,e)
			{
				self.rethrow = !catchIt;
				self.running = false;
				nextQueueItem.apply(self, [s, e]);
			};
			create._isTRANSPARENT_ = true;
			addInQueue.apply(this, [create]);
			return self;
		},
		//_______________________________________________________________  CANCEL AND REJECT
		/**
		 * cancel chain. 
		 *
		 * end of chain
		 * synch
		 *
		 * @method  cancel
		 * @param  reason the reason of the chain cancelation (any string or object)
		 * @return nothing
		 */
		cancel:function (reason)  // not chainable
		{
			//console.log("_________________________________________ CHAIN CANCELATION")
			if(this.rejected)
				throw  new Error("deep chain could not be canceled : it has already been rejected! ");
			var queue = this.callQueue;
			this.callQueue = [];
			this.reports.cancel = reason;
			this.deferred.cancel(reason);
		},
		/**
		 * reject chain. 
		 *
		 * end of chain
		 * synch
		 *
		 * @method  reject
		 * @param  {*} reason the reason of the chain cancelation (any string or object)
		 * @return nothing
		 */
		reject:function (reason)  // not chainable
		{
			//console.log("deep chain reject : reason : ", reason);
			if(this.rejected)
				throw  new Error("deep chain has already been rejected! ");
			this.reports.failure = reason;
			this.rejected = true;
			this.callQueue = [];
			this.deferred.reject(reason);
		},
		//_____________________________________________________________  BRANCHES
		/**
		 * asynch handler for chain branches creation
		 *
		 * if you return the branches function (the branch creator) : the chain will wait until all the branches are done before continuing
		 *
		 *  Inject function result in chain as success or error.
		 *
		 * 	@example
		*	chain.branches( function(branches)
		*	{
		*		branches.branch().query(...).load().log()
		*		branches.branch().query(...).post().log();
		*		//...
		*		return branches;
		*	});
		*
		*	// if you want to return a subset of branches promises : 
		*	// you could use deep.all([array_of_promises]) :
		*
		*		var branch = branches.branch().myChain()...;
		*		//...
		*		return deep.all([deep.promise(branch), ...]);
		 * 
		 * @method  branches
		 * @async
		 * @chainable
		 * @param   {Function} func the callback that will receive the brancher (see above)
		 * @return  {DeepHandler} this
		 */
		branches:function ( func )
		{
			var self = this;
			var create =  function(s,e)
			{
				deep.when(func(cloneHandler(self,true).brancher())).then(function (success)
				{
					self.running = false;
					nextQueueItem.apply(self, [success, null]);
				},
				function (error)
				{
					//console.error("error : deep.branches : ", error);
					self.running = false;
					nextQueueItem.apply(self, [null, error]);
				});
			};
			addInQueue.apply(this, [create]);
			return self;
		},
		//______________________________________________________ PROMISE INTERFACE
		/**
		 * wait promise resolution or rejection before continuing chain
		 *
		 *	asynch
		 *	transparent false
		 * 
		 * @method  when
		 * @param  {Promise} prom the promise to waiting for
		 * @chainable
		 * @return {Deephandler}
		 */
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
						//console.error("error : deep.chain.when : ", e);
						self.running = false;
						nextQueueItem.apply(self, [null,e]);
					});
				};
			}
			addInQueue.apply(this,[func()]);
			return this;
		},
		/**
		 * handle previous chain's handle success
		 *
		 * the callback receive 3 arguments : 
		 * 		success, handler, brancher
		 *
		 * the success is the success object produced by previous chain's handle
		 * the handler is the chain handle itself
		 * the brancher is the brancher function that create clone of the chain to produce chain branches
		 * 
		 *	asynch
		 * 
		 * @method  done
		 * @chainable
		 * @param  callback the calback function to handle success
		 * @return Deephandler
		 */
		done : function(callBack)
		{
			var self = this;
			var	func = function(s,e)
			{
				//console.log("deep.chain.done : ",s,e)
				if(e || !callBack || s instanceof Error)
				{
					forceNextQueueItem(self, s, e);
					return;
				}
				self.oldQueue = self.callQueue;
				self.callQueue = [];

				deep.when(callBack(s, self, self.brancher())).then(function (argument) {
					var error = null;
					if(typeof argument === 'undefined')
						argument = s;
					else if(argument instanceof Error)
					{
						error = argument;
						argument = null;
					}
					self.callQueue = self.callQueue.concat(self.oldQueue);
					delete self.oldQueue;
					forceNextQueueItem(self, argument, error);
				}, function (error) {
					self.callQueue = self.callQueue.concat(self.oldQueue);
					delete self.oldQueue;
					forceNextQueueItem(self, null, error);
				});
			};
			func._isTHEN_ = true;
			addInQueue.apply(this, [func]);
			return self;
		},
		/**
		 * handle previous chain handle error
		 *
		 * the callback receive 3 arguments : 
		 * 		error, handler, brancher
		 *
		 * the error is the success object produced by previous chain's handle
		 * the handler is the chain handle itself
		 * the brancher is the brancher function that create clone of the chain to produce chain branches
		 * 
		 *	asynch
		 * 
		 * @method  fail
		 * @chainable
		 * @param  callback the calback function to handle error
		 * @return Deephandler
		 */
		fail:function (callBack)
		{
			var self = this;
			var func = function(s,e)
			{
				if((e === null || typeof e === 'undefined') || !callBack)
				{
					forceNextQueueItem(self, s, e);
					return;
				}
				self.oldQueue = self.callQueue;
				self.callQueue = [];
				deep.when(callBack(e, self, self.brancher())).then(function (argument) {
					self.callQueue = self.callQueue.concat(self.oldQueue);
					delete self.oldQueue;
					if(typeof argument === 'undefined')
						forceNextQueueItem(self, null, e);
					else if(argument instanceof Error)
						forceNextQueueItem(self, null, argument);
					else
						forceNextQueueItem(self, argument, null);
				}, function (error) {
					self.callQueue = self.callQueue.concat(self.oldQueue);
					delete self.oldQueue;
					forceNextQueueItem(self, null, error);
				});
			};
			func._isTHEN_ = true;
			addInQueue.apply(this,[func]);
			return self;
		},
		/**
		 * handle previous chain handle success and error
		 *
		 * 	add a .done and a .fail (orderedly) in chain with callbacks.
		 * 
		 * @method  then
		 * @param  successCallBack the calback function to handle success
		 * @chainable
		 * @param  errorCallBack the calback function to handle error
		 * @return {Deephandler} this
		 */
		then:function (successCallBack, errorCallBack)
		{
			if(successCallBack)
				this.done(successCallBack);
			if(errorCallBack)
				this.fail(errorCallBack);
			return this;
		},
		//___________________________________________________________________________ NAVIGATION
		/**
		 * perform a range on chain entries : so will remove any chain entries of of range index.
		 *
		 *	asynch
		 *
		 *
		 *  inject a rangeObject as chain success : 
		 *  	{
		 *  		start:number,
		 *  		end:number,
		 *  		total:number,
		 *  		results:Array,
		 *  		hasNext:boolean,
		 *  		hasPrevious:boolean
		 *  	}
		 * @example
	deep([0,1,2,3,4,5])
	.range(1,4)
	.valuesEqual([1,2,3,4]);

	deep([0,1,2,3,4,5])
	.range(3,5)
	.valuesEqual([3,4,5]);
		 * 
		 * @method  range
		 * @param  start the index of range start
		 * @param  end the index of range end
		 * @chainable
		 * @return {DeepHandler} this
		 */
		range : function (start, end)
		{
			var self = this;
			var func = function(s,e){
				var rangeObject = null;
				
				rangeObject = utils.createRangeObject(start, end, self._entries.length);
				self._entries = self._entries.slice(rangeObject.start, rangeObject.end+1);
				rangeObject.results = deep.chain.values(self);
				forceNextQueueItem(self, rangeObject, null);
			};
			addInQueue.apply(this,[func]);
			return this;
		},
		/**
		 * save current chain position. it means that it will save
		 * 	- current entries 
		 * 	- current success and errors
		 * 	- current store (if any) in private queue before continuing.
		 * 
		 *	asynch
		 *	transparent true
		 * 
		 * @method  position
		 * @param  name the name of position (its id/label)
		 * @param  options optional object (no options for the moment)
		 * @return {DeepHandler} this
		 */
		position : function  (name, options)
		{
			var self = this;
			var func = function(s,e){
				deep.chain.position(self, name, options);
				self.running = false;
				nextQueueItem.apply(self, [s,e]);
			};
			addInQueue.apply(this,[func]);
			return this;
		},
		/**
		 * go back to a previously saved position (see .position).
		 * If no name is provided : go back to last position (if any)
		 *
		 * throw an error if no position founded.
		 *
		 * inject chain values as chain success
		 * 
		 * @method  back
		 * @chainable
		 * @param   name the name of the last position asked
		 * @param  	options   (optional - no options for the moment)
		 * @return {[type]}
		 */
		back : function  (name, options)
		{
			var self = this;
			var func = function(s,e){
				var position = null;
				if(name)
				{
					var pos = self.positions.concat([]), ok = false;
					while(true && pos.length >0)
					{
						position = pos.pop();
						if(position.name == name)
						{
							ok = true;
							break;
						}
					}
					if(pos.length === 0 && !ok)
						position = null;
				}
				else
					position = self.positions[self.position.length-1];
				if(!position)
					throw new Error("chain handler error : no positions to go back with name : "+name);
				self._entries = position.entries;
				self._store = position.store;
				self.running = false;
				nextQueueItem.apply(self, [deep.chain.values(self),null]);
			};
			addInQueue.apply(this,[func]);
			return this;
		},
		/**
		 * keep only the first chain entries. remove all others
		 *
		 * asynch
		 * inject selected entry value as chain success
		 * 
		 * @chainable
		 * @method  first
		 * @return DeepHandler
		 */
		first : function  ()
		{
			var self = this;
			var func = function(){
				self._entries = [self._entries[0]];
				self.running = false;
				nextQueueItem.apply(self, [self._entries]);
			};
			addInQueue.apply(this,[func]);
			return this;
		},
		/**
		 * keep only the last chain entries. remove all others
		 *
		 * asynch
		 * inject selected entry value as chain success
		 * 
		 * @chainable
		 * @method  last
		 * @return DeepHandler
		 */
		last : function  ()
		{
			var self = this;
			var func = function(){
				self._entries = [self._entries[self._entries.length-1]];
				self.running = false;
				nextQueueItem.apply(self, [deep.chain.values(self), null]);
			};
			addInQueue.apply(this,[func]);
			return this;
		},
		/**
		 * take current entries parents (if any) as new entries.
		 *
		 * inject new entries values as chain success.
		 * 
		 * asynch
		 * 
		 * @method  parents
		 * @chainable
		 * @param boolean errorIfEmpty : if true and no parents was selected : throw an error 
		 * @return DeepHandler
		 */
		parents : function (errorIfEmpty)
		{
			var self = this;
			var func = function(){
				var res = [];
				self._entries.forEach(function (r) {
					res.push(r.ancestor);
				});
				res = deep.utils.arrayUnique(res, "path");
				self._entries = res;
				if(res.length === 0 && errorIfEmpty)
					throw new Error("deep.parents could not gives empty results");
				self.running = false;
				nextQueueItem.apply(self, [deep.chain.values(self), null]);
			};
			addInQueue.apply(this,[func]);
			return self;
		},
		/**
		 * take object, shcema, options and create fresh chain entries from it. Same mecanism as new chain.
		 * @method  root
		 * @chainable
		 * @param  object the object to produce entries  (could be a retrievable string - e.g. "json::myobject.json" - see retrievable doc)
		 * @param  schema the schema of the object  (could be a retrievable string - e.g. "json::myobject.json" - see retrievable doc)
		 * @return [DeepHandler] this
		 */
		root:function (object, schema, options)
		{
			var self = this;
			var func = function()
			{
				deep(object, schema)
				.nodes(function (nodes) {
					self._entries = nodes;
				})
				.done(function (success) {
					forceNextQueueItem(self, success, null);
				});
			};
			addInQueue.apply(this,[func]);
			return this;
		},
		/**
		 * Apply the query on EACH chain entries and concatened all the results to form new chain entries.
		 *
		 *
		 * inject queried results as chain success
		 * 
		 * @method  query
		 * @chainable
		 * @param  {string} q the deep-query. Could be an ARRAY of Queries : the result will be the concatenation of all queries on all entries
		 * @param  {boolean} errorIfEmpty : if true : throw an error if query return nothing
		 * @return {DeepHandler} this (chain handler)
		 */
		query : function(q, errorIfEmpty)
		{
			var src = this;
			//src.queries.push(q);
			if(!(q instanceof Array))
				q = [q];
			var func = function()
			{
				//console.log("do query : ", q)
				var res = [];
				src._entries.forEach(function (r) {
					q.forEach(function (qu) {
						res = res.concat(src.querier.query(r, qu , {resultType:"full"}));
					});
				});
				src._entries = res;
				if(res.length === 0 && errorIfEmpty)
					throw new Error("deep.query could not gives empty results");
				src.running = false;
				nextQueueItem.apply(src, [deep.chain.values(src), null]);
			};
			addInQueue.apply(src, [func]);
			return src;
		},
		/**
		 * same as .query : but in place of holding queried entries : it return directly the query results.
		 * Is the synch version of the query handle.
		 *
		 * synch true
		 * transparent false
		 * 
		 * @method  select
		 * @chainable
		 * @param  {string} q the deep-query. Could be an ARRAY of Queries : the result will be the concatenation of all queries on all entries
		 * @return {DeepHandler} this
		 */
		select : function(q)
		{
			var src = this;
			if(!(q instanceof Array))
				q = [q];
			var res = [];
			src._entries.forEach(function (r) {
				q.forEach(function (qu) {
					res = res.concat(src.querier.query(r, qu));
				});
			});
			return res;
		},
		//_________________________________________________________________    MODELISATION
		/**
		 * set schema of all entries (purely assignation)
		 * inject entries shemas as chain success
		 * @method  schema
		 * @chainable
		 * @param  {string|object} schema  could be a retrievable string (e.g. "json::myschema.json" - see retrievable doc)
		 * @return {DeepHandler} this (chain handler)
		 */
		schema : function(schema)
		{
			//metaSchema = metaSchema || deep.metaSchema || {};
			var self = this;
			var func = function(){
				deep.when(deep.get(schema)).then(function (schema) {
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
			};
			addInQueue.apply(this,[func]);
			return this;
		},
		/**
		 * apply provided schema on all entries schemas (.up application)
		 * inject entries shemas as chain success
		 * @method  schemaUp
		 * @chainable
		 * @param  {string|object} schema  could be a retrievable string (e.g. "json::myschema.json" - see retrievable doc)
		 * @return {DeepHandler} this (chain handler)
		 */
		schemaUp : function(schema, metaSchema)
		{
			metaSchema = metaSchema || deep.metaSchema || {};
			var self = this;
			var func = function(){
				deep.when(deep.get(schema))
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
						console.error("error : deep.schemaUp : ",error);
						forceNextQueueItem(self, null, error)
					});
				})
				.fail(function (error) {
					self.running = false;
					nextQueueItem.apply(self, [null, error]);
				});
			};
			addInQueue.apply(this,[func]);
			return this;
		},
		/**
		 * apply provided schema on all entries schemas (.bottom application)
		 *
		 * inject entries shemas as chain success
		 *
		 * 
		 * @method  schemaBottom
		 * @chainable
		 * @param  {string|object} schema  could be a retrievable string (e.g. "json::myschema.json" - see retrievable doc)
		 * @return {DeepHandler} this (chain handler)
		 */
		schemaBottom : function(schema, metaSchema)
		{
			metaSchema = metaSchema || deep.metaSchema || {};
			var self = this;
			var func = function(){
				deep.when(deep.get(schema))
				.done(function (schema) {
					var alls = [];
					self._entries.forEach(function(result){
						if(!result.schema)
							result.schema = {};
						alls.push(utils.bottom(schema, result.schema, metaSchema));
					});
					deep.all(alls).then(function (loadeds) {
						self.running = false;
						nextQueueItem.apply(self, [deep.chain.schemas(self), null]);
					},
					function (error) {
						console.error("error : deep.schemaBottom : ",error);
						forceNextQueueItem(self, null, error)
						
					});
				})
				.fail(function (error) {
					self.running = false;
					nextQueueItem.apply(self, [null, error]);
				});
			};
			addInQueue.apply(this,[func]);
			return this;
		},
		/**
		 * set entries properties by path.
		 *
		 * synch
		 * inject setted values as chain success
		 * 
		 * @method  setByPath
		 * @chainable
		 * @param {string} path  a slash delimitted path (e.g. "/my/property")
		 * @param {object|primitive} obj the value to assign (could be a retrievable strings)
		 */
		setByPath : function(path, obj)
		{
			var self = this;
			var func = function(){
				deep.when(deep.get(obj)).then(function (obj)
				{
					var res = [];
					self._entries.forEach(function(result){
						res.push(utils.setValueByPath(result.value, path, obj, '/'));
					});
					self.running = false;
					nextQueueItem.apply(self, [res, null]);
				},
				function (error) {
					self.running = false;
					nextQueueItem.apply(self, [null, error]);
				});
			};
			addInQueue.apply(this,[func]);
			return this;
		},
		/**
		 * apply arguments from UP on each entries : will merge objects and array together DEEPLY. see docs and examples.
		 *
		 * synch
		 * inject entries values as chain success.
		 * 
		 * @method  up
		 * @chainable
		 * @param objects a list (coma separated - not an array) of objects to apply on each chain entries
		 * @return {DeepHandler} this
		 */
		up : function()
		{
			var args = Array.prototype.slice.call(arguments);
			var self = this;
			var func = function(){
				deep.when(deep.getAll(args)).then(function (objects)
				{
					self._entries.forEach(function(result){
						objects.forEach(function (object) {
							//console.log("deep.up : entry : ", result, " - to apply : ", object)
							utils.up(object, result.value, result.schema, result.ancestor?result.ancestor.value:null, result.key);
						});
					});
					self.running = false;
					nextQueueItem.apply(self, [deep.chain.values(self), null]);
				},
				function (error) {
					console.error("error : deep.up : ",error);
					forceNextQueueItem(self, null, error)
				});
			};
			addInQueue.apply(this,[func]);
			return this;
		},
		/**
		 * 
		 * apply arguments from BOTTOM on each entries : will merge objects and array together DEEPLY. see docs and examples.
		 *
		 * synch
		 * inject entries values as chain success.
		 * @method  bottom
		 * @chainable
		 * @param objects a list (coma separated - not an array) of objects to apply on each chain entries
		 * @return {DeepHandler} this
		 */
		bottom : function()
		{
			var args = Array.prototype.slice.call(arguments);
			args.reverse();
			var self = this;
			var func = function(){
				deep.when(deep.getAll(args)).then(function (objects)
				{
					self._entries.forEach(function(result){
						objects.forEach(function (object) {
							utils.bottom(object, result.value, result.schema, result.ancestor?result.ancestor.value:null, result.key);
						});
					});
					self.running = false;
					nextQueueItem.apply(self, [deep.chain.values(self), null]);
				},
				function (error) {
					console.error("error : deep.bottom : ",error);
					forceNextQueueItem(self, null, error)
				});
			};
			addInQueue.apply(this,[func]);
			return this;
		},
		/**
		 *
		 *	synch
		 * 
		 * replace queried entries properties by new value and inject replaced properties as chain success.
		 *
		 * @example
		 
	var a = {
		aString : "Hello",
		anInt : 5,
		anArray : ["1","2","3"],
		anObject : {
			anArray : ["4","5","6"],
			aString : "World"
		}
	}
	deep(a)
	.replace("./anArray/1","replaceString")
	.equal({
		aString : "Hello",
		anInt : 5,
		anArray : ["1","replaceString","3"],
		anObject : {
			anArray : ["4","5","6"],
			aString : "World"
		}
	});

		 * @method  replace
		 * @param  {string} what a query to select properties to replace 
		 * @param  {object} by  any value to assign (could be a retrievable string)
		 * @chainable
		 * @param  {object} options (optional) : it is the options object for the deep.get which will eventually retrieve the 'by' object (see deep.get)
		 * @return {DeepHandler} this
		 */
		replace : function (what, by, options)
		{
			var self = this;
			var func = function(){
				deep.when(deep.get(by, options)).then(function (by)
				{
					var replaced = [];
					self._entries.forEach(function (r) {
						self.querier.query(r, what, {resultType:"full"}).forEach(function(r){
							if(!r.ancestor)
								return;
							r.ancestor.value[r.key] = r.value = by;
							replaced.push(r);
						});
					});
					self.running = false;
					nextQueueItem.apply(self, [replaced, null]);
				}, function (error) {
					//console.error("error : deep.replace : ",error);
					forceNextQueueItem(self, null, error)
				});
			};
			addInQueue.apply(this,[func]);
			return this;
		},
		/**
		 * 
		 * remove queried properties from entries and inject removed properties as chain success.
		 * @example
	var a = {
		aString : "Hello",
		anInt : 5,
		anArray : ["1","2","3"],
		anObject : {
			anArray : ["4","5","6"],
			aString : "World"
		}
	}

	deep(a)
	.remove("./anArray/1").log().valuesEqual([{
		aString : "Hello",
		anInt : 5,
		anArray : ["1","3"],
		anObject : {
			anArray : ["4","5","6"],
			aString : "World"
		}
	}]);

	@example

	var obj = { 
		email: 'test@test.com',
		password: 'test54',
	 	id: '51013dec530e96b112000001' 
	}
	 var schema = { 
	 	properties: 
		{ 
		  	id: { type: 'string', required: false, minLength: 1 },
		    email: { type: 'string', required: true, minLength: 1 },
		    password: { type: 'string', required: true, "private": true } 
		},
	 	additionalProperties: false 
	}

	deep(obj, schema)
	.remove(".//*?_schema.private=true")
	.equal({ 
		email: 'test@test.com',
	 	id: '51013dec530e96b112000001' 
	 });

		 * @chainable
		 * @method  remove
		 * @param  {string} what a query to select properties to replace 
		 * @return {DeepHandler} this
		 */
		remove : function (what)
		{
			var self = this;
			var func = function(){
				var removed = [];
				self._entries.forEach(function (r) {
					self.querier.query(r, what, {resultType:"full"}).forEach(function(r)
					{
						if(!r.ancestor)
							return;
						removed.push(r);
						if(r.ancestor.value instanceof Array)
							r.ancestor.value.splice(r.key,1);
						else
						{
							delete r.ancestor.value[r.key];
						}
					});
				});
				self.running = false;
				nextQueueItem.apply(self, [removed, null]);
			};
			addInQueue.apply(this,[func]);
			return this;
		},
		/**
		 * will perform the backgrounds application on any backgrounds properties at any level
		 * 
		 *	not intend to be call directly by programmer. use at your own risk. use .flatten instead.
		 *	
		 * @method  extendsChilds
		
		 * @private
		 * @param  {DeepEntry} entry from where seeking after backgrounds properties
		 * @return {DeepPromise} a promise
		 */
		extendsChilds : function(entry)
		{
			if(!entry)
				return entry;
			var toExtends = this.querier.query(entry, ".//*?backgrounds", {resultType:"full"});
			if(toExtends.length === 0)
				return entry;
			var deferred = deep.Deferred();
			var rec = toExtends[0];
			var handler = deep(rec);
			handler.flatten().then(function ()
			{
				deep.when(handler.extendsChilds(entry)).then(function () {
					deferred.resolve(entry);
				}, function (error) {
					deferred.reject(error);
				});
			},
			function (error) {
				deferred.reject(error);
			});
			return deep.promise(deferred);
		},
		/**
		 * will perform the backgrounds application FIRSTLY and FULLY (full recursive) on current entries before appying extendsChild.
		 *
		 *	not intend to be call directly by programmer. use at your own risk.  use .flatten instead.
		 * 
		 * @method  extendsBackgrounds
		 * @private
		 * @param  {DeepEntry} entry from where seeking after backgrounds properties
		 * @return {DeepPromise} a promise
		 */
		extendsBackgrounds:function (entry)
		{
			var self = this;
			var value = entry;
			if(!entry)
				return [];
			if(entry._isDQ_NODE_)
				value = entry.value;
			if(value.backgrounds !== null && typeof value.backgrounds === "object")
			{
				var deferred = deep.Deferred();
				if(!value.backgrounds.push)
					value.backgrounds = [ value.backgrounds ];
				deep.when(deep.getAll(value.backgrounds, { root:entry })).then(function extendedsLoaded(extendeds){
					var recursion = [];
					while(extendeds.length > 0)
					{
						var exts = extendeds.shift();
						if(exts instanceof Array)
						{
							extendeds = exts.concat(extendeds);
							continue;
						}
						recursion.push(exts);
						recursion.push(self.extendsBackgrounds(exts));
					}
					deep.all(recursion).then(function (extendeds){
						var res = [];
						extendeds.forEach(function (extended){
							res = res.concat(extended);
						});
						delete value.backgrounds;
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
		/**
		 * will perform FULL backgrounds application on chain entries. (see backgrounds documentation)
		 *
		 * Success injected : entries values
		 * Errors injected : any flatten error
		 * @example
	var a = {
	    obj:{
	    	first:true
	    },
	    myFunc:function(){
	        console.log("base myFunc");
	        this.obj.a = true;
	    }
	}

	var b = {
		backgrounds:[a],
		obj:{
			second:true
		},
		myFunc:deep.compose.after(function()
		{
			console.log("myFunc of b : ", this)
			this.obj.b = true;
		})
	}

	deep({})
	.bottom(b)
	.flatten()
	.run("myFunc")
	.query("./obj")
	.equal({
   		first:true,
   		second:true,
        a:true,
        b:true
    });

	deep({
	    sub:{
	        backgrounds:[b],
	        obj:{
	        	third:true
	        }
	    }
	})
	.flatten()
	.query("/sub")
	.run("myFunc")
	.query("./obj")
	 .equal({
    	first:true,
   		second:true,
   		third:true,
        a:true,
        b:true
    });

		 * @chainable
		 * @async
		 * @method  flatten
		 * @return {DeepHandler} this
		 */
		flatten : function()
		{
			var self = this;
			var count = 0;
			var doChilds = function(result)
			{
				deep.when(self.extendsChilds(result)).then(function () {
					count--;
					if(count === 0)
					{
						self.running = false;
						nextQueueItem.apply(self, [deep.chain.values(self), null]);
					}
				}, function (error) {
					console.error("error : deep.flatten : ",error);
					throw new Error("error : deep.flatten : "+error);
				});
			};
			var func = function(){
				var alls = [];
				self._entries.forEach(function (result)
				{
					count++;
					if(typeof result.value.backgrounds !== 'undefined' && result.value.backgrounds !== null)
					{
						deep.when(self.extendsBackgrounds(result)).then(function(stack) {
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
				if(self._entries.length === 0)
				{
					self.running = false;
					nextQueueItem.apply(self, [deep.chain.values(self), null]);
				}
			};
			addInQueue.apply(this,[func]);
			return this;
		},
		//______________________________________________________________  RUNS
		/**
		 * transform : loop on entries, apply 'func' with 'args' on each entry : replace entries values with func result
		 * function could return promise.
		 *
		 * - loop on entries : true
		 * - chainable : true
		 * - transparent : false
		 * - promised management : true
		 * - success injected : the array of results of each call on func
		 * - error injected : any error returned (or produced) from a func call
		 * 
		 * @method transform
		 * @chainable
		 * @param  {Function} func any function that need to be apply on each chain entry
		 * @param  {Array} args the arguments to pass to 'func'
		 * @return {DeepHandler}  the current chain handler (this)
		 */
		transform : function (transformer)
		{
			var self = this;
			var func = function(s,e){
				var alls = [];
				self._entries.forEach(function(result){
					alls.push(transformer(result.value));
				});
				deep.all(alls).done(function (loadeds)
				{
					self._entries.forEach(function(result){
						result.value = loadeds.shift();
						if(result.ancestor)
							result.ancestor[result.key] = result.value;
					});
					self.running = false;
					nextQueueItem.apply(self, [loadeds, null]);
				},
				function (error)
				{
					console.error("error : deep.transform : ", error);
					self.running = false;
					nextQueueItem.apply(self, [null, error]);
				});
			};
			addInQueue.apply(this,[func]);
			return this;
		},
		/**
		 * run : loop on entries, apply 'func' with 'args' on each entry (entry become 'this' of func)
		 * function could retrun promise.
		 *
		 * - loop on entries : true
		 * - chainable : true
		 * - transparent : false
		 * - promised management : true
		 * - success injected : the array of results of each call on func
		 * - error injected : any error returned (or produced) from a func call
		 * @method run
		 * @chainable
		 * @param  {Function} func any function that need to be apply on each chain entry
		 * @param  {Array} args the arguments to pass to 'func'
		 * @return {DeepHandler}  the current chain handler (this)
		 */
		run : function (funcRef, args)
		{
			var self = this;
			args = args || [];
			var create = function(s,e){
				var alls = [];
				self._entries.forEach(function(result){
					if(!funcRef)
					{
						if(typeof result.value != "function")
							return;
						if(result.ancestor)
							alls.push(callFunctionFromValue(result.ancestor, result.key, args));
						else
							alls.push(result.value(args || null));
						return;
					}
					if(typeof funcRef === 'function')
						alls.push(runFunctionFromValue(result, funcRef, args));
					else if(typeof funcRef === 'string')
						alls.push(callFunctionFromValue(result, funcRef, args));
					else
						alls.push(result);
				});
				deep.all(alls).then(function (loadeds)
				{
					self.running = false;
					nextQueueItem.apply(self, [loadeds, null]);
				},
				function (error)
				{
					console.error("error : deep.run : ", error);
					self.running = false;
					nextQueueItem.apply(self, [null, error]);
				});
			};
			addInQueue.apply(this,[create]);
			return this;
		},
		/**
		 * exec :  call 'func' with 'args' (the 'this' of the function isn't modified)
		 * function could retruen promise.
		 *
		 * - loop on entries : false
		 * - chainable : true
		 * - transparent : false
		 * - promised management : true
		 * - success injected : the result of the call on func
		 * - error injected : any error returned (or produced) from func call
		 *
		 *
		 * @method  exec
		 * @chainable
		 * @param  {Function} func any function that need to be apply on each chain entry
		 * @param  {Array} args the arguments to pass to 'func'
		 * @return {DeepHandler}  the current chain handler (this)
		 */
		exec : function (func, args)
		{
			var self = this;
			args = args || [];
			var create = function()
			{
				deep.when(func.apply({}, args)).then(function (loadeds)
				{
					self.running = false;
					nextQueueItem.apply(self, [loadeds, null]);
				},
				function (error)
				{
					console.error("error : deep.exec : ", error);
					self.running = false;
					nextQueueItem.apply(self, [null, error]);
				});
			};
			addInQueue.apply(this,[create]);
			return this;
		},
		/**
		 * apply a 'treatments' on chain entries (each entry will be the context of the treatment). (renderables are treatments - see doc and example).
		 *
		 * a treaments is an object that contains : {
		 *   what : (optional) object|retrievable_string a value to inject in 'how' function. if no 'what' is provided : inject the entry (the context) in 'how'
		 * 	 how : a function to treat 'what' (simple function that have a single argument (what) and return its result),
		 * 	 where: (optional) a function to send the results somewhere, return the descriptor of the sended ressource (see deep-ui : dom.apendTo for example),
		 * 	 done : a callback function that will be called on treated entry (the context of the done) when treatment succeed
		 * 	 fail : a callback function that will be called on treated entry (the context of the fail) when treatment failed
		 * }
		 *
		 * if entry contain a 'treat' function : will be called and provided treatment will be passed as argument
		 *
		 * Keep previous entries (maybe modified by treatment)
		 *
		 * Chain Success Injection : the treatments results
		 * Chain Error Injection : the treatments errors
		 * 
		 * @method  treat
		 * @param  {object} treatment
		 * @chainable
		 * @return {DeepHandler} this
		 */
		treat: function(treatment) {
			var self = this;
			var func = function(s, e)
			{
				var alls = [];
				if (treatment) {
					self._entries.forEach(function(entry) {
						alls.push(deep.applyTreatment.apply(treatment, [entry.value]));
					});
				} else {
					self._entries.forEach(function(entry) {
						if (typeof entry.value.treat === 'function')
							alls.push(entry.value.treat(treatment));
						else alls.push(entry.value);
					});
				}
				deep.all(alls)
				.done(function(results) {
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [results, null]);
				})
				.fail(function(results) {
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [null, results]);
				});
			};
			deep.chain.addInQueue.apply(this, [func]);
			return this;
		},
		//_______________________________________________________________ TESTS AND VALIDATIONS

		/**
		 * valuesEqual : test strict equality between the array of entries values and a provided array of value
		 *
		 * - loop on entries : false
		 * - chainable : true
		 * - transparent : false
		 * - promised management : true (on callBack)
		 * - success injected : the result of the callBack or the report if callback returned nothing
		 * - error injected : the report or any error returned (or produced) from callBack
		 *
		 *
		 * 	Chain Success injection : the valid report
		 *	Chain Error injection : the unvalid report
		 *
		 * @method  valuesEqual
		 * @param  {Object} obj      the object to test equality
		 * @param  {Function} callBack optional : any callBack to manage the report. Could return a promise.
		 * @chainable
		 * @return {DeepHandler}     this
		 */
		valuesEqual : function(obj, callBack)
		{
			var self = this;
			var func = function(){
				var res = deep.chain.values(self);
				var o = {equal:utils.deepEqual(res, obj), needed:obj, needLength:obj.length, valuesLength:res.length, value:res};
				if(o.equal)
					console.info("deep.valuesEqual : "+ JSON.stringify(o, null, ' '));
				else
					console.error("deep.valuesEqual : "+ JSON.stringify(o, null, ' '));

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
					nextQueueItem.apply(self, [o, !o.equal]);
				}
			};
			addInQueue.apply(this,[func]);
			return self;
		},

		/**
		 * equal test strict equality on each entry value against provided object
		 *
		 *	Chain Success injection : the valid report
		 *	Chain Error injection : the unvalid report
		 *
		 * 
		 * @method  equal
		 * @param  {*} obj      the object to test
		 * @param  {Function}	optional. callBack a callBack to manage report
		 * @chainable
		 * @return {DeepHandler}        this
		 */
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
					var o = {path:r.path, equal:ok, value:r.value, needed:obj};
					res.push(o);
					if(!ok)
						errors.push(o);
					if(o.equal)
						console.info("deep.equal : "+o.equal+" : ", o);
					else
						console.error("deep.equal : "+o.equal+" : ", o);
				});
				var report = {
					equal:(self._entries.length > 0) && (errors.length===0),
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
					});
				}
				else
				{
					if(errors.length === 0)
						errors = null;
					self.running = false;
					nextQueueItem.apply(self, [report, errors]);
				}
			};
			addInQueue.apply(this,[func]);
			return self;
		},

		/**
		 * validate apply validation
		 *
		 *	Chain Success injection : the valid report
		 *	Chain Error injection : the unvalid report
		 * 
		 * @method  validate
		 * @param  {Object} options [description]
		 * @chainable
		 * @return {DeepHandler}         [description]
		 */
		validate:function(options)
		{
			options = options || {};
			var self = this;
			var func = function(){
				var  a = [];
				//console.log("deep.log : ", self._entries)
				self._entries.forEach(function (e) {
					a.push(Validator.validate(e.value, options.schema || e.schema));
				});
				deep.all( a ).then( function ( reports ) {
					var freport = {
						valid:true,
						reports:reports
					};
					reports.forEach ( function ( report ) {
						if(report.valid)
							return;
						freport.valid = false;
					});
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
						nextQueueItem.apply(self, [freport, null]);
					}
				}, function (error) {
					self.running = false;
					nextQueueItem.apply(self, [null, error]);
				});
			};
			addInQueue.apply(this,[func]);
			return this;
		},

		// __________________________________________________ LOG
		/**
		 * 
		 * log any provided arguments.
		 * If no arguments provided : will log current success or error state.
		 *
		 * asynch
		 * transparent true
		 * 
		 * @method  log
		 * @return {DeepHandler} this
		 * @chainable
		 */
		log:function ()
		{
			var self = this;
			var args = Array.prototype.slice.call(arguments);
			var func = function(s,e)
			{
				if(args.length === 0)
				{
					args.push("deep.log : ");
					if(e)
					{
						args.push("ERROR State : ");
						args.push(e);
					}
					else
					{
						args.push("SUCCESS State : ");
						args.push(s);
					}
				}
				args.forEach(function (a) {
					console.log(a);
				});
				self.running = false;
				nextQueueItem.apply(self,[s, e]);
			};
			func._isTRANSPARENT_ = true;
			addInQueue.apply(this,[func]);
			return this;
		},
		/**
		 * 
		 * log current chain entries  with optional title
		 *
		 * full option means print full entry in place of just entry.value
		 * pretty option means print pretty json (indented)
		 * 
		 * asynch
		 * transparent true
		 *
		 * @method  logValues
		 * @chainable
		 * @param title (optional) the title you want
		 * @param options (optional) : an object { full:true|false, pretty:true|false }
		 * @return {DeepHandler} this
		 */
		logValues:function (title, options)
		{
			var self = this;
			options = options || {};
			var func = function(success, error)
			{
				console.log(title||"deep.logValues : ", " ("+self._entries.length+" values)");
				self._entries.forEach(function (e) {
					var val = e;
					var entry = null;
					if(e.value)
					{
						entry = e.value._deep_entry;
						delete e.value._deep_entry;
					}
					
					if(!options.full)
						val = e.value;
					if(options.pretty)
						val = JSON.stringify(val, null, ' ');
					console.log("\t- entry : ("+e.path+") : ", val);
					if(entry && e.value)
						e.value._deep_entry = entry;
				});
				self.running = false;
				nextQueueItem.apply(self,[success, error]);
			};
			func._isTRANSPARENT_ = true;
			addInQueue.apply(this,[func]);
			return this;
		},
		// ________________________________________ READ ENTRIES

		/**
		 *
		 * if no callBack is present : just return the FIRST value of entries. It's a chain end handle.
		 * If callback is provided : the FIRST entry  value will be passed as argument to callback.
		 * 		and so th chain could continue : the return of this handle is the deep handler.
		 *
		 * transparent true
		 * 
		 * @method  val
		 * @param callBack
		 * @chainable
		 * @return {Deephandler|entry.value} this or val
		 */
		val:function  (callBack)
		{
			var self = this;
			var func = function(s,e)
			{
				var  a = self._entries[0]?self._entries[0].value:null;
				deep.when(callBack(a)).then(function (argument) {
					if(typeof argument === "undefined")
						argument = a;
					self.running = false;
					nextQueueItem.apply(self, [s, e]);
				}, function (error) {
					console.error("error : deep.values : ",error);
					self.running = false;
					nextQueueItem.apply(self, [null, error]);
				});
			};
			if(callBack)
			{
				addInQueue.apply(this,[func]);
				return this;
			}
			else
				return deep.chain.values(this).shift();
		},
		/**
		 *
		 * will passe as argument each entries to callback.
		 * callback could return promise. the chain will wait any promise before continuing.
		 *
		 *
		 *	Chain Success injection : the results of callback calls (resolved if promises)
		 *	Chain Error injection : the errors of callback calls (rejected if promises)
		 * 
		 * @method  each
		 * @chainable
		 * @param callBack
		 * @return {Deephandler} this
		 */
		each:function  (callBack)
		{
			var self = this;
			var func = function()
			{
				var alls = [];
				self._entries.forEach(function(e){
					alls.push(callBack(e.value));
				});
				deep.all(alls).then(function (results) {
					self.running = false;
					nextQueueItem.apply(self, [results, null]);
				}, function (error) {
					console.error("error : deep.each : ",error);
					self.running = false;
					nextQueueItem.apply(self, [null, error]);
				});
			};
			addInQueue.apply(this,[func]);
			return this;
		},
		  /**
		 *
		 * if no callBack is present : just return the array of values of entries. It's a chain end handle.
		 * If callback is provided : the entries values will be passed as argument to callback.
		 * 		and so th chain could continue : the return of this handle is the deep handler.
		 *
		 * transparent true
		 *
		 * 
		 * @method  values
		 * @chainable
		 * @param callBack
		 * @return {Deephandler|Array} this or values
		 */
		values:function  (callBack)
		{
			var self = this;
			var func = function(s,e)
			{
				var  a = deep.chain.values(self);
				deep.when(callBack(a)).then(function (argument) {
					if(typeof argument === "undefined")
						argument = a;
					self.running = false;
					nextQueueItem.apply(self, [s, e]);
				}, function (error) {
					console.error("error : deep.values : ",error);
					self.running = false;
					nextQueueItem.apply(self, [null, error]);
				});
			};
			if(callBack)
			{
				addInQueue.apply(this,[func]);
				return this;
			}
			else
				return deep.chain.values(this);
		},
		/**
		 *
		 * if no callBack is present : just return the array of entries. It's a chain end handle.
		 * If callback is provided : the entries will be passed as argument to callback.
		 * 		and so th chain could continue : the return of this handle is the deep handler.
		 * 
		 * transparent true
		 * 
		 * @method  nodes
		 * @chainable
		 * @param callBack
		 * @return {Deephandler|Array} this or entries
		 */
		nodes:function  (callBack)
		{
			var self = this;
			var func = function(s,e)
			{
				var  a = self._entries.concat([]);
				deep.when(callBack(a)).then(function (argument) {
					self.running = false;
					nextQueueItem.apply(self, [s, e]);
				}, function (error) {
					console.error("error : deep.nodes : ",error);
					self.running = false;
					nextQueueItem.apply(self, [null, error]);
				});
			};
			if(callBack)
			{
				addInQueue.apply(this,[func]);
				return this;
			}
			else
				return deep.chain.nodes(this);
		},
		/**
		 *
		 * if no callBack is present : just return the array of paths of entries. It's a chain end handle.
		 * If callback is provided : the entries paths will be passed as argument to callback.
		 * 		and so th chain could continue : the return of this handle is the deep handler.
		 *
		 * transparent true
		 * 
		 * @chainable
		 * @method  paths
		 * @param callBack
		 * @return {Deephandler|Array} this or paths
		 */
		paths:function  (callBack)
		{
			var self = this;
			var func = function(s,e)
			{
				var  a = deep.chain.paths(self);
				deep.when(callBack(a)).then(function (argument) {
					if(typeof argument === "undefined")
						argument = a;
					self.running = false;
					nextQueueItem.apply(self, [s, e]);
				}, function (error) {
					console.error("error : deep.paths : ",error);
					self.running = false;
					nextQueueItem.apply(self, [null, error]);
				});
			};
			if(callBack)
			{
				addInQueue.apply(this,[func]);
				return this;
			}
			else
				return deep.chain.paths(this);
		},
		/**
		 *
		 * if no callBack is present : just return the array of schemas of entries. It's a chain end handle.
		 * If callback is provided : the entries schemas will be passed as argument to callback.
		 * 		and so th chain could continue : the return of this handle is the deep handler.
		 * 
		 * transparent true
		 * 
		 * @chainable
		 * @method  schemas
		 * @param callBack
		 * @return {Deephandler|Array} this or schemas
		 */
		schemas:function  (callBack)
		{
			var self = this;
			var func = function(s,e)
			{
				var  a = deep.chain.schemas(self);
				deep.when(callBack(a)).then(function (argument) {
					if(typeof argument === "undefined")
						argument = a;
					self.running = false;
					nextQueueItem.apply(self, [s,e]);
				}, function (error) {
					console.error("error : deep.schemas : ",error);
					self.running = false;
					nextQueueItem.apply(self, [null, error]);
				});
			};
			if(callBack)
			{
				addInQueue.apply(this,[func]);
				return this;
			}
			else
				return deep.chain.schemas(this);
		},
		//___________________________________________________________ WAIT

		/**
		 * will wait xxxx ms before contiuing chain
		 *
		 * transparent true
		 * 
		 * 
		 * @chainable
		 * @method delay
		 * @param  {number} ms
		 * @return {Deephandler} this
		 */
		delay:function (ms)
		{
			var self = this;
			function func(){
				return function(s,e){
					//console.log("deep.delay : ", ms)
					setTimeout(function () {
						console.log("deep.delay.end : ", ms);
						self.running = false;
						nextQueueItem.apply(self, [s, e]);
					}, ms);
				};
			}
			func._isTRANSPARENT_ = true;
			addInQueue.apply(this,[func()]);
			return this;
		},
		//____________________________________________________________________  LOAD

		/**
		 * will seek in entries after any retrievable string OR executable functions : and will replace references by loaded/returned content.
		 *
		 * if context is provided : will try to 'interpret' (see .interpret) strings before retrieving them.
		 *
		 * Chain Success injection : array of loaded results
		 *
		 * @method deepLoad
		 * @param  {object} context (optional) a context to interpret strings before retrieving
		 * @chainable
		 * @return {DeepHandler} this
		 */
		deepLoad:function(context)
		{
			var self = this;
			function func(){
				return function(s,e){
					var  paths = [];
					var  promises = [];
					//console.log("deepLoad : ", self)
					self._entries.forEach(function (e) {
						var strings = self.querier.query(e, ".//*?or(_schema.type=string,_schema.type=function)", {resultType:"full"});
						strings.forEach(function (toLoad) {

							//console.log("deep.deepLoad : toLoad : ", toLoad);
							if(typeof toLoad.value === 'string')
							{
								var val = toLoad.value;
								if(context)
									val = deep.interpret(toLoad.value, context);
								promises.push(deep.get(val, {root:(toLoad.root)?toLoad.root.value:null, basePath:toLoad.path }));
							}
							else if(typeof toLoad.value === 'function')
								promises.push(toLoad.value());
							else
								promises.push(toLoad.value);
							paths.push(toLoad);
						});
					});
					deep.all(promises)
					.done(function (results) {
						//console.log("direct results of deepLoad : ", results);
						var count = 0;
						results.forEach(function  (r) {
							var e = paths[count++];
							if(e.ancestor)
								e.ancestor.value[e.key] = e.value = r;
						});
						self.running = false;
						nextQueueItem.apply(self, [ results, null ]);
					})
					.fail(function (error) {
						console.error("error : deep.deepLoad : ", error);
						self.running = false;
						nextQueueItem.apply(self, [ null, error ]);
					});
				};
			}
			addInQueue.apply(this,[func()]);
			return this;
		},
		/**
		 *
		 * if request is provided : 
		 * 		try to retrieve 'request' and replace entries values by loaded result
		 * 	else
		 * 		will try to retrieve any entry.value strings (will not seek deeply) and replace associated entries values by loaded result.
		 * 		OR if entry.value is an object : look if there is any .load() function in it. If so : fire it.
		 * 
		 * if context is provided : will try to 'interpret' (see .interpret) strings before retrieving them.
		 * 	(on request or entries values)
		 *
		 * Chain success injection : array of loaded content.
		 * 	
		 * @method load
		 * @param  {string} (optional) request
		 * @param  {object} (optional) context the context to interpret strings
		 * @chainable
		 * @return {DeepHandler} this
		 */
		load:function (request, context)
		{
			var self = this;
			function func(){
				return function(){
					var  paths = [];
					var  promises = [];
					//console.log("deep.load : ", deep.chain.stringify(self))
					//console.log("deep.load : entries : ", self.entries)

					if(request)
					{
						if(typeof request === "string")
						{
							if(context)
								request = deep.interpret(request, context);
							promises.push(deep.get(request));
						}
						if(typeof request === 'function')
							promises.push(request());
						else
							promises.push(request);
					}
					else
						self._entries.forEach(function (e) {
							if(!e.value)
								return;
							if(e.value.load)
								promises.push(callFunctionFromValue(e, "load"));
							else if(typeof e.value === 'string')
							{
								var toLoad = e.value;
								if(context)
									toLoad = deep.interpret(toLoad, context);
								promises.push(deep.get(toLoad, { root:(e.root)?e.root.value:e.value, basePath:e.path }));
							}
							else
								promises.push(e.value);
							paths.push(e);
						});
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
							});
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
							});
						self.running = false;
						nextQueueItem.apply(self, [results, null]);
					},
					function (error) {
						console.error("deep.load errors : ", error);
						self.running = false;
						nextQueueItem.apply(self, [null, error]);
					});
				};
			}
			addInQueue.apply(this,[func()]);
			return this;
		},

		//________________________________________________________________________ INTERPET STRINGS

		/**
		 *
		 * seek after any strings and try to interpret it with current context.
		 *
		 * see interpretation for simple case  
		 * @example
		 * 
		 * 		deep({ msg:"hello { name }" }).deepInterpret({ name:"john" }).logValues().equal({ msg:"hello john" });
		 * 
		 * 
		 * @method deepInterpret
		 * @chainable
		 * @param  {object} context the oebjct to inject in strings
		 * @return {DeepHandler} this
		 */
		deepInterpret:function(context)
		{
			var self = this;
			var func = function(){
				context = (typeof context === 'string')?deep.get(context):context;
				deep(context)
				.done(function (context)
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
						});
					});
					self.running = false;
					nextQueueItem.apply(self, [res, null]);
				})
				.fail(function (error)
				{
					console.error("error : deep.deepInterpret : ", error);
					self.running = false;
					nextQueueItem.apply(self, [null, error]);
				});
			};
			addInQueue.apply(this,[func]);
			return this;
		},
		/**
		 * will interpret entries values with context
		 * @example  
		 * 	 	deep("hello { name }").interpret({ name:"john" }).val();
		 *   	//will provide "hello john".
		 * 		deep({
		 *     		msg:"hello { name }"
		 * 		})
		 * 		.query("./msg")
		 * 		.interpret({ name:"john" })
		 * 		.logValues()
		 * 		.equal("hello john");
		 *   
		 * @method interpret
		 * @chainable
		 * @param  {object} context the context to inject in strings
		 * @return {DeepHandler} this
		 */
		interpret:function(context)
		{
			var self = this;
			var func = function(){
				console.log("deep.chain.interpret : context : ",context);
				context = (typeof context === 'string')?deep.get(context):context;
				deep(context).then(function (context) {
					console.log("interpret: received context : ", context);
					var res = [];
					self._entries.forEach(function (interpretable)
					{
						if(typeof interpretable.value === 'string')
						{
							var r = deep.interpret(interpretable.value, context);
							res.push(r);
							if(!interpretable.ancestor)
								//	throw new Error("You couldn't interpret root !");
								interpretable.value = r;
							else
								interpretable.ancestor.value[interpretable.key] = interpretable.value = r;
							console.log("deep.chain.interpret : res : ", r);
						}
						else
							res.push(interpretable.value);
					});
					self.running = false;
					nextQueueItem.apply(self, [res, null]);
				}, function (error) {
					console.error("error : deep.interpret : ", error);
					self.running = false;
					nextQueueItem.apply(self, [null, error]);
				});
			};
			addInQueue.apply(this,[func]);
			return this;
		},

		//________________________________________________________ PUSH TO

		pushHandlerTo : function(array)
		{
			var self = this;
			function func(){
				var f = function(s,e)
				{
					// console.log("pushHandlerTo : init? ", self.initialised)
					array.push(self);
					if(self.initialised)
					{
						self.running = false;
						nextQueueItem.apply(self, [s, e]);
					}
				};
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
				return function(success, error){
					var res = [];
					self._entries.forEach(function (e) {
						array.push(e);
						res.push(e);
					});
					self.running = false;
					nextQueueItem.apply(self, [success, error]);
				};
			}
			addInQueue.apply(this,[func()]);
			return this;
		},
		pushValuesTo:function(array)
		{
			var self = this;
			function func(){
				return function(success, error){
					var res = [];
					self._entries.forEach(function (e) {
						array.push(e.value);
						res.push(e.value);
					});
					self.running = false;
					nextQueueItem.apply(self, [success, error]);
				};
			}
			addInQueue.apply(this,[func()]);
			return this;
		},
		pushPathsTo:function(array)
		{
			var self = this;
			var func =function(success, error){
				var res = [];
				self._entries.forEach(function (e) {
					array.push(e.path);
					res.push(e.path);
				});
				self.running = false;
				nextQueueItem.apply(self, [success, error]);
			};
			addInQueue.apply(this,[func]);
			return this;
		},
		pushSchemasTo:function(array)
		{
			var self = this;
			var func = function(success, error){
				var res = [];
				self._entries.forEach(function (e) {
					array.push(e.schema);
					res.push(e.schema);
				});
				self.running = false;
				nextQueueItem.apply(self, [success, error]);
			};
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
						});
					else if(totest)
						self.reject(totest);
					else
					{
						self.running = false;
						nextQueueItem.apply(self, [totest, null]);
					}
				};
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
						});
					else if(totest)
						self.cancel(totest);
					else
					{
						self.running = false;
						nextQueueItem.apply(self, [totest, null]);
					}
				};
			}
			addInQueue.apply(this,[func()]);
			return self;
		},
		//__________________________________________________________ MAP
		/**
		 * It's the way of performing a SQL JOIN like between two objects.
		 * Objects could be retrievables.
		 *
		 * take current entries, seek after localKeys, use it to get 'what' with foreignKey=localKey, and finnaly store result at 'whereToStore' path in current entries values.
		 *
		 * @example

	deep([{ title:"my title", id:1}, { title:"my title 2", id:2}])
	.mapOn([
	    {itemId:1, value:true}, 
	    {itemId:2, value:"133"}, 
	    {itemId:2, value:"hello"}
	    ], 
	    "id","itemId","linkeds")
	.valuesEqual([
	    {
	        title:"my title", 
	        id:1, 
	        linkeds:{itemId:1, value:true}
	    },
	    { 
	        title:"my title 2", 
	        id:2,
	        linkeds:[
	            {itemId:2, value:"133"},
	            { itemId:2, value:"hello"}
	        ]
	    }
	]);
		 * 
		 * @method mapOn
		 * @chainable
		 * @param  {Collection|retrievable_string} what
		 * @param  {string} localKey  the name of the localKey to match with Collection items
		 * @param  {string} foreignKey  the name of the foreignKey to match with current entries
		 * @param  {string} whereToStore the path where save map result in each entries
		 * @return {DeepHandler} this
		 */
		mapOn: function(what, localKey, foreignKey, whereToStore)
		{
			var self = this;
			var doMap = function (what, localKey, foreignKey, whereToStore)
			{
				var map = {};
				what.forEach(function (w) {
					if(w === null)
						return;
					var val = w[foreignKey];
					if(typeof map[val] !== 'undefined')
					{
						if(map[val] instanceof Array)
							map[val].push(w);
						else
							map[val] = [map[val] ,w];
					}
					else
						map[val] = w;
				});
				self._entries.forEach(function(entry) {
					if(map[entry.value[localKey]])
						entry.value[whereToStore || localKey] = map[entry.value[localKey]];
				});
				forceNextQueueItem(self, deep.chain.values(self), null);
			};
			var func = function(s, e) {
				if(self._entries.length === 0)
				{
					forceNextQueueItem(self, deep.chain.values(self), null);
					return;
				}
				if(typeof what === 'string')
				{
					var parsed = deep.parseRequest(what);
					var cloned = cloneHandler(self, true);
					var foreigns = cloned.select("./"+localKey).join(",");
					var constrain = foreignKey+"=in=("+foreigns+")";
					if(parsed.uri.match(/(\/\?)|^(\?)/gi))
						parsed.uri += "&"+constrain;
					else
						parsed.uri += "?"+constrain;
					console.log("mapOn : parsedUri with constrains : ",parsed.uri);
					if(parsed.store !== null)
					{
						deep(parsed.store.get(parsed.uri)).done(function (results) {
							results = [].concat(results);
							doMap(results, localKey, foreignKey, whereToStore);
						});
					}
					else
						forceNextQueueItem(self, null, new Error("deep.mapOn need array as 'what' : provided : "+ JSON.stringify(what)));
				}
				else
					doMap(what, localKey, foreignKey, whereToStore);
			};
			deep.chain.addInQueue.apply(this, [func]);
			return this;
		}
	};

	//________________________________________________________ DEEP CHAIN UTILITIES

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
		val:function (handler) {
			if(handler._entries.length === 0)
				return undefined;
			return handler._entries[0].value;
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
		},
		position : function (handler, name, options) {
			options = options || {};
			handler.positions.push({
				name:name,
				entries:handler._entries.concat([]),
				store:handler._store,
				queue:(options.restartChain)?handler.callQueue.concat([]):null
			});
		}
	};
	

	//_____________________________________________________________________ DEFERRED

	/**
	 * A deep implementation of Deferred object (see promise on web)
	 * @class DeepDeferred
	 * @constructor
	 */
	var DeepDeferred = function ()
	{
		this.context = deep.context;
		this.running = true;
		this.queue = [];
		this.promise = new DeepPromise(this);
	};

	DeepDeferred.prototype = {
		context:null,
		promise:null,
		rejected:false,
		resolved:false,
		canceled:false,
		result:null,
		failure:null,
		/**
		 * resolve the Deferred and so the associated promise
		 * @method resolve
		 * @param  {Object} argument the resolved object injected in promise
		 * @return {DeepDeferred} this
		 */
		resolve:function (argument)
		{
			if(this.rejected || this.resolved || this.canceled)
				throw new Error("DeepDeferred (resolve) has already been resolved !");
			this.promise.result = this.result = argument;
			this.promise.running = false;
			if(argument instanceof Error)
			{
				this.rejected = this.promise.rejected = true;
				nextPromiseHandler.apply(this.promise, [null, argument]);
			}
			else{
				this.resolved = this.promise.resolved = true;
				nextPromiseHandler.apply(this.promise, [argument, null]);
			}
		},
		/**
		 * reject the Deferred and so the associated promise
		 * @method reject
		 * @param  {Object} argument the rejected object injected in promise
		 * @return {DeepDeferred} this
		 */
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
		/**
		 * cancel the Deferred and so the associated promise
		 * @method cancel
		 * @param  {Object} reason the cancel reason object injected in promise
		 * @return {DeepDeferred} this
		 */
		cancel:function (reason)
		{
			// console.log("DeepDeferred.cancel");
			if(this.rejected || this.resolved || this.canceled)
				throw new Error("DeepDeferred (cancel) has already been canceled !");
			this.canceled = this.promise.canceled = true;
			this.promise.queue = [];
		},
		/**
		 * add .done and .fail in promise chain.
		 * @method then
		 * @param  {Function} sc successHandler
		 * @param  {Function} ec errorhandler
		 * @return {DeepDeferred} this
		 */
		then:function (sc,ec) {
			this.promise.then(s,e);
		},
		/**
		 * add .done callback handler in promise chain
		 * @method done
		 * @param  {Function} argument successHandler
		 * @return {DeepDeferred} this
		 */
		done:function (argument) {
			this.promise.done(argument);
		},
		/**
		 * add .fail callback handler in promise chain
		 * @method fail
		 * @param  {Function} argument successHandler
		 * @return {DeepDeferred} this
		 */
		fail:function (argument) {
			this.promise.fail(argument);
		}
	};
	//________________________________________________________ PROMISES
	/**
	 * a deep implementation of Promise (see web for Promise) 
	 * @class DeepPromise
	 * @constructor
	 * @param {DeepDeferred} deferred
	 */
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
	};
	DeepPromise.prototype = {
		rejected:false,
		resolved:false,
		canceled:false,
		synch:false,
		result:null,
		failure:null,
		/**
		 * add .done callback handler in promise chain
		 * @method done
		 * @param  {Function} argument successHandler
		 * @return {DeepDeferred} this
		 */
		done:function (callBack)
		{
			//console.log("add done in defInterface : ", this.rejected, this.resolved, this.running)
			var self = this;
			var	func = function(s,e)
			{
				//console.log("deep.promise.done : ",s,e)
				if(e || !callBack || s instanceof Error)
				{
					//console.log("deep.promise.done : but error : ",e)
					self.running = false;
					nextPromiseHandler.apply(self, [s, e]);
					return;
				}
				var r = callBack(s);
				if(r && (r instanceof DeepHandler || r._isBRANCHES_))
					r = deep.promise(r);
				if(r && typeof r.then === 'function')
					r.done(function (argument)
					{
						if(typeof argument === 'undefined')
							argument = s;
						self.running = false;
						nextPromiseHandler.apply(self, [(argument instanceof Error)?null:argument, (argument instanceof Error)?argument:null]);
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
			};
			this.queue.push(func);
			if((this.resolved || this.rejected) && !this.running)
				nextPromiseHandler.apply(this);
			return self;
		},
		/**
		 * add .fail callback handler in promise chain
		 * @method fail
		 * @param  {Function} argument successHandler
		 * @return {DeepDeferred} this
		 */
		fail:function (callBack)
		{
			var self = this;
			//console.log("add fail in defInterface")
			var func = function(s,e)
			{
				//console.log("deep.promise.fail : ",s,e)
				if((e === null || typeof e === 'undefined') || !callBack)
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
						self.running = false;
						if(typeof argument === 'undefined')
							nextPromiseHandler.apply(self, [null, e]);
						else if(argument instanceof Error)
							nextPromiseHandler.apply(self, [null, argument]);
						else
							nextPromiseHandler.apply(self, [argument, null]);
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
			};
			this.queue.push(func);
			if((this.resolved || this.rejected) && !this.running)
				nextPromiseHandler.apply(this);
			return self;
		},
		/**
		 * add .done and .fail in promise chain.
		 * @method then
		 * @param  {Function} sc successHandler
		 * @param  {Function} ec errorhandler
		 * @return {DeepDeferred} this
		 */
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
	};
	function nextPromiseHandler(result, failure )
	{
		//console.log("nextPromiseHandler ", this.running, " - ", this.queue, result, failure);
		if(this.running)
			return;
		this.running = true;
		var self = this;
		if((typeof failure === 'undefined' || failure === null) && (typeof result === 'undefined' || result === null))
		{
			failure = this.failure;
			result = this.result;
		}
		else
		{
			this.failure = failure;
			this.result = result;
		}

		if(result instanceof Error)
		{
			//console.log("nextPromiseHandler : result is error : ",result)
			this.failure = failure = result;
			this.result = result = null;
		}
		if(this.queue.length>0)
		{
			var previousContext = deep.context;
			try{
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
		//console.log("deep.createImmediatePromise : ", result instanceof Error)
		var prom = new DeepPromise();
		prom.running = false;
		if(result instanceof Error)
		{
			prom.rejected = true;
			prom.failure = result;
		}
		else
		{	prom.resolved = true;
			prom.result = result;
		}
		return prom;
	}

	/**
	 * 
	 * @for deep
	 * @static 
	 * @method promise
	 * @param  {Object} arg  an object on when create a promise
	 * @return {DeepPromise} a promise
	 */
	deep.promise = function(arg)
	{
		//console.log("deep.promise : ", arg)
		if(typeof arg === "undefined" || arg === null)
			return createImmediatePromise(arg);
		if(arg._isBRANCHES_)		// chain.branches case
			return deep.all(arg.branches);
		if(arg instanceof DeepHandler)
		{
			//console.log("DEEP promise with deephandler", arg.running);
			//if(arg.rejected)
				//throw new Error("error : deep.promise : DeepHandler has already been rejected.");
			//if(arg.running) // need to wait rejection or success
			//{
				var def = deep.Deferred();
				arg.deferred.fail(function (error) {  // register rejection on deep chain deferred.
					//console.log("deep.promise of DeepHandler : added error")
					def.reject(error);
				});
				arg.done(function (success) { // simply chain done handler in deep chain
					if(success && success.then)
						deep.when(success)
						.fail(function (error) {
							def.reject(error);
						})
						.done(function (success) {
							console.log("deep.promise of DeepHandler : done : error ?", success instanceof Error );
							def.resolve(success);
						});
					else
						def.resolve(success);
				});
				return def.promise;
			//}
			//return arg; // nothing to wait : chain will act as immediate promise
		}
		if(typeof arg.promise === "function" )  // jquery deferred case
			return arg.promise();
		if(arg.promise)			// deep and promised-io deferred case
			return arg.promise;
		if(typeof arg.then === 'function')		//any promise compliant object
			return arg;
		return createImmediatePromise(arg);
	};

	/**
	 * return a promise that will be fullfilled when arg are ready (resolve or immediat)
	 * @for deep
	 * @static 
	 * @method when
	 * @param  {Object} arg an object to waiting for
	 * @return {DeepPromise} a promise
	 */
	deep.when = function (arg)
	{
		if(arg instanceof DeepHandler)
			return deep.promise(arg);
		if(arg && typeof arg.then === 'function')
			return arg;
		return deep.promise(arg);
	};

	/**
	 * return a promise that will be fullfilled when all args are ready (resolve or immediat)
	 * @for deep
	 * @static 
	 * @method all
	 * @param  {Object} arg an array of objects to waiting for
	 * @return {DeepPromise} a promise
	 */
	deep.all = function()
	{
		var arr = [];
		for(var i in arguments)
			arr = arr.concat(arguments[i]);
		if(arr.length === 0)
			return deep.when([]);
		var def = deep.Deferred();
		var count = arr.length;
		var c = 0, d = -1;
		var res = [];
		var rejected = false;
		arr.forEach(function (a){
			var i = d +1;
			if(!a || !a.then)
			{
				if(a instanceof Error)
				{
					rejected = true;
					if(!def.rejected && !def.resolved && !def.canceled)
						def.reject(a);
					return;
				}
				res[i] = a;
				c++;
				if(c == count)
					def.resolve(res);
			}
			else
				deep.when(a).then(function(r){
					if(r instanceof Error)
					{
						if(!def.rejected && !def.resolved && !def.canceled)
							def.reject(r);
						return;
					}
					res[i] = r;
					c++;
					if(c == count)
						def.resolve(res);
				}, function (error){
					if(!def.rejected && !def.resolved && !def.canceled)
						def.reject(error);
				});
			d++;
		});
		return deep.promise(def);
	};

	promise.when = deep.when;
	promise.promise = deep.promise;
	promise.all = deep.all;
	deep.Deferred = promise.Deferred = function (){
		return new DeepDeferred();
	};
	//______________________________________
	deep.DeepPromise = DeepPromise;
	//________________________________________________________ DEEP CHAIN UTILITIES

	/**
	 * execute array of funcs sequencially
	 * @for deep
	 * @static 
	 * @method sequence
	 * @param  {String} funcs an array of functions to execute sequentially
	 * @param  {Object} args (optional) some args to pass to first functions
	 * @return {DeepHandler} a handler that hold result 
	 */
	deep.sequence = function (funcs, args)
	{
		if(!funcs || funcs.length === 0)
			return args;
		var current = funcs.shift();
		var def = deep.Deferred();
		var context = {};
		var doIt = function (r) {
			deep.when(r).then(function (r)
			{
				if(funcs.length === 0)
				{
					if(typeof r === 'undefined')
					{
						r = args;
						if(args.length == 1)
							r = args[0];
					}
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
				if(!def.rejected && !def.resolved && !def.canceled)
					def.reject(error);
			});
		};
		doIt(current.apply(context, args));
		return deep.promise(def);
	};

	//_______________________________________________________________________________ STORES

	/**
	 *
	 * how manage collections and objects as http styled stores
	 * 
	 * @submodule deep.stores
	 */
	deep.stores = {};
	deep.handlers = {};
	deep.handlers.decorations = {};
	deep.store = function (name, definer, options)
	{
		options = options || {};
		var store = null;
		if(!definer)
		{
			if(!deep.stores[name])
				throw new Error("deep.store(name) : no store found with : ", name);
			return deep.stores[name];
		}
		else if(definer instanceof Array)
			store = deep.stores[name] = deep.store.ArrayStore(definer, options);
		else if(definer instanceof deep.store.DeepStore)
			store = deep.stores[name] = definer.create(name, options);
		else store = deep.stores[name] = deep.store.ObjectStore(definer, options);
		store.name = name;
		store.options = options;
		return store;
	};
	deep.Handler.prototype.store = function (argument)
	{
		var self = this;
		var store = null;
		if(typeof argument === 'string')
		{
			if(!deep.stores[argument])
				throw new Error("no store found with : ",argument);
			store = deep.stores[argument];
		}
		else
			store = argument;
		var func = function (s,e) {
			//console.log("chain.store : set store : ", store.name);
			self._store = store;
			deep.chain.position(self, store.name);
			forceNextQueueItem(self, s, e);
		};
		deep.handlers.decorations.store(store, self);
		addInQueue.apply(this,[func]);
		return self;
	};
	deep.handlers.decorations.store = function (store, handler) {
		//console.log("store decoration");
		deep.utils.up({
			_store : deep.collider.replace(store),

			get : deep.compose
			.condition(typeof store.get === "function")
			.createIfNecessary()
			.replace(function (id, options) {
				var self = this;
				if(id == "?" || !id)
					id = "";

				var func = function (s,e) {
					self._store.get(id, options)
					.done(function (success) {
						//console.log("deep(...).store : get : success : ", success);
						if(success instanceof Array)
							self._entries = deep(success).nodes();
						else
							self._entries = [deep.Querier.createRootNode( success )];
						forceNextQueueItem(self, success, null);
					})
					.fail(function (error) {
						forceNextQueueItem(self, null, error);
					});
				};
				addInQueue.apply(this,[func]);
				self.range = deep.Handler.range;
				return self;
			}),

			post : deep.compose
			.condition(typeof store.post === "function")
			.createIfNecessary()
			.replace(function (object, id, options) {
				var self = this;
				var func = function (s,e)
				{
					self._store.post(object || deep.chain.val(self),id, options)
					.done(function (success) {
						self._entries = [deep.Querier.createRootNode(success)];
						forceNextQueueItem(self, success, null);
					})
					.fail(function (error) {
						console.log("deeo.chain.store.post : post failed : ", error);
						forceNextQueueItem(self, null, error);
					});
				};
				self.range = deep.Handler.range;
				addInQueue.apply(this,[func]);
				return self;
			}),

			put : deep.compose
			.condition(typeof store.put === "function")
			.createIfNecessary()
			.replace(function (object, options) {
				var self = this;
				//console.log("deep.chain.put : add in chain : ", object, id);
				var func = function (s,e) {
					//console.log("deep.chain.put : ", object, id);
					self._store.put(object  || deep.chain.val(self),id, options)
					.done(function (success) {
						self._entries = [deep.Querier.createRootNode(success)];
						forceNextQueueItem(self, success, null);
					})
					.fail(function (error) {
						forceNextQueueItem(self, null, error);
					});
				};
				self.range = deep.Handler.range;
				addInQueue.apply(this,[func]);
				return self;
			}),

			patch : deep.compose
			.condition(typeof store.patch === "function")
			.createIfNecessary()
			.replace(function (object, id, options) {
				var self = this;
				var func = function (s,e) {
					self._store.patch(object  || deep.chain.val(self),id, options)
					.done(function (success) {
						self._entries = [deep.Querier.createRootNode(success)];
						forceNextQueueItem(self, success, null);
					})
					.fail(function (error) {
						forceNextQueueItem(self, null, error);
					});
				};
				self.range = deep.Handler.range;
				addInQueue.apply(this,[func]);
				return self;
			}),

			del : deep.compose
			.condition(typeof store.del === "function")
			.createIfNecessary()
			.replace(function (id, options) {
				var self = this;
				var func = function (s,e) {
					var val = deep.chain.val(self);
					self._store.del(id || val.id, options)
					.done(function (success) {
						self._entries = [deep.Querier.createRootNode(success)];
						forceNextQueueItem(self, success, null);
					})
					.fail(function (error) {
						forceNextQueueItem(self, null, error);
					});
				};
				self.range = deep.Handler.range;
				addInQueue.apply(this,[func]);
				return self;
			}),

			rpc : deep.compose
			.condition(typeof store.rpc === "function")
			.createIfNecessary()
			.replace(function (method, body, uri, options) {
				var self = this;
				var func = function (s,e) {
					self._store.rpc(method, body, uri, options)
					.done(function (success) {
						self._entries = [deep.Querier.createRootNode(success)];
						forceNextQueueItem(self, success, null);
					})
					.fail(function (error) {
						forceNextQueueItem(self, null, error);
					});
				};
				self.range = deep.Handler.range;
				addInQueue.apply(this,[func]);
				return self;
			}),

			range : deep.compose
			.condition(typeof store.range === "function")
			.createIfNecessary()
			.replace(function (arg1, arg2, uri, options) {
				var self = this;
				var func = function (s,e) {
					self._store.range(arg1, arg2, uri, options)
					.done(function (success) {
						self._entries = deep(success.results).nodes();
						forceNextQueueItem(self, success, null);
					})
					.fail(function (error) {
						forceNextQueueItem(self, null, error);
					});
				};
				self.range = deep.Handler.range;
				addInQueue.apply(this,[func]);
				return self;
			}),

			bulk : deep.compose
			.condition(typeof store.bulk === "function")
			.createIfNecessary()
			.replace(function (arr, uri, options) {
				var self = this;
				var func = function (s,e) {
					self._store.bulk(arr, uri, options)
					.done(function (success) {
						self._entries = deep(success).nodes();
						forceNextQueueItem(self, success, null);
					})
					.fail(function (error) {
						forceNextQueueItem(self, null, error);
					});
				};
				self.range = deep.Handler.range;
				addInQueue.apply(this,[func]);
				return self;
			})
		}, handler);
		return handler;
	};

	deep.store.DeepStore = function () {};
	deep.store.DeepStore.prototype = {};

	deep.store.ArrayStore = function (arr, options) {
		var store = new deep.store.DeepStore();
		options = options || {};
		var stock = {
			collection:arr
		};
		store.get = function (id) {
			if(id === "")
				id = "?";
			if( id.match( /^((\.?\/)?\?)|^(\?)/gi ) )
				return deep(stock).query("collection/*"+id).store( this);
			return deep(stock).query("./collection/*?id="+id).store(this);
		};
		store.put = function (object, id) {
			id = id || object.id;
			if(options.schema)
				deep(object)
				.validate(options.schema)
				.fail(function (error) {
					object = error;
				})
				.root(stock)
				.replace("./collection/*?id="+id, object);
			else
				deep(stock)
				.replace("./collection/*?id="+id, object);
			return deep(object).store(this);
		};
		store.post = function (object, id) {
			id = id || object.id;
			if(!id)
				object.id = id = new Date().valueOf(); // mongo styled id
			if(options.schema)
				deep(object)
				.validate(options.schema)
				.done(function (report) {
					arr.push(object);
				})
				.fail(function (error) {
					object = error;
				});
			else
				arr.push(object);
			return deep(object).store(this);
		};
		store.del = function (id) {
			return deep(stock).remove("./collection/*?id="+id).store(this);
		};
		store.patch = function (object, id) {
			return deep(stock).query("./collection/*?id="+id).up(object).store(this);
		};
		store.range = function (start, end) {
			return deep(stock.collection).range(start,end).store(this);
		};
		return store;
	};

	deep.store.ObjectStore = function (obj, options)
	{
		var store = new deep.store.DeepStore();
		options = options || {};
		store.get = function (id)
		{
			if(id[0] == "." || id[0] == "/")
				return deep(obj).query(id).store(this);
			return deep(obj).query("./"+id).store(this);
		};
		store.put = function (object, query)
		{
			console.log("ObjectStore.put : ", object, query);
			deep(obj)
			.setByPath(query, object);
			return deep(object).store(this);
		};
		store.post = function (object, path)
		{
			if(options.schema)
				deep(object)
				.validate(options.schema)
				.fail(function (error) {
					object = error;
				})
				.root(obj)
				.setByPath(path, object);
			else
				deep(obj)
				.setByPath(path, object);
			return deep(object).store(this);
		};
		store.del = function (id)
		{
			var res = [];
			if(id[0] == "." || id[0] == "/")
				deep(obj).remove(id)
				.done(function (removed)
				{
					res = removed;
				});
			else
				deep(obj).remove("./"+id)
				.done(function (removed)
				{
					res = removed;
				});
			return deep(res).store(this);
		};
		store.patch = function (object, id)
		{
			if(id[0] == "." || id[0] == "/")
				return deep(obj).query(id).up(object).store(this);
			return deep(obj).query("./"+id).up(object).store(this);
		};
		return store;
	};


	/**
	 * retrieve request (if string in retrievable format) (e.g. "json::test.json")
	 * perform an http get
	 * if request is not a string : will just return request
	 * @for deep
	 * @static 
	 * @method get
	 * @param  {String} request a string to retrieve
	 * @param  {Object} options (optional)
	 * @return {DeepHandler} a handler that hold result 
	 */
	deep.get = function  (request, options)
	{
		if(typeof request !== "string")
			return request;
		var infos = deep.parseRequest(request);
		if(!infos.store)
			if(!infos.protocole)
				return request;
			else
				return new Error("no store found with : ", request);
		if(infos.queryThis)
			return infos.store.get(infos, options);
		if(infos.method )
		{
			if(infos.method !== "range" || !infos.store.range)
				return deep(new Error("store doesn't contain method : ",request));
			var splitted = infos.uri.split("?");
			var rangePart = splitted.shift();
			var query = splitted.shift() || "";
			if(query !== "" && query[0] !== "?")
				query = "?"+query;
			var rn = rangePart.split(",");
			var start = parseInt(rn[0], 10);
			var end = parseInt(rn[1], 10);
			return infos.store[infos.method](start, end, query, options);
		}
		else
			return infos.store.get(infos.uri, options);
	};
	/**
	 * retrieve an array of retrievable strings (e.g. "json::test.json")
	 * if request is not a string : will just return request
	 * @for deep
	 * @static 
	 * @method getAll
	 * @param  {String} requests a array of strings to retrieve
	 * @param  {Object} options (optional)
	 * @return {DeepHandler} a handler that hold result 
	 */
	deep.getAll = function  (requests, options)
	{
		var alls = [];
		requests.forEach(function (request) {
			alls.push(deep.get(request,options));
		});
		return deep.all(alls);
	};

	deep.parseRequest = function (request) {
		var protoIndex = request.indexOf("::");
		var protoc = null;
		var uri = request;
		var store = null;
		var method = null;
		if(protoIndex > -1)
		{
			protoc = request.substring(0,protoIndex);
			var subprotoc = protoc.split(".");
			if(subprotoc.length > 1)
			{
				protoc = subprotoc.shift();
				method = subprotoc.shift();
			}
			uri = request.substring(protoIndex+2);
		}
		//console.log("parseRequest : protoc : ", protoc, " - uri : ", uri);
		var queryThis = false;
		if(request[0] == '#' || protoc == "first" || protoc == "last" || protoc == "this")
		{
			store = deep.stores.queryThis;
			queryThis = true;
		}
		else if(!protoc)
		{
			//console.log("no protocole : try extension");
			for( var i in deep.stores )
			{
				var storez = deep.stores[i];
				if(!storez.extensions)
					continue;
				for(var j =0; j < storez.extensions.length; ++j)
				{
					var extension = storez.extensions[j];
					if(uri.match(extension))
					{
						store = storez;
						break;
					}
				}
				if(store)
					break;
			}
		}
		else
			store = deep.stores[protoc];
		var res = {
			request:request,
			queryThis:queryThis,
			store:store,
			protocole:protoc,
			method:method,
			uri:uri
		};
		//console.log("deep.parseRequest : results : ", res);
		return res;
	};

	//__________________________________________________________________ TREATMENTS

	deep.treat =  function(treatment, context) {
		return deep.applyTreatment.apply(treatment, [context || {}]);
	};
	deep.applyTreatment = function(context) 
	{
		if (!this.how || this.condition === false)
			return false;
		if (typeof this.condition === "function" && !this.condition.apply(this))
			return false;
		//console.log("deep.applyTtreatment : ", this, context);
		context = context || this;
		var self = this;
		var objs = [];

		if (typeof this.what === 'string')
		{
			var what = deep.interpret(this.what, context);
			objs.push(deep.get(what, {
				root: context._deep_entry || context
			}));
		}
		else if (typeof this.what === 'function')
			objs.push(this.what.apply(controller));
		else if (this.what)
			objs.push(this.what);

		if (typeof this.how === "string")
		{
			var how = deep.interpret(this.how, context);
			objs.push(deep.get(how, {
				root: context._deep_entry || context
			}));
		}
		if (typeof this.where === "string") {
			var where = deep.interpret(this.where, context);
			objs.push(deep.get(where, {
				root: context._deep_entry || context,
				acceptQueryThis: true
			}));
		}
		return deep.all(objs)
		.done(function(results) {
			var what = (self.what) ? results.shift() : context;
			if (what._isDQ_NODE_) what = what.value;
			var how = (typeof self.how === "string") ? results.shift() : self.how;
			var where = (typeof self.where === "string") ? results.shift() : self.where;
			var r = "";
			var nodes = self.nodes || null;
			try {
				r = how.apply({}, [what]);
				if (where) nodes = where(r, nodes);
			} catch (e) {
				console.log("Error while treating : ", e);
				if (typeof self.fail === 'function')
					return self.fail.apply(context, [e]) || e;
				return e;
			}
			if (typeof self.done === "function")
				return self.done.apply(context, [nodes, r, what]) || [nodes, r, what];

			return nodes || r;
		})
		.fail(function(error) {
			console.log("Error while treating : ", error);
			if (typeof self.fail === 'function')
				return self.fail.apply(context, [error]) || error;
			return error;
		});
	};

	//__________________________________________________________________________ CORE STORES
	deep.stores.queryThis = {
		get:function (request, options) {
			//console.log("deep.stores.queryThis : ", request)
			options = options || {};
			var root = options.root;
			var basePath = options.basePath;
			var infos = request;
			if(typeof infos === 'string')
				infos = deep.parseRequest(infos);
			if(infos.uri[0] == '#')
				infos.uri = infos.uri.substring(1);
			var res = null;
			if(root._isDQ_NODE_)
				res = Querier.query(root, infos.uri, { keepCache:false });
			else
			{
				basePath = basePath || '';
				if(basePath !== '' && infos.uri.substring(0,3) == "../")
					infos.uri = ((basePath[basePath.length-1] != "/")?(basePath+"/"):basePath)+infos.uri;
				res = Querier.query(root, infos.uri, { keepCache:false });
			}
			if(res)
				switch(infos.protocole)
				{
					case "first" :
						res = res[0] || null;
						break;
					case "last" :
						res = res[res.length-1] || null;
						break;
				}
			//if(infos.protocole == "first")
			//	console.log("QUERY THIS : "+request + " - base path : "+basePath)//, " - results : ", JSON.stringify(res, null, ' '));
			return res;
		}
	};

	deep.stores.instance = {
		get:function (id, options) {
			var cl = require(id);
			//console.log("DeepRequest.instance : ", cl);
			if(typeof cl === 'function' && cl.prototype)
				return deep(new cl());
			console.log("DeepRequest : could not instanciate : "+JSON.stringify(info));
			throw new Error("DeepRequest : could not instanciate : "+JSON.stringify(info));
		}
	};
	deep.stores.aspect = {
		get:function (id, options) {
			return deep(require(id)).then(function(res){
				return res.aspect;
			}, function(res){
				return res;
			});
		}
	};
	deep.stores.js = {
		get:function (id, options) {
			return deep(require(id));
		}
	};


	return deep;

	//______________________________________________________________________________________________________________________________________
});
