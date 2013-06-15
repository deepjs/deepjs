
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

TODO : 

	faire que chaque handle retourne une array s,e OU un truc à attendre (chains, branches, promises, deferreds)
	
	deep.chain.manageCallBack(whatToWait, whatIfCallBackReturnIsUndefined, title)

	deep.flags for console and debug

	deep.settings

	deep.mode

	deep.debug (other mode/flags)


BUG !!! : 

	- when using delay : it set a timeout which will catch any error and for now will reinjecting in chain : that's incoherent.
	 It's there because when you use time out : any thrown error under it are lost in space. 

	Solution : add a rethrow function from the chain that 

	

*/

if(typeof define !== 'function')
	var define = require('amdefine')(module);


define(["require","./utils", "./deep-rql", "./deep-schema",  "./promise", "./deep-query", "./deep-compose", "./deep-stores", "./deep-promise", "./deep-errors"],
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
	var utils = require("./utils");
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
	 * @return {deep.Chain} a deep handler that hold object(s)
	 */
	deep = function deep(obj, schema, options)
	{
		if(typeof obj === 'undefined')
			obj = null;
		if(obj && obj._deep_chain_ && obj.oldQueue)
			return obj;
		var alls = [];
		var root = obj;
		//console.log("start chain : ", obj )
		try
		{
			var handler = new deep.Chain(options);
			handler.running = true;
			//if(obj instanceof Array)
			//	alls.push(deep.all(obj));
			if(typeof obj === 'string')
				alls.push(deep.get(obj));
			else
				alls.push(obj);
			if(typeof schema === 'string')
				alls.push(deep.get(schema));
			else if(schema)
				alls.push(schema);
			deep.all(alls)
			.done(function (results) {
				//console.log("start chain : when result :")
				handler.initialised = true;
				obj = results.shift();
				if(schema)
					schema = results.shift();
				if(obj instanceof Array)
				{
					if(schema && schema.type !== "array")
						schema = { type:"array", items:schema };
					handler._nodes = deep.query(obj, "./*", { resultType:"full", schema:schema });
					//console.log("result of strt with array : ", handler._nodes)
					return forceNextQueueItem(handler, deep.chain.values(handler), null);
				}
				else if(obj && obj._isDQ_NODE_)
					handler._nodes = [obj];
				else if(obj && obj._deep_entry)
					handler._nodes = [obj._deep_entry];
				else
					handler._nodes = [Querier.createRootNode(obj, schema)];
				if(handler._nodes.length > 1)
					forceNextQueueItem(handler, deep.chain.values(handler), null);
				else
					forceNextQueueItem(handler, obj, null);
			})
			.fail(function (error) {
				//console.log("deep start chain error on load object : ", error, " - rethrow ? ", handler.rethrow);
				handler.initialised = true;
				forceNextQueueItem(handler, null, error);
			});
		}
		catch(e)
		{
			handler.initialised = true;
			//console.log("deep start chain : throw when waiting entries : rethrow : ",handler.rethrow);
			if(handler.rethrow)
				throw e;
			else
				forceNextQueueItem(handler, null, e);
		}
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
	 * the deep schema validator
	 * @static
	 * @property Validator
	 */
	deep.Validator = Validator;
	/**
	 * perform a deep-schema validation
	 * @static
	 * @method validate
	 * @param object the object to validate
	 * @param schema the schema 
	 * @return {deep.validate.Report} the validation report
	 */
	deep.validate = Validator.validate;
	/**
	 * perform a deep-schema partial validation (only on certain field)
	 * @static
	 * @method partialValidation
	 * @param object the object to validate
	 * @param fields the array of properties paths to validate
	 * @param schema the schema 
	 * @return {deep.validate.Report} the validation report
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
	 * perform a (synched) deep-rql filter on array
	 * @example
	 * 
	 * 		deep.rql(["a","b","c"], "=a"); // return  ["a"]
	 * 		
	 * @static
	 * @method rql
	 * @param {Array} array  the array to filter
	 * @param {String} rqlFilter the rql filter to apply
	 * @return {Array} the result aray
	 */
	deep.rql = require("./deep-rql").query;
	/**
	 * perform a (synched) deep-query query
	 * @example 
	 *
	 * 		deep.query({ hello:"world", test:1 }, "/*?=world"); // will return ["world"]
	 * 
	 * @method query
	 * @param {Object} object any object to query
	 * @param {String} query the query
	 * @static
	 * @return {Array} the result aray
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
	 * @param {String} string the string to interpret
	 * @param {Object} context the context injected for interpretation
	 * @return {String} the result
	 */
	deep.interpret = utils.interpret;
	/**
	 * a magic context that follow promise context and switch automaticaly
	 * @static
	 * @method interpret
	 * @param {String} string the string to interpret
	 * @param {Object} context the context injected for interpretation
	 * @return {String} the result
	 */
	deep.context = {};

	/**
	 * where to place YOUR globals (deep does'nt have any globals)
	 * @static
	 * @method globals
	 * @param {String} string the string to interpret
	 * @param {Object} context the context injected for interpretation
	 * @return {String} the result
	 */
	deep.globals = {};

	var errors = require( "deep/deep-errors" )(deep);


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
		if(this.running)
			return;
		this.running = true;
		var self = this;
		if(result instanceof Error)
		{
			//console.log("nextChainHandler : result is error : ",result);
			this.reports.failure = failure = result;
			this.reports.result = result = null;
		}
		if((typeof failure === 'undefined') && (typeof result === 'undefined'))
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
				if(!failure || next._isTHEN_ ||  next._isTRANSPARENT_ || next._isPUSH_HANDLER_TO_)
				{
					var r = null;
					if(typeof next === "object")
						r = next.func(result,failure);
					else
						r = next(result,failure);
					//console.log("return from chain handler : ",r);
					if(typeof r !== 'undefined')
					{
						this.running = false;
						nextQueueItem.apply(self, r)
					}
				}
				else // PASSIVE TRANSPARENCY : SKIP CURRENT handle
				{
					//console.log("chain still have error : but no more then familly handlers to manage it. check next then failly group")
					if(this._doingEnd)
					{
						this.callQueue = [];
						forceNextQueueItem(self, result, failure);
						return;
					}
					this.doingEnd = true;
					while(next && !(next._isTHEN_ ||  next._isTRANSPARENT_ || next._isPUSH_HANDLER_TO_))
					{
						this.callQueue.shift();
						next = this.callQueue[0];
					}
					forceNextQueueItem(self, result, failure);
				}
			}
			catch(e)
			{
				var msg = "Internal chain error : rethrow ? "+ self.rethrow;
				console.error(msg, e);
				if(self.rethrow)
					throw e;
				self.running = false;
				nextQueueItem.apply(self, [null, e]);
			}
			finally{
				if(previousContext !== this.context)
				{
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
			if(this._listened && !this.deferred.rejected && !this.deferred.resolved && !this.deferred.canceled)
			{
				if(failure)	
					this.reject(failure);
				else
					this.resolve(result);
			}
		}
	}
	function forceNextQueueItem(handler, s, e)
	{
		handler.running = false;
		nextQueueItem.apply(handler, [s, e]);
	}
	function addInChain(func)
	{
		if(!this.oldQueue && this._listened)
			throw new Error("you couldn't add anymore handler to this chain : someone listening it. "+JSON.stringify(deep.chain.values(this)));
		if(func._isPUSH_HANDLER_TO_ && !this.initialised)
			func();
		else
			this.callQueue.push(func);
		if(!this.running)
			nextQueueItem.apply(this);
	}

	function cloneHandler(handler, cloneValues)
	{
		var newRes = [];
		if(cloneValues)
			newRes = newRes.concat(handler._nodes);
		var newHandler = new deep.Chain({
			rethrow:handler.rethrow,
			_entries:newRes,
			result: handler.reports.result,
			failure: handler.reports.failure
		});
		newHandler.initialised = true;
		return newHandler;
	}

	//_________________________________________________________________________________________
	/**
	 * Deep Chain Handler  : manage asynch and synch in one chain
	 * @class Chain
	 * @namespace deep
	 * @constructor
	 * @param {Object} obj    [description]
	 * @param {Object} schema [description]
	 */
	deep.Chain = function(options)
	{
		options = options || {};
		this.rethrow = (typeof options.rethrow !== "undefined")?options.rethrow:deep.rethrow;
		this._deep_chain_ = true;
		this.positions = [];
		this.context = deep.context;
		this.querier = new Querier();
		this.callQueue = [];
		this._nodes = options._nodes || [];
		this.queries = [];
		this.deferred = deep.Deferred();
		this.rejected=false;
		this.reports = {
			result:options.result || null,
			failure:options.failure || null
		};
	};
	//deep.Chain = deep.Chain;
	deep.Chain.prototype = {
		querier:null,
		_listened:false,
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
					cloned.running = false;
					//forceNextQueueItem(cloned,self.reports.result, self.reports.failure);
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
		 * @return {deep.Chain} this
		*/
		reverse:function () {
			var self = this;
			var create =  function(s,e)
			{
				self._nodes.reverse();
				self.running = false;
				nextQueueItem.apply(self, [deep.chain.values(self), null]);
			};
			addInChain.apply(this, [create]);
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
		 * @return {deep.Chain} the chain
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
			addInChain.apply(this, [create]);
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
			if(this.deferred.rejected || this.deferred.resolved || this.deferred.canceled)
				throw  new Error("deep chain could not be canceled : it has already been rejected! ");
			var queue = this.callQueue;
			this.callQueue = [];
			this.oldQueue = null;
			this.reports.cancel = reason;
			this.deferred.cancel(reason);
		},
		/**
		 * reject chain for listeners. 
		 *
		 * end of chain
		 *
		 * @method  reject
		 * @param  {*} reason the reason of the chain rejection (any string or object - the last error of the chain)
		 * @return nothing
		 */
		reject:function (reason)  // not chainable
		{
			if(this.deferred.rejected || this.deferred.resolved || this.deferred.canceled)
				throw  new Error("deep chain REJECTION error : chain has already been ended! ");
		//	console.log("deep chain reject : reason : ", reason);
			this.reports.failure = reason;
			this.rejected = true;
			this.callQueue =  [];
			this.oldQueue = null;
			this.deferred.reject(reason);
		},
		/**
		 * resolve chain for listeners. 
		 *
		 * end of chain
		 *
		 * @method  resolve
		 * @param  {*} reason the last success of the chain or any string or object
		 * @return nothing
		 */
		resolve:function (reason)  // not chainable
		{
			//console.log("deep chain reslove : reason : ", reason);
			if(this.deferred.rejected || this.deferred.resolved || this.deferred.canceled)
				throw  new Error("deep chain resolution error : has already been ended! : reason : ", reason);
			this.reports.result = reason;
			this.resolved = true;
			this.callQueue = [];
			this.oldQueue = null;
			this.deferred.resolve(reason);
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
		*	deep().branches( function(branches)
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
		 * @return  {deep.Chain} this
		 */
		branches:function ( func )
		{
			var self = this;
			var create =  function(s,e)
			{
				self.oldQueue = self.callQueue;
				self.callQueue = [];
				var a  = func.apply(self, [self.brancher()]);
				if(a === self)
				{
					self.callQueue = self.callQueue.concat(self.oldQueue);
					delete self.oldQueue;
					return [s,e];
				}
				var handleResponse = function (success)
				{
					self.callQueue = self.callQueue.concat(self.oldQueue);
					delete self.oldQueue;
					forceNextQueueItem(self, success, null)
				};

				if(a && (a.then || a.promise || a._isBRANCHES_))
					deep.when(a)
					.done(handleResponse)
					.fail(function (error)
					{
						//console.error("error : deep.branches : ", error);
						self.callQueue = self.callQueue.concat(self.oldQueue);
						delete self.oldQueue;
						forceNextQueueItem(self, null, error)
					});
				else
					handleResponse(a);
			};
			addInChain.apply(this, [create]);
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
		 * @param  {deep.Promise} prom the promise to waiting for
		 * @chainable
		 * @return {deep.Chain}
		 */
		when:function(prom)
		{
			var self = this;
			var func = function(s,e){
				deep.when(prom)
				.done(function (datas) {
					if(typeof datas === 'undefined')
						datas = s;
					forceNextQueueItem(self, datas, null)
				})
				.fail(function (e) {
					//console.error("error : deep.chain.when : ", e);
					forceNextQueueItem(self, null, e)
				});
			};
			addInChain.apply(this,[func]);
			return this;
		},
		/**
		 * handle previous chain's handle success
		 *
		 * the callback receive the success that is the success object produced by previous chain's handle
		 * @method  done
		 * @chainable
		 * @param  callback the calback function to handle success
		 * @return {deep.Chain}
		 */
		done : function(callBack)
		{
			var self = this;
			var	func = function(s,e)
			{
				//console.log("deep.chain.done : ",s,e)
				if(e || !callBack || s instanceof Error)
					return [s,e];
				self.oldQueue = self.callQueue;
				self.callQueue = [];
				var a  = callBack.apply(self, [s]);
				if(a === self)
				{
					self.callQueue = self.callQueue.concat(self.oldQueue);
					delete self.oldQueue;
					return [s,e];
				}
				var handleResponse = function (argument) {
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
				};
				if(a && (a.then || a.promise || a._isBRANCHES_))
					deep.when(a)
					.done(handleResponse)
					.fail(function (error) {
						self.callQueue = self.callQueue.concat(self.oldQueue);
						delete self.oldQueue;
						forceNextQueueItem(self, null, error);
					});
				else
					handleResponse(a);
			};
			func._isTHEN_ = true;
			addInChain.apply(this, [func]);
			return self;
		},
		/**
		 * handle previous chain handle error
		 *
		 * the callback receive the error that is the one produced by previous chain's handle
		 * 
		 * @method  fail
		 * @chainable
		 * @param  callback the calback function to handle error
		 * @return {deep.Chain}
		 */
		fail:function (callBack)
		{
			var self = this;
			var func = function(s,e)
			{
				if((e === null || typeof e === 'undefined') || !callBack)
					return [s,e];
				
				self.oldQueue = self.callQueue;
				self.callQueue = [];
				var a = callBack.apply(self, [e]);
				if(a === self)
				{
					self.callQueue = self.callQueue.concat(self.oldQueue);
					delete self.oldQueue;
					return [s,e];
				}
				var handleResponse = function (argument) {
					self.callQueue = self.callQueue.concat(self.oldQueue);
					delete self.oldQueue;
					if(typeof argument === 'undefined')
						forceNextQueueItem(self, null, e);
					else if(argument instanceof Error)
						forceNextQueueItem(self, null, argument);
					else
						forceNextQueueItem(self, argument, null);
				};
				if(a && (a.then || a.promise || a._isBRANCHES_ ))
					deep.when(a)
					.done(handlerResponse)
					.fail(function (error) {
						self.callQueue = self.callQueue.concat(self.oldQueue);
						delete self.oldQueue;
						forceNextQueueItem(self, null, error);
					});
				else
					handleResponse(a);
			};
			func._isTHEN_ = true;
			addInChain.apply(this,[func]);
			return self;
		},
		/**
		 * handle previous chain handle success AND error
		 *
		 * the callback receive both the success and the error that are (only one exists normally) produced by previous chain's handle
		 * 
		 * @method  always
		 * @chainable
		 * @param  callback the calback function to handle success and error
		 * @return {deep.Chain}
		 */
		always:function (callBack)
		{
			var self = this;
			var func = function(s,e)
			{
				
				self.oldQueue = self.callQueue;
				self.callQueue = [];
				var a = callBack.apply(self, [s,e]);
				if(a === self)
				{
					self.callQueue = self.callQueue.concat(self.oldQueue);
					delete self.oldQueue;
					return [s,e];
				}
				var handleResponse = function (argument) {
					self.callQueue = self.callQueue.concat(self.oldQueue);
					delete self.oldQueue;
					if(typeof argument === 'undefined')
						forceNextQueueItem(self, s, e);
					else
						forceNextQueueItem(self, argument, null);
				};
				if(a && (a.then || a.promise || a._isBRANCHES_))
					deep.when(a)
					.done(handlerResponse)
					.fail(function (error) {
						self.callQueue = self.callQueue.concat(self.oldQueue);
						delete self.oldQueue;
						forceNextQueueItem(self, null, error);
					});
				else
					handleResponse(a);
			};
			func._isTHEN_ = true;
			addInChain.apply(this,[func]);
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
		 * @return {deep.Chain} this
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
		 * @return {deep.Chain} this
		 */
		range : function (start, end)
		{
			var self = this;
			var func = function(s,e){
				var rangeObject = null;
				
				rangeObject = utils.createRangeObject(start, end, self._nodes.length);
				self._nodes = self._nodes.slice(rangeObject.start, rangeObject.end+1);
				rangeObject.results = deep.chain.values(self);
				forceNextQueueItem(self, rangeObject, null);
			};
			addInChain.apply(this,[func]);
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
		 * @return {deep.Chain} this
		 */
		position : function  (name, options)
		{
			var self = this;
			var func = function(s,e){
				deep.chain.position(self, name, options);
				forceNextQueueItem(self, s, e)
			};
			addInChain.apply(this,[func]);
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
		 * @param  {String} name the name of the last position asked
		 * @param   {Object}	options   (optional - no options for the moment)
		 * @return {deep.Chain}
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
				self._nodes = position.entries;
				self._store = position.store;
				self.running = false;
				nextQueueItem.apply(self, [deep.chain.values(self),null]);
			};
			addInChain.apply(this,[func]);
			return this;
		},
		//_________________________________________________________________________________________

		/**
		 * keep only the first chain entries. remove all others.
		 * inject selected entry value as chain success.
		 * 
		 * @chainable
		 * @method  first
		 * @return {deep.Chain}
		 */
		first : function  ()
		{
			var self = this;
			var func = function(){
				self._nodes = [self._nodes[0]];
				return [self._nodes, null];
			};
			addInChain.apply(this,[func]);
			return this;
		},
		/**
		 * keep only the last chain entries. remove all others
		 *
		 * inject selected entry value as chain success
		 * 
		 * @chainable
		 * @method  last
		 * @return {deep.Chain}
		 */
		last : function  ()
		{
			var self = this;
			var func = function(){
				self._nodes = [self._nodes[self._nodes.length-1]];
				return [self._nodes, null];
			};
			addInChain.apply(this,[func]);
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
		 * @return {deep.Chain}
		 */
		parents : function (errorIfEmpty)
		{
			var self = this;
			var func = function(){
				var res = [];
				self._nodes.forEach(function (r) {
					res.push(r.ancestor);
				});
				res = deep.utils.arrayUnique(res, "path");
				self._nodes = res;
				if(res.length === 0 && errorIfEmpty)
					throw new Error("deep.parents could not gives empty results");
				return [deep.chain.values(self), null];
			};
			addInChain.apply(this,[func]);
			return self;
		},
		/**
		 * take object, shcema, options and create fresh chain entries from it. Same mecanism as new chain.
		 * @method  root
		 * @chainable
		 * @param  object the object to produce entries  (could be a retrievable string - e.g. "json::myobject.json" - see retrievable doc)
		 * @param  schema the schema of the object  (could be a retrievable string - e.g. "json::myobject.json" - see retrievable doc)
		 * @return {deep.Chain} this
		 */
		root:function (object, schema, options)
		{
			var self = this;
			var func = function()
			{
				deep(object, schema)
				.nodes(function (nodes) {
					self._nodes = nodes;
				})
				.done(function (success) {
					forceNextQueueItem(self, success, null);
				});
			};
			addInChain.apply(this,[func]);
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
		 * @return {deep.Chain} this (chain handler)
		 */
		query : function(q, errorIfEmpty)
		{
			var self = this;
			//src.queries.push(q);
			if(!(q instanceof Array))
				q = [q];
			var func = function()
			{
				var res = [];
				//
				if(!self._queried)
				{
					q.forEach(function (qu) {
						if(self._nodes.length > 1)
						{
							var values = self._nodes;
							if(qu.match(/^(\.\/\*)/gi))
								qu = "./*/value"+qu.substring(3);
							else if(qu.match(/^(\/\*)/gi))
								qu = "./*/value"+qu.substring(2);
							else
							{
								if(qu.match(/^(\.\/)/gi) || qu.match(/^(\/)/gi))
									values = deep.chain.values(self);
							} 
							res = res.concat(self.querier.query(values, qu, { resultType:"full" }));
						}
						else
							res = res.concat(self.querier.query(self._nodes[0], qu, { resultType:"full" }));
					});
				}
				else
					self._nodes.forEach(function (r) {
						q.forEach(function (qu) {
							res = res.concat(self.querier.query(r, qu , {resultType:"full"}));
						});
					});
				res = deep.utils.arrayUnique(res, "path");
				self._nodes = res;
				self._queried = true;

				if(res.length === 0 && errorIfEmpty)
					throw new Error("deep.query could not gives empty results");

				return [deep.chain.values(self), null];
			};
			addInChain.apply(self, [func]);
			return self;
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
		 * @return {deep.Chain} this
		 */
		select : function(q)
		{
			var src = this;
			if(!(q instanceof Array))
				q = [q];
			var res = [];
			src._nodes.forEach(function (r) {
				q.forEach(function (qu) {
					res = res.concat(src.querier.query(r, qu));
				});
			});
			return res;
		},
		//_________________________________________________________________    MODELISATION
		/**
		 * set entries properties by path.
		 *
		 * synch
		 * inject setted values as chain success
		 * 
		 * @method  setByPath
		 * @chainable
		 * @param {string} path  a slash delimitted path (e.g. "/my/property")
		 * @param {object|primitive} obj the value to assign (could be a retrievable strings (see ressource pointer))
		 */
		setByPath : function(path, obj)
		{
			var self = this;
			var func = function(){
				deep.when(deep.get(obj)).then(function (obj)
				{
					var res = [];
					self._nodes.forEach(function(result){
						res.push(utils.setValueByPath(result.value, path, obj, '/'));
					});
					forceNextQueueItem(self, res, null)
				},
				function (error) {
					forceNextQueueItem(self, null, error)
				});
			};
			addInChain.apply(this,[func]);
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
		 * @return {deep.Chain} this
		 */
		up : function()
		{
			var args = Array.prototype.slice.call(arguments);
			var self = this;
			var func = function(){
				deep.when(deep.getAll(args)).then(function (objects)
				{
					self._nodes.forEach(function(result){
						objects.forEach(function (object) {
							//console.log("deep.up : entry : ", result, " - to apply : ", object)
							utils.up(object, result.value, result.schema, result.ancestor?result.ancestor.value:null, result.key);
						});
					});
					forceNextQueueItem(self, deep.chain.values(self), null)
				},
				function (error) {
					console.error("error : deep.up : ",error);
					forceNextQueueItem(self, null, error)
				});
			};
			addInChain.apply(this,[func]);
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
		 * @return {deep.Chain} this
		 */
		bottom : function()
		{
			var args = Array.prototype.slice.call(arguments);
			args.reverse();
			var self = this;
			var func = function(){
				deep.when(deep.getAll(args)).then(function (objects)
				{
					self._nodes.forEach(function(result){
						objects.forEach(function (object) {
							utils.bottom(object, result.value, result.schema, result.ancestor?result.ancestor.value:null, result.key);
						});
					});
					forceNextQueueItem(self, deep.chain.values(self), null)
				},
				function (error) {
					console.error("error : deep.bottom : ",error);
					forceNextQueueItem(self, null, error)
				});
			};
			addInChain.apply(this,[func]);
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
		 * @return {deep.Chain} this
		 */
		replace : function (what, by, options)
		{
			var self = this;
			var func = function(){
				deep.when(deep.get(by, options)).then(function (by)
				{
					var replaced = [];
					self._nodes.forEach(function (r) {
						//console.log("chain replace : ",what, " - in :  " , r.value)
						self.querier.query(r.value, what, {resultType:"full"}).forEach(function(r){
							//console.log("res query : ", r)
							if(!r.ancestor)
								return;
							r.ancestor.value[r.key] = r.value = by;
							replaced.push(r);
						});
					});
					forceNextQueueItem(self, replaced, null)
				}, function (error) {
					//console.error("error : deep.replace : ",error);
					forceNextQueueItem(self, null, error)
				});
			};
			addInChain.apply(this,[func]);
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
		 * @return {deep.Chain} this
		 */
		remove : function (what)
		{
			var self = this;
			var func = function(){
				var removed = [];
				self._nodes.forEach(function (r) {
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
				forceNextQueueItem(self, removed, null)
			};
			addInChain.apply(this,[func]);
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
		 * @return {deep.Promise} a promise
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
			return deferred.promise();
		},
		/**
		 * will perform the backgrounds application FIRSTLY and FULLY (full recursive) on current entries before appying extendsChild.
		 *
		 *	not intend to be call directly by programmer. use at your own risk.  use .flatten instead.
		 * 
		 * @method  extendsBackgrounds
		 * @private
		 * @param  {DeepEntry} entry from where seeking after backgrounds properties
		 * @return {deep.Promise} a promise
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
				return deferred.promise();
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
	@example
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
		 * @return {deep.Chain} this
		 */
		flatten : function()
		{
			var self = this;
			var count = 0;
			var doChilds = function(result)
			{
				//console.log("do childs")
				deep.when(self.extendsChilds(result)).then(function () {
					count--;
					//console.log("do childs ends : count : ", count);
					if(count === 0)
						forceNextQueueItem(self, deep.chain.values(self), null);
				}, function (error) {
					//console.error("error : deep.flatten : ",error);
					throw new Error("error : deep.flatten : "+error);
				});
			};
			var func = function(){
				var alls = [];
				//console.log("execute flatten")
				self._nodes.forEach(function (result)
				{
					count++;
					if(typeof result.value.backgrounds !== 'undefined' && result.value.backgrounds !== null)
					{
						deep.when(self.extendsBackgrounds(result)).then(function(stack) {
							//console.log("backgrounds extendeds")

							var f = {};
							stack.forEach(function(s){ f = utils.bottom(s, result.value, result.schema); delete s.backgrounds; });
							delete result.value.backgrounds;
							doChilds(result);
						},function (error) {
							//console.error("error : deep.flatten : ", error);
							throw new Error("error : deep.flatten : "+error);
						});
						delete result.value.backgrounds;
					}
					else
						doChilds(result);
				});
				if(self._nodes.length === 0)
					return [deep.chain.values(self), null];
			};
			addInChain.apply(this,[func]);
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
		 * @return {deep.Chain}  the current chain handler (this)
		 */
		transform : function (transformer)
		{
			var self = this;
			var func = function(s,e){
				var applyTransformer = function  (transformer) {
					var alls = [];
					self._nodes.forEach(function(result){
						alls.push(transformer(result.value));
					});
					deep.all(alls).done(function (loadeds)
					{
						var count = 0;
						self._nodes.forEach(function(result){
							result.value = loadeds[count];
							if(result.ancestor)
								result.ancestor[result.key] = result.value;
							count++;
						});
						forceNextQueueItem(self, loadeds, null);
					},
					function (error)
					{
						console.error("error : deep.transform : ", error);
						forceNextQueueItem(self, null, error);
					});
				}
				if(typeof transformer === 'string')
					deep.when(deep.get(transformer))
					.done(applyTransformer)
					.fail(function(error){
						forceNextQueueItem(self, null, error);
					});
				else
					applyTransformer(transformer);
			};
			addInChain.apply(this,[func]);
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
		 * @return {deep.Chain}  the current chain handler (this)
		 */
		run : function (funcRef, args)
		{
			var self = this;
			args = args || [];
			var create = function(s,e){
				var alls = [];
				self._nodes.forEach(function(result){
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
					forceNextQueueItem(self, loadeds, null);
				},
				function (error)
				{
					console.error("error : deep.run : ", error);
					forceNextQueueItem(self, null, error);
				});
			};
			addInChain.apply(this,[create]);
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
		 * @return {deep.Chain}  the current chain handler (this)
		 */
		exec : function (func, args)
		{
			var self = this;
			args = args || [];
			var create = function()
			{
				deep.when(func.apply({}, args)).done(function (loadeds)
				{
					forceNextQueueItem(self, loadeds, null);
				}).fail(function (error)
				{
					console.error("error : deep.exec : ", error);
					forceNextQueueItem(self, null, error);
				});
			};
			addInChain.apply(this,[create]);
			return this;
		},
		/**
		 * apply a 'treatments' on all chain entries at once (the array of entries values will be the context of the treatment). (renderables are treatments - see doc and example).
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
		 * @method  treatAll
		 * @deprecated see .val, .values, .each
		 * @param  {object} treatment
		 * @chainable
		 * @return {deep.Chain} this
		 */
		treatAll: function(treatment) {
			var self = this;
			var func = function(s, e)
			{
				deep.when(deep.get(treatment))
				.done(function(treatment){
					//console.log("treat getted : ", treatment)
					var prom = applyTreatment.apply(treatment, [deep.chain.values(self)]);
					deep.when(prom)
					.done(function(results) {
						//console.log("treatment results : ", results)
						forceNextQueueItem(self, results, null);
					})
					.fail(function(error) {
						forceNextQueueItem(self, null, error);
					});
				});
				
			};
			deep.chain.addInChain.apply(this, [func]);
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
		 * @method  treatEach
		 * @deprecated see .val, .values, .each
		 * @param  {object} treatment
		 * @chainable
		 * @return {deep.Chain} this
		 */
		treatEach: function(treatment) {
			var self = this;
			var func = function(s, e)
			{
				deep.when(deep.get(treatment))
				.done(function(treatment){
					//console.log("treat getted : ", treatment)
					var alls = [];
					self._nodes.forEach(function(entry) {
						alls.push(applyTreatment.apply(treatment, [entry.value]));
					});
					
					deep.all(alls)
					.done(function(results) {
						//console.log("treatment results : ", results)
						forceNextQueueItem(self, results, null);
					})
					.fail(function(error) {
						forceNextQueueItem(self, null, error);
					});
				});
				
			};
			deep.chain.addInChain.apply(this, [func]);
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
		 * @return {deep.Chain}     this
		 */
		valuesEqual : function(obj)
		{
			var self = this;
			var func = function(){
				var res = deep.chain.values(self);
				var o = {equal:utils.deepEqual(res, obj), needed:obj, needLength:obj.length, valuesLength:res.length, value:res};
				if(o.equal)
					console.info("deep.valuesEqual : "+ JSON.stringify(o, null, ' '));
				else
					console.error("deep.valuesEqual : "+ JSON.stringify(o, null, ' '));
				forceNextQueueItem(self, o, !o.equal);
			};
			addInChain.apply(this,[func]);
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
		 * @return {deep.Chain}        this
		 */
		equal : function(obj)
		{
			// console.log("deep.equal chaining");
			var self = this;
			var func = function(){
				//console.log("will do deep.equal : self : ", self._nodes)
				var res = [];
				var errors = [];
				self._nodes.forEach(function(r){
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
					equal:(self._nodes.length > 0) && (errors.length===0),
					reports:res
				};
				if(report.equal)
					forceNextQueueItem(self, report, null);
				else
					forceNextQueueItem(self, null, report);
			};
			addInChain.apply(this,[func]);
			return self;
		},

		/**
		 *  validate each chain entry against provided schema (if any) or against their own schemas (i.e. the entry schema) (if any).
		 *  Provided schema could be a deep json pointer (e.g. json::/my/path/to/schema.json or user::schema.post)
		 *
		 * 
		 *  
		 *	Chain Success injection : the valid report
		 *	Chain Error injection : an error, status 412, containing the unvalid report (or any errors from schema )
		 *
		 * @example
		 *
		 * 	deep(1,{ type:"numbder"}).validate().log();
		 *
		 * @example
		 *
		 * 	deep(1).validate({ type:"numbder"}).log();
		 *
		 * @example
		 *
		 * 	deep({ 
		 * 		//...
		 * 	}).validate("user::schema").log();
		 * 
		 * @method  validate
		 * @parame {Object,String} schema (optional) a schema object or a schema reference (deep json pointer)
		 * @chainable
		 * @return {deep.Chain}     this
		 */
		validate:function(schema)
		{
			var self = this;
			var func = function()
			{
				var runSchema = function(schema)
				{
					var report = {
						valid:true,
						reports:[]
					};
					self._nodes.forEach(function (e) {
						var rep = Validator.validate(e.value, schema || e.schema || {});
						report.reports.push(rep);
						if(!rep.valid)
							report.valid = false;
					});
					//console.log("validate is valid : ", report.valid);
					if(report.valid)
						forceNextQueueItem(self, report, null);
					else
						forceNextQueueItem(self, null, report);
				}
				if(typeof schema === 'string')
					deep.when(deep.get(schema))
					.done(runSchema)
					.fail(function(error){
						forceNextQueueItem(self, null, error);
					});
				else
					runSchema(schema)
			};
			func._name = "deep.Chain.validate";
			addInChain.apply(this,[func]);
			return this;
		},

		// __________________________________________________ LOG
		/**
		 * 
		 * log any provided arguments.
		 * If no arguments provided : will log current success or error state.
		 *
		 * transparent true
		 * 
		 * @method  log
		 * @return {deep.Chain} this
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
					if(e)
						args.push("deep.log : ERROR State : ",e);
					else
						args.push("deep.log : SUCCESS State : ",s);
				}
				args.forEach(function (a) {
					console.log(a);
				});
				forceNextQueueItem(self, s,e);
			};
			func._isTRANSPARENT_ = true;
			addInChain.apply(this,[func]);
			return this;
		},
		/**
		 * 
		 * log current chain entries  with optional title
		 *
		 * full option means print full entry in place of just entry.value
		 * pretty option means print pretty json (indented)
		 * 
		 * transparent true
		 *
		 * @method  logValues
		 * @chainable
		 * @param title (optional) the title you want
		 * @param options (optional) could contain : 'full':true|false, 'pretty':true|false 
		 * @return {deep.Chain} this
		 */
		logValues:function (title, options)
		{
			var self = this;
			options = options || {};
			var func = function(success, error)
			{
				console.log(title||"deep.logValues : ", " ("+self._nodes.length+" values)");
				self._nodes.forEach(function (e) {
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
			addInChain.apply(this,[func]);
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
		 * @param callBack could be a retrievable (a String pointing something from store), or a Function, or a treatment (an Object - see treatments in doc)
		 * @chainable
		 * @return {deep.Chain|entry.value} this or val
		 */
		val:function  (callBack)
		{
			var self = this;
			var func = function(s,e)
			{
				var applyCallBack = function (callBack) {
					var  a = self._nodes[0]?self._nodes[0].value:null;
					var r = null;
					if(typeof callBack === 'function')
						r = callBack(a);
					else
						r = applyTreatment.apply(callBack, [a]);
					if(typeof r === 'undefined')
						r = a;
					else if(r && (r.promise || typeof r.then === 'function' || r._isBRANCHES_))
						deep.when(r).then(function (argument) {
							if(typeof argument === 'undefined')
								argument = a;
							forceNextQueueItem(self, argument, null);
						}, function (error) {
							forceNextQueueItem(self, null, error);
						});
					else
						forceNextQueueItem(self, r, null);
				}
				if(typeof callBack === 'string')
					deep.when(deep.get(callBack))
					.done(applyCallBack)
					.fail(function (error) {
						forceNextQueueItem(self, null, error);
					});
				else
					applyCallBack(callBack);
			};
			if(callBack)
			{
				addInChain.apply(this,[func]);
				return this;
			}
			else
				return deep.chain.values(this).shift();
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
		 * @param callBack could be a retrievable (a String pointing something from store), or a Function, or a treatment (an Object - see treatments in doc)
		 * @return {deep.Chain|Array} this or values
		 */
		values:function  (callBack)
		{
			var self = this;
			var func = function(s,e)
			{
				var applyCallBack = function (callBack) {
					var  a = deep.chain.values(self);
					var r = null;
					if(typeof callBack === 'function')
						r = callBack(a);
					else
						r = applyTreatment.apply(callBack, [a]);
					if(typeof r === 'undefined')
						r = a;
					else if(r && (r.promise || typeof r.then === 'function' || r._isBRANCHES_))
						deep.when(callBack(a)).then(function (res) {
							if(typeof res === "undefined")
								res = a;
							forceNextQueueItem(self, res, null)
						}, function (error) {
							console.error("error : deep.values : ",error);
							forceNextQueueItem(self, null, error)
						});
					else
						forceNextQueueItem(self, r, null);
				}
				if(typeof callBack === 'string')
					deep.when(deep.get(callBack))
					.done(applyCallBack)
					.fail(function (error) {
						forceNextQueueItem(self, null, error);
					});
				else
					applyCallBack(callBack);
			};
			if(callBack)
			{
				addInChain.apply(this,[func]);
				return this;
			}
			else
				return deep.chain.values(this);
		},
		/**
		 * will pass each entries to callback as argument . same behaviours than classical Array.each.
		 * callback could return promise. the chain will wait any promise before continuing.
		 *
		 * Chain Success injection : the results of callback calls (resolved if promises)
		 * Chain Error injection : the errors of callback calls (rejected if promises)
		 * 
		 * @method  each
		 * @chainable
		 * @param callBack could be a retrievable (a String pointing something from store), or a Function, or a treatment (an Object - see treatments in doc)
		 * @return {deep.Chain} this
		 */
		each:function  (callBack)
		{
			var self = this;
			var func = function()
			{
				var applyCallBack = function (callBack) {
					var alls = [];
					if(typeof callBack === 'object')
						self._nodes.forEach(function(entry) {
							alls.push(applyTreatment.apply(callBack, [entry.value]));
						});
					else
						self._nodes.forEach(function(e){
							alls.push(callBack(e.value));
						});
					deep.all(alls)
					.done(function (results) {
						forceNextQueueItem(self, results, null);
					})
					.fail(function (error) {
						forceNextQueueItem(self, null, error);
					});
				};
				if(typeof callBack === 'string')
					deep.when(deep.get(callBack))
					.done(applyCallBack)
					.fail(function (error) {
						forceNextQueueItem(self, null, error);
					});
				else
					applyCallBack(callBack);
			};
			addInChain.apply(this,[func]);
			return this;
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
		 * @return {deep.Chain|Array} this or entries
		 */
		nodes:function  (callBack)
		{
			var self = this;
			var func = function(s,e)
			{
				var  a = self._nodes.concat([]);
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
				addInChain.apply(this,[func]);
				return this;
			}
			else
				return deep.chain.nodes(this);
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
		 * @return {deep.Chain} this
		 */
		delay:function (ms)
		{
			var self = this;
			var func = function(s,e){
				//console.log("deep.delay : ", ms)
				setTimeout(function () {
					console.log("deep.delay.end : ", ms);
					try{
						forceNextQueueItem(self, s, e);
					}
					catch(e)
					{
						//deep.utils.rethrow(e);
						forceNextQueueItem(self, s, e);
					}
					
				}, ms);
			}
			func._isTRANSPARENT_ = true;
			addInChain.apply(this,[func]);
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
		 * @return {deep.Chain} this
		 */
		deepLoad:function(context)
		{
			var self = this;
			var func = function(s,e){
				var  paths = [];
				var  promises = [];
				//console.log("deepLoad : ", self)
				self._nodes.forEach(function (e) {
					var strings = self.querier.query(e, ".//*?or(_schema.type=string,_schema.type=function)", {resultType:"full"});
					//console.log("deep load query result : ", strings)
					strings.forEach(function (toLoad) {

						if(typeof toLoad.value === 'string')
						{
							//console.log("deep.deepLoad : toLoad string : ", JSON.stringify(toLoad.value));
							var val = toLoad.value;
							if(context)
								val = deep.interpret(toLoad.value, context);
							promises.push(deep.get(val, {root:(toLoad.root)?toLoad.root.value:null, basePath:toLoad.path }));
						}
						else if(typeof toLoad.value === 'function')
						{
							//console.log("deep.deepLoad : toLoad function : ", JSON.stringify(toLoad.value));
							promises.push(toLoad.value());
						}	
						else
						{
							//console.log("deep.deepLoad : toLoad object : ", JSON.stringify(toLoad.value));
							promises.push(toLoad.value);
						}
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
					forceNextQueueItem(self, results, null );
				})
				.fail(function (error) {
					forceNextQueueItem(self, null, error);
				});
			};
			addInChain.apply(this,[func]);
			return this;
		},
		/**
		 *
		 * if request is provided : 
		 * 		try to retrieve 'request' and simply inject result in chain. request could be a ressource pointer OR a function to call to get something (maybe a promise tht will be manage before continuing chain)
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
		 * @param  {string} request (optional) 
		 * @param  {object} context (optional) the context to interpret strings
		 * @chainable
		 * @return {deep.Chain} this
		 */
		load:function (request, context)
		{
			var self = this;
			var func =  function(){
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
					self._nodes.forEach(function (e) {
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
						//console.log("deep.load results from request : ", self._nodes)
						forceNextQueueItem(self, results.shift(), null);
						return;
					}
					else
						results.forEach(function  (r) 
						{
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
					forceNextQueueItem(self, results, null);
				},
				function (error) {
					forceNextQueueItem(self, null, error);
				});
			};
			addInChain.apply(this,[func]);
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
		 * @return {deep.Chain} this
		 */
		/*deepInterpret:function(context)
		{
			var self = this;
			var func = function(){
				context = (typeof context === 'string')?deep.get(context):context;
				deep(context)
				.done(function (context)
				{
					var res = [];
					self._nodes.forEach(function (e) {
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
			addInChain.apply(this,[func]);
			return this;
		},*/
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
		 * @return {deep.Chain} this
		 */
		interpret:function(context)
		{
			var self = this;
			var func = function(){
				//console.log("deep.chain.interpret : context : ",context);
				var applyContext = function (context) {
					//console.log("interpret: received context : ", context);
					var res = [];
					self._nodes.forEach(function (interpretable)
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
							//console.log("deep.chain.interpret : res : ", r);
						}
						else
							res.push(interpretable.value);
					});
					self.running = false;
					forceNextQueueItem(self, res, null);
				}
				if(typeof context === 'string')
					deep.when(deep.get(context)).then(applyContext, function (error) {
						//console.error("error : deep.interpret : ", error);
						forceNextQueueItem(self, null, error);
					});
				else 
					applyContext(context);
			};
			addInChain.apply(this,[func]);
			return this;
		},

		//________________________________________________________ PUSH TO

		pushHandlerTo : function(array)
		{
			var self = this;
			var f = function(s,e)
			{
				// console.log("pushHandlerTo : init? ", self.initialised)
				array.push(self);
				if(self.initialised)
					forceNextQueueItem(self, s, e);
			};
			f._isPUSH_HANDLER_TO_ = true;
			addInChain.apply(this,[f]);
			return this;
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
		 * @return {deep.Chain} this
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
				self._nodes.forEach(function(entry) {
					if(map[entry.value[localKey]])
						entry.value[whereToStore || localKey] = map[entry.value[localKey]];
				});
				forceNextQueueItem(self, deep.chain.values(self), null);
			};
			var func = function(s, e) {
				if(self._nodes.length === 0)
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
					if(parsed.uri === '!')
						parsed.uri = "";
					if(parsed.uri.match(/(\/\?)|^(\?)/gi))
						parsed.uri += "&"+constrain;
					else
						parsed.uri += "?"+constrain;
					//console.log("mapOn : parsedUri with constrains : ",parsed.uri);
					if(parsed.store !== null)
					{
						deep.when(parsed.store.get(parsed.uri))
						.done(function (results) {
							results = [].concat(results);
							doMap(results, localKey, foreignKey, whereToStore);
						})
						.fail(function (error) {
							forceNextQueueItem(self, null, error);
						})
					}
					else
						forceNextQueueItem(self, null, new Error("deep.mapOn need array as 'what' : provided : "+ JSON.stringify(what)));
				}
				else
					doMap(what, localKey, foreignKey, whereToStore);
			};
			deep.chain.addInChain.apply(this, [func]);
			return this;
		},

		/**
		 * retrieve relations described in schema links.
		 *
		 * Inject as success in chain an object that hold each relation, their result and the associated (parsed) request object
		 *
		 * 
		 *
		 * 
		 * @method getRelations
		 * @chainable
		 * @example
		 * 	var schema3 = {
			    properties:{
			        id:{ type:"string", required:false, indexed:true },
			        label:{ type:"string" },
			        plantId:{ type:"string" },
			        userId:{ type:"string" }
			    },
			    links:[
			        {
			            href:"plant::{ plantId }",
			            rel:"plant"
			        },
			        {
			            href:"user::{ userId }",
			            rel:"user"
			        }
			    ]
			}
			//____________________________
			deep({ 
			    plantId:"e1",
			    userId:"e1",
			    label:"hello"
			}, schema3)
			.getRelations("plant", "user")
			.log();

		 * @param a list of string arguments that gives which relation to retrieve 
		 * @return {deep.Chain} this
		 */
		getRelations:function () {
			var self = this;
			var relations = Array.prototype.slice.apply(arguments);
			var func = function (s,e) 
			{
				var alls  = [];
				var temp = [];
				self._nodes.forEach(function(entry){
					if(!entry.schema || !entry.schema.links)
						return;
					var r = {
						value:entry.value,
						schema:entry.schema
					}
					temp.push(r);
					deep.query(entry.schema.links, "./*?rel=in=("+relations.join(",")+")")
					.forEach(function(relation){
						var path = deep.interpret(relation.href, entry.value);
						var parsed = deep.parseRequest(path);
						var wrap = { rel:relation, href:parsed } ;
						r[relation] = wrap;
						alls.push(deep.get(parsed, { defaultProtocole:"json", wrap:wrap}));
					});
				});
				if(alls.length == 0)
					return [s,e];
				deep.all(alls)
				.done(function(s){
					//console.log("get relations : ", s)
					forceNextQueueItem(self, temp, null);
				})
				.fail(function(error){
					forceNextQueueItem(self, null, error);
				});
			}
			deep.chain.addInChain.apply(this, [func]);
			return this;
		},



		/**
		 * map relations in current entries values
		 * 
		 * @method mapRelations
		 * @chainable 
		 * @example 
		 * 	var schema3 = {
			    properties:{
			        id:{ type:"string", required:false, indexed:true },
			        label:{ type:"string" },
			        plantId:{ type:"string" },
			        userId:{ type:"string" }
			    },
			    links:[
			        {
			            href:"plant::{ plantId }",
			            rel:"plant"
			        },
			        {
			            href:"user::{ userId }",
			            rel:"user"
			        }
			    ]
			}
		  	deep({ 
			    plantId:"e1",
			    userId:"e1",
			    label:"hello"
			}, schema3)
			.mapRelations({
			    user:"relations.user",
			    plant:"relations.plant"
			})
			.logValues();
		 * @param  {Object} map        the map (see examples)
		 * @param  {String} delimitter (optional) the paths delimitter
		 * @return {deep.Chain}       this
		 */
		mapRelations:function (map, delimitter) {
			if(!delimitter)
				delimitter = ".";
			var self = this;
			var relations = [];
			for(var i in map)
				relations.push(i);
			//console.log("mapRelations :  relations : ", relations);
			var func = function (s,e) {
				self._nodes.forEach(function(entry){
					if(!entry.schema || !entry.schema.links)
						return;
					var alls  = [];
					var count  = 0;
					deep.query(entry.schema.links, "./*?rel=in=("+relations.join(",")+")")
					.forEach(function(relation){
						//console.log("do map relations on : ", relation);
						var path = deep.interpret(relation.href, entry.value);
						alls.push(deep.get(path, { defaultProtocole:"json", wrap:{ path:map[relation.rel] } }));
						count++;
					});
					if(alls.length == 0)
						return [s,e];
					deep.all(alls)
					.done(function(results){
						//console.log("mapRelations : results : ", results);
						results.forEach(function(r){
							//console.log("do : ", r, " - on : ", entry.value)
							deep.utils.setValueByPath(entry.value, r.path, r.result, delimitter);
						});
						forceNextQueueItem(self, results, null);
					})
					.fail(function(error){
						forceNextQueueItem(self, null, error);
					})
				});
			}
			deep.chain.addInChain.apply(this, [func]);
			return this;
		},
		/**
		 * return a promise for the chain.
		 * @return {deep.Promise}
		 */
		promise:function () {
			this._listened = true;
			if(this.initialised && this.callQueue.length === 0 && !this.running && !this.deferred.rejected && !this.deferred.resolved && !this.deferred.canceled)
				if(this.reports.failure)
					this.reject(this.reports.failure);
				else
					this.resolve(this.reports.result);
			return this.deferred.promise();
		}
	};

	//________________________________________________________ DEEP CHAIN UTILITIES

	deep.chain = {
		nextQueueItem:nextQueueItem,
		forceNextQueueItem:forceNextQueueItem,
		addInChain:addInChain,
		stringify:function (handler, options)
		{
			options = options || {};
			var res = "";
			handler._nodes.forEach(function (e) {
				if(options.pretty)
					res += JSON.stringify(e.value, null, ' ')+"\n";
				else
					res += JSON.stringify(e.value)+"\n";
			});
			return res;
		},
		clear:function (handler) {
			handler.oldQueue = [];
			handler.callQueue = [];
			return handler;
		},
		val:function (handler) {
			if(handler._nodes.length === 0)
				return undefined;
			return handler._nodes[0].value;
		},
		values:function (handler) {
			var res = [];
			handler._nodes.forEach(function (e) {
				res.push(e.value);
			});
			return res;
		},
		nodes:function (handler) {
			var res = [];
			handler._nodes.forEach(function (e) {
				res.push(e);
			});
			return res;
		},
		paths:function (handler) {
			var res = [];
			handler._nodes.forEach(function (e) {
				res.push(e.paths);
			});
			return res;
		},
		schemas:function (handler) {
			var res = [];
			handler._nodes.forEach(function (e) {
				res.push(e.schema);
			});
			return res;
		},
		position : function (handler, name, options) {
			options = options || {};
			handler.positions.push({
				name:name,
				entries:handler._nodes.concat([]),
				store:handler._store,
				queue:(options.restartChain)?handler.callQueue.concat([]):null
			});
		}
	};
	

	//______________________________________

	deep.handlers = {};
	deep.handlers.decorations = {};
	//________________________________________________________ DEEP CHAIN UTILITIES

	/**
	 * execute array of funcs sequencially
	 * @for deep
	 * @static 
	 * @method sequence
	 * @param  {String} funcs an array of functions to execute sequentially
	 * @param  {Object} args (optional) some args to pass to first functions
	 * @return {deep.Chain} a handler that hold result 
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
		return def.promise();
	};

	

	//__________________________________________________________________ TREATMENTS

	/**
	 * apply treatment 
	 * @param  {[type]} treatment [description]
	 * @param  {[type]} context   [description]
	 * @return {[type]}           [description]
	 */
	deep.treat =  function(treatment, context) {
		return applyTreatment.apply(treatment, [context || {}]);
	};


	var applyTreatment = function(context) 
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
		return deep
		.all(objs)
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

	require( "deep/deep-stores" )(deep);
	require("deep/deep-promise")(deep);
	return deep;

	//______________________________________________________________________________________________________________________________________
});





