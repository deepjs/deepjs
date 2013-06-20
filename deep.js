/**
 * @module deep
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(["require","./utils", "./deep-rql", "./deep-schema", "./deep-query", "./deep-compose", "./deep-collider", "./deep-errors"],
function(require)
{
	deep = function(obj, schema, options)
	{
		//console.log("start chain : ", obj)
		//if(obj && obj._deep_chain_ && obj.oldQueue)
		//	return obj;
		try{
			var h = new deep.Chain(options);
			if(typeof obj === 'string')
				obj = deep.get(obj);
			if(typeof schema === 'string')
				schema = deep.get(schema);

			var doStart = function(obj, schema)
			{
				//if(obj._deep_entry)
				//console.log("do start : ", obj._deep_entry)
				var r = obj;
				if(obj && obj._isDQ_NODE_)
				{
					r = obj.value;
					h._nodes = [obj];
				}	
				else if(obj && obj._deep_entry)
				{
					r = obj._deep_entry.value;
					h._nodes = [obj._deep_entry];
				}
				else
				{
					h._nodes = [deep.Querier.createRootNode(obj, schema, options)];
				}
				h._queried = false;
				h._start(r,null);
			}
			if(obj && (obj.then || obj.promise || (schema && (schema.then || schema.promise))))
			{
				//console.log("chain start with deferred or promise : ", obj)
				var alls = [];
				alls.push(obj);
				if(schema)
					alls.push(schema);
				deep.all(alls)
				.done(function(res){
					//console.log("deep start chain res  : ",res);
					doStart(res[0], res[1]);
				})
				.fail(function(error){
					h._nodes = [deep.Querier.createRootNode({}, schema, options)];
					h._start(null,error);
				});
			}
			else
				doStart(obj, schema);
		}
		catch(error)
		{
			console.log("internal chain start error : ", error);
			h._nodes = [deep.Querier.createRootNode({}, schema, options)];
			h._start(null,error);
		}
		return h;
	}
	var errors = require( "deep/deep-errors" )(deep);

		/**
	 * final namespace for deep/deep-compose
	 * @static
	 * @property compose
	 * @type {Object}
	 */
	deep.compose = require("./deep-compose")(deep);
	/**
	 * final namespace for deep/deep-collider 
	 * @static
	 * @property collider
	 * @type {Object}
	 */
	deep.collider = require("./deep-collider")(deep);
	/**
	 * rethrow any throw during chain execution.
	 * @property rethrow  
	 * @static
	 * @type {Boolean}
	 */
	deep.rethrow = false;
	deep.metaSchema = {};
	/**
	 * final namespace for deep/utils
	 * @static
	 * @property utils
	 * @type {Object}
	 */
	var utils = deep.utils = require("./utils")(deep);
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
	deep.rql = require("./deep-rql")(utils).query;
	
	/**
	 * final namespace for deep/deep-query
	 * @static
	 * @property Querier
	 * @type {DeepQuery}
	 */
	var Querier = deep.Querier = require("./deep-query")(deep);
	/**
	 * the deep schema validator
	 * @static
	 * @property Validator
	 */
	deep.Validator = require("./deep-schema")(deep);
	/**
	 * perform a deep-schema validation
	 * @static
	 * @method validate
	 * @param object the object to validate
	 * @param schema the schema 
	 * @return {deep.validate.Report} the validation report
	 */
	deep.validate = deep.Validator.validate;
	/**
	 * perform a deep-schema partial validation (only on certain field)
	 * @static
	 * @method partialValidation
	 * @param object the object to validate
	 * @param fields the array of properties paths to validate
	 * @param schema the schema 
	 * @return {deep.validate.Report} the validation report
	 */
	deep.partialValidation = deep.Validator.partialValidation;

	/**
	 * are you on nodejs or not
	 * @static
	 * @property isNode
	 * @type {Boolean}
	 */
	deep.isNode = (typeof process !== 'undefined' && process.versions && process.versions.node);

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

	var addInChain = function(handle)
	{
		var self = this;
		if(self.deferred && (self.deferred.rejected || self.deferred.resolved))
			throw new Error("you try to add handles in ended chain ! aborting and throw.");
		self._queue.push(handle);
		if(self._initialised && !self._running && !self._executing)
			self._forceHandle();
		return this;
	}

	var forceHandle = function()
	{
		if(!this._initialised)
			return;
		var self = this;
		if(this.oldQueue)
		{
			this._queue = this._queue.concat(this.oldQueue);
			delete this.oldQueue;
		}

		if(self._queue.length > 0)
		{
			self._executing = true; //  synch flag
			while(!self._running) // while not asynch
			{
				var previousContext = deep.context;
				try{
					if(previousContext !== this.context){
						if(previousContext && previousContext.suspend)
							previousContext.suspend();
						deep.context = this.context;
						if(this.context && this.context.resume)
							this.context.resume();
					}

					// get next handle : if no more handle : just break;
					var next = self._queue.shift();
					if(self._error)
						while(next && next._isDone_)
							next = self._queue.shift();
					else
						while(next && next._isFail_)
							next = self._queue.shift();
					if(!next)
						break;

					self._running = true;	//  asynch flag
					var res = next(self._success, self._error);
					if(res && (res.then || res.promise || res._isBRANCHES_))
					{	
						//console.log("forceHandle : gt promise as result : ",res)
						deep.when(res)
						.done(function(res){
							//console.log("forceHandle : promise resolved : ",res)
							if(typeof res !== 'undefined')
							{
								self._success = (res instanceof Error)?null:res;
								self._error = (res instanceof Error)?res:null;
							}
							self._running = false;	// asynch flag
							if(!self._executing)  // real asynch event
								self._forceHandle();
						})
						.fail(function(e){
							self._running = false;  // asynch flag
							self._success = null;
							self._error = e; 
							if(!self._executing)  // real asynch event
								self._forceHandle();
						});
					}
					else
					{
						self._running = false;
						//console.log("deep force queue : res : ",res)
						if(typeof res !== 'undefined')
						{
							self._success = (res instanceof Error)?null:res;
							self._error = (res instanceof Error)?res:null;
						}
					}
				}
				catch(e)
				{
					var msg = "Internal chain error : rethrow ? "+ self._rethrow;
					console.error(msg, e);
					deep.utils.dumpError(e);
					if(self.rethrow)
						throw e;
					self._success = null;
					self._error = e;
					self._running = false;  // asynch flag
					//self._executing = false;
					//return forceHandle.call(this);
				}
				finally{
					if(previousContext !== this.context)
					{
						if(this.context && this.context.suspend)
							this.context.suspend();
						if(previousContext && previousContext.resume)
							previousContext.resume();
						deep.context = previousContext;
					}
					if(self.oldQueue)
					{
						self._queue = self._queue.concat(self.oldQueue);
						delete self.oldQueue;
					}
				}
			}
			self._executing = false;
		}
	}

	function createImmediatePromise(result)
	{
		//console.log("deep.createImmediatePromise : ", result instanceof Error)
		var prom = new deep.Promise();
		return prom._start(result);
	}

	deep.promise = function(arg)
	{
		//console.log("deep.promise : ", arg)
		if(typeof arg === "undefined" || arg === null)
			return createImmediatePromise(arg);
		if(typeof arg.promise === "function" )  // deep.Deferred, deep.Chain and jquery deferred case
			return arg.promise();
		if(typeof arg.promise === 'object')
			return arg.promise;
		if(typeof arg.then === 'function')		//any promise compliant object
		{
			if(arg._deep_promise_)
				return arg;
			
			//console.log("doing simple promise (no promise and then is present) on : ", arg);
			var def = deep.Deferred();
			arg.then(function(s){
				def.resolve(s);
			}, function(e){
				def.reject(e);
			})
			return def.promise();
		}	
		return createImmediatePromise(arg);
	}
	/**
	 * return a promise that will be fullfilled when arg are ready (resolve or immediat)
	 * @for deep
	 * @static 
	 * @method when
	 * @param  {Object} arg an object to waiting for
	 * @return {deep.Promise} a promise
	 */
	deep.when = deep.promise;
	/**
	 * return a promise that will be fullfilled when all args are ready (resolve or immediat)
	 * @for deep
	 * @static 
	 * @method all
	 * @param  {Object} arg an array of objects to waiting for
	 * @return {deep.Promise} a promise
	 */
	deep.all = function all()
	{
		var arr = [];
		for(var i in arguments)
			arr = arr.concat(arguments[i]);
		if(arr.length === 0)
			return createImmediatePromise([]);
		var def = deep.Deferred();
		var count = arr.length;
		var c = 0, d = -1;
		var res = [];
		var rejected = false;
		//console.log("deep.all : try : ",arr)
		arr.forEach(function (a)
		{
			if(def.rejected)
				return;
			var i = d +1;
			if(!a || (!a.then && !a.promise))
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
				//console.log("deep.all res : ",res)
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
					//console.log("deep.all res : ",res)
					if(c == count)
						def.resolve(res);
				}, function (error){
					if(!def.rejected && !def.resolved && !def.canceled)
						def.reject(error);
				});
			d++;
		});
		return def.promise();
	};

	//_____________________________________________________________________ DEFERRED

	/**
	 * A deep implementation of Deferred object (see promise on web)
	 * @class deep.Deferred
	 * @constructor
	 */
	deep.Deferred = function ()
	{
		if (!(this instanceof deep.Deferred)) 
			return new deep.Deferred();
		this.context = deep.context;
		this._promises = [];
		this._deep_deferred_ = true;
		return this;
	};

	deep.Deferred.prototype = {
		_deep_deferred_:true,
		_promises:null,
		rejected:false,
		resolved:false,
		canceled:false,
		_success:null,
		_error:null,
		/**
		 * resolve the Deferred and so the associated promise
		 * @method resolve
		 * @param  {Object} argument the resolved object injected in promise
		 * @return {deep.Deferred} this
		 */
		resolve:function resolve(argument)
		{
			//console.log("deep.Deferred.resolve : ", argument);
			if(this.rejected || this.resolved || this.canceled)
				throw new Error("DeepDeferred (resolve) has already been resolved !");
			if(argument instanceof Error)
				return this.reject(argument);
			this._success = argument;
			this.resolved = true;
			this._promises.forEach(function (promise) {
				promise._start(argument);
			});
		},
		/**
		 * reject the Deferred and so the associated promise
		 * @method reject
		 * @param  {Object} argument the rejected object injected in promise
		 * @return {deep.Deferred} this
		 */
		reject:function reject(argument)
		{
		//	console.log("DeepDeferred.reject");
			if(this.rejected || this.resolved || this.canceled)
				throw new Error("DeepDeferred (reject) has already been rejected !");
			this._error = argument;
			this.rejected = true;
			this._promises.forEach(function (promise) 
			{
				promise._start(null, argument);
			});
		},
		/**
		 * return a promise for this deferred
		 * @method promise
		 * @return {deep.Promise}
		 */
		promise:function defPromise() {
			var prom = new deep.Promise();
			//console.log("deep2.Deffered.promise : ", prom, " r,r,c : ", this.rejected, this.resolved, this.canceled)
			if(this.resolved || this.rejected || this.canceled)
				return prom._start(this._success, this._error);
			this._promises.push(prom);
			return prom;
		}
	};

	deep.Promise = function (options)
	{
		options = options || {};
		this.context = deep.context;
		this._queue = [];
		this._deep_promise_ = true;
		this._running = false;
		this._executing = false;
		this._initialised = false;
		this._rethrow = (typeof options.rethrow !== "undefined")?options.rethrow:deep.rethrow;
	};

	deep.Promise.prototype = {
		_forceHandle:forceHandle,
		_queue:null,
		_success:null,
		_error:null,
		_running:false,
		_executing:false,
		_initialised:false,
		_start:function(s,e){
			this._initialised = true;
			this._success = (s instanceof Error)?null:s;
			this._error = (s instanceof Error)?s:e;
			this._forceHandle();
			return this;
		},
		catchError:function(arg)
		{
			var self = this;
			if(self._initialised)
			{
				var	func = function(s,e)
				{
					self._rethrow = (typeof arg !== 'undefined')?arg:false;
				};
				addInChain.apply(this, [func]);
			}
			else
				self._rethrow = (typeof arg !== 'undefined')?arg:false;
			return this;
		},
		pushHandlerTo : function(array)
		{
			var self = this;
			if(self._initialised)
			{
				var func = function(s,e)
				{
					array.push(self);
				};
				addInChain.apply(this,[func]);
			}
			else
				array.push(self);
			return this;
		},
		done:function(callBack){
			var self = this;
			var	func = function(s,e)
			{
				//console.log("deep.done : ",s,e)
				self.oldQueue = self._queue;
				self._queue = [];
				var a = callBack.apply(self, [s]);
				if(a === self)
					return;
				return a;
			};
			func._isDone_ = true;
			return addInChain.apply(this, [func]);
		},
		fail:function(callBack){
			var self = this;
			var func = function(s,e)
			{
				self.oldQueue = self._queue;
				self._queue = [];
				var a = callBack.apply(self, [e]);
				if(a === self)
					return;
				return a;
			};
			func._isFail_ = true;
			return addInChain.apply(this,[func]);
		},
		always:function(callBack){
			var self = this;
			var func = function(s,e)
			{
				self.oldQueue = self._queue;
				self._queue = [];
				var a = callBack.apply(self, [s,e]);
				if(a === self)
					return;
				return a;
			};
			return addInChain.apply(this,[func]);
		},
		then:function(successCallBack, errorCallBack)
		{
			if(successCallBack)
				this.done(successCallBack);
			if(errorCallBack)
				this.fail(errorCallBack);
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
						if(deep.debug)
							deep.utils.dumpError(e)
						else if(e.report)
							args.push("deep.log : error : ("+e.status+"): ",e.message, e.report);
						else
							args.push("deep.log : error : ("+e.status+"): ",e.message);
					else
						args.push("deep.log : success : ",s);
				}
				args.forEach(function (a) {
					console.log(a);
				});
			};
			return addInChain.apply(this,[func]);
		},
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
				var def = deep.Deferred();
				setTimeout(function () {
					console.log("deep.delay.end : ", ms);
					def.resolve(undefined);
				}, ms);
				return def.promise();
			}
			return addInChain.apply(this,[func]);
		}
	}

	deep.BaseChain = function(options)
	{
		options = options || {};
		this._rethrow = (typeof options.rethrow !== "undefined")?options.rethrow:deep.rethrow;
		this._deep_chain_ = true;
		this.context = options._context || deep.context;
		this._queue = [];
		this._queried = options._queried;
		this._nodes = options._nodes;// || [deep.Querier.createRootNode(this._value, options.schema, options)];
		this._success = options._success || null;
		this._error = options._error || null;
		this.positions = [];
		this.deferred = deep.Deferred();
	};

	function cloneHandler(handler, cloneValues)
	{
		//console.log("cloneHandler : ", handler, cloneValues);
		var newRes = [];
		if(cloneValues)
			newRes = newRes.concat(handler._nodes);
		var newHandler = new deep.Chain({
			_rethrow:handler.rethrow,
			_nodes:newRes,
			_queried:handler._queried,
			_error: handler._error,
			_context:handler._context,
			_success: handler._success
		});
		newHandler._initialised = true;
		return newHandler;
	}

	var brancher = function (handler)
	{
		var self = this;
		var brancher = {
			branches:[],
			branch:function () {
				var cloned = cloneHandler(handler, true);
				this.branches.push(cloned);
				return cloned;
			},
			promise:function(){
				return deep.all(this.branches);
			}
		};
		return brancher;
	};

	deep.BaseChain.prototype = {
		_nodes:null,
		promise:function()
		{
			if(this._initialised && this._queue.length === 0 && (!this.oldQueue ||  this.oldQueue.length === 0) && !this._running && !this._executing)
				if(!this._error)
					this.deferred.resolve(this._success);
				else
					this.deferred.reject(this._error);

			return this.deferred.promise();
		},
		_forceHandle:function(){
			var self = this;
			if(self.deferred.rejected || self.deferred.resolved || self.deferred.canceled)
				throw new deep.errors.Internal("chain has already been ended ! could'nt execute it further.");
			forceHandle.apply(this);
			if(self._queue.length == 0 && !self._running && self.deferred._promises.length > 0 && !self.deferred.rejected && !self.deferred.resolved)
				if(self._error)
					self.deferred.reject(self._error);
				else
					self.deferred.resolve(self._success);
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
			};
			return addInChain.apply(this,[func]);
		},
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
				return prom;
			};
			func._isDone_ = true;
			return addInChain.apply(this,[func]);
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
				self._queue = [];
				var a  = func.call(self, brancher(self));
				if(a === self)
					return;
				return a;
			};
			create._isDone_ = true;
			return addInChain.call(this, create);
			return self;
		}
	}


	deep.Chain = function(options){
		deep.BaseChain.call(this, options);
	}
	deep.Chain.prototype = {};

	deep.utils.bottom(deep.Promise.prototype, deep.BaseChain.prototype);
	deep.utils.bottom(deep.BaseChain.prototype, deep.Chain.prototype);

	deep.Chain.addHandle = function(name, func)
	{
		deep.Chain.prototype[name] = func;
		return deep.Chain;
	}
	//__________________________________________________________ HANDLES


	var fullAPI = {
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
				var applyContext = function (context) 
				{
					return deep.chain.transform(function(v){
						return  deep.utils.interpret(v, context);
					});
				}
				if(typeof context === 'string')
					return deep.when(deep.get(context)).done(applyContext)
				else 
					return applyContext(context);
			};
			func._isDone_ = true;
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
			var func = function(s,e)
			{
				var doDeepLoad = function (toLoad) 
				{
					if(typeof toLoad.value === 'string')
					{
						var val = toLoad.value;
						if(context)
							val = deep.utils.interpret(toLoad.value, context);
						//console.log("deepLoad : will get : ", val);
						return deep.when(deep.get(val, { entry:toLoad }))
						.done(function(s){
							//console.log("deepLoad.get res : ", JSON.stringify(s));
							return s.value;
						});
					}
					else if(typeof toLoad.value === 'function')
					{
						if(toLoad.ancestor)
							toLoad.ancestor.value[toLoad.key]();
						else
							return toLoad.value();
					}
					else
						return toLoad.value;
				}
				var toLoads = [];
				self._nodes.forEach(function (e) {
					toLoads = toLoads.concat(deep.query(e, ".//*?or(_schema.type=string,_schema.type=function)", {resultType:"full"}));
				});
				//console.log("deep.load will load : ",toLoads)
				return deep.chain.transformNodes(toLoads, doDeepLoad);
			};
			func._isDone_ = true;
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
		load:function (request)
		{
			var self = this;
			var func =  function(s,e)
			{
				if(request)
				{
					if(typeof request === "string")
						return deep.get(request);
					if(typeof request === 'function')
						return request();
					else
						return request;
				}
				return deep.chain.transformNodes(self._nodes, function(v){
					//console.log("deep.load : node : ",v)
					if(v.value.load)
					{
						return deep.when(callFunctionFromValue(v, "load"))
						.done(function (argument) {
							return v.value;
						})
					}
					else if(typeof v.value === 'string')
						return deep.get(v.value, {});
					else
						return v.value;
				});
			};
			func._isDone_ = true;
			addInChain.apply(this,[func]);
			return this;
		},
				// ________________________________________ READ ENTRIES
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
		query:function(){
			var self = this;
			var args = arguments;
			var func = function(s,e){
				// both for array or object : if root = object : it means catch any properties...  if array : it means : catch any items
				var nodes = [];
				var values = [];
				//self._nodes = deep.query(self._nodes, q, {resultType:"full"});
				//console.log("deep2.Chain.query : ", args, " - on : ", self._nodes);

				self._nodes.forEach(function (r) {
					//console.log("deep.Chain.query on : ", r);
					for(var i = 0; i < args.length; ++i)
					{
						var q = args[i];
						if(q.indexOf("?") === 0)
							q = "./"+q; 
						r = deep.query(r.value, q, {resultType:"full", root:(r.root)?r.root.value:r.value});
						//console.log("deep2.Chain.query : res : ", r);
						if(typeof r !== 'undefined')
							nodes = nodes.concat(r);	
					}
				});
				self._nodes = deep.utils.arrayUnique(nodes, "path");
				self._queried = true;
				return deep.chain.values(self);
			}
			func._isDone_ = true;
			addInChain.apply(self,[func]);
			return this;
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
		/**
		 *
		 *  no callBack is present : just return the FIRST value of entries. It's a chain end handle.
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
				if(typeof callBack === 'string')
					return deep.when(deep.get(callBack))
					.done(function(callBack)
					{
						return applyCallBack(callBack, deep.chain.val(self));
					});
				else
					return applyCallBack(callBack, deep.chain.val(self));
			};
			func._isDone_ = true;
			if(callBack)
			{
				addInChain.apply(this,[func]);
				return this;
			}
			return  deep.chain.val(self);
		},
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
		first:function  (callBack)
		{
			var self = this;
			var func = function(s,e)
			{
				var shouldModify = function(callBack){
					if(callBack === true)
						return deep.chain.first(self, true);
					else	
						return applyCallBack(callBack, deep.chain.first(self));
				}
				if(typeof callBack === 'string')
					return deep.when(deep.get(callBack))
					.done(shouldModify);
				else
					return shouldModify(callBack);
			};
			func._isDone_ = true;
			if(callBack)
			{
				addInChain.apply(this,[func]);
				return this;
			}
			return  deep.chain.first(self);
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
		last:function  (callBack)
		{
			var self = this;
			var func = function(s,e)
			{
				var shouldModify = function(callBack){
					if(callBack === true)
						return deep.chain.last(self, true);
					else	
						return applyCallBack(callBack, deep.chain.last(self));
				}
				if(typeof callBack === 'string')
					return deep.when(deep.get(callBack))
					.done(shouldModify);
				else
					return shouldModify(callBack);
			};
			func._isDone_ = true;
			if(callBack)
			{
				addInChain.apply(this,[func]);
				return this;
			}
			return  deep.chain.last(self);
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
					return deep.chain.each(self, callBack);
				};
				if(typeof callBack === 'string')
					return deep.when(deep.get(callBack))
					.done(applyCallBack);
				else
					return applyCallBack(callBack);
			};
			func._isDone_ = true;
			addInChain.apply(this,[func]);
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
		 * @param callBack could be a retrievable (a String pointing something from store), or a Function, or a treatment (an Object - see treatments in doc)
		 * @return {deep.Chain|Array} this or values
		 */
		values:function  (callBack)
		{
			var self = this;
			var func = function(s,e)
			{
				if(typeof callBack === 'string')
					return deep.when(deep.get(callBack))
					.done(function(callBack){
						return applyCallBack(callBack, deep.chain.values(self));
					});
				return applyCallBack(callBack, deep.chain.values(self));
			};
			func._isDone_ = true;
			if(callBack)
			{
				addInChain.apply(this,[func]);
				return this;
			}
			return deep.chain.values(self);
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
					return deep.chain.transform(self, transformer);
				}
				if(typeof transformer === 'string')
					return deep.when(deep.get(transformer))
					.done(applyTransformer);
				else
					return applyTransformer(transformer);
			};
			func._isDone_ = true;
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
				//console.log("deep.run : ", funcRef)
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
					else if(typeof funcRef === 'function')
						alls.push(runFunctionFromValue(result, funcRef, args));
					else if(typeof funcRef === 'string')
						alls.push(callFunctionFromValue(result, funcRef, args));
					else
						alls.push(result);
				});
				return deep.all(alls);
			};
			create._isDone_ = true;
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
			var create = function(){
				return func.apply({}, args);
			};
			create._isDone_ = true;
			addInChain.apply(this,[create]);
			return this;
		},
		//______________________________________ ENTRIES ARRAY MANIPULATION
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
				if(self._nodes.length === 0)
					return;
				if(self._queried)
				{
					self._nodes.reverse();
					return;
				}
				if(self._nodes[0].value instanceof Array)
					self._nodes[0].value.reverse();
			};
			create._isDone_ = true;
			addInChain.apply(this, [create]);
			return self;
		},
		/**
		 * sort chain values.
		 * @method sort
		 * @chainable
		 * @return {deep.Chain} this
		 */
		sort:function () 
		{
			var args = arguments;
			var self = this;
			var doSort = function (array){
				var terms = [];
				for(var i = 0; i < args.length; i++)
				{
					var sortAttribute = args[i];
					var firstChar = sortAttribute.charAt(0);
					var term = {attribute: sortAttribute, ascending: true};
					if (firstChar == "-" || firstChar == "+") 
					{
						if(firstChar == "-")
							term.ascending = false;
						term.attribute = term.attribute.substring(1);
					}
					if(self._queried)
						term.attribute = "value" + ((term.attribute)?("."+term.attribute):"");
					terms.push(term);
				}
				array.sort(function(a, b)
				{
					for (var term, i = 0; term = terms[i]; i++) {
						if(term.attribute === "")
						{
							if (a != b)
								return term.ascending == a > b ? 1 : -1;
							return;
						}
						var ar = deep.utils.retrieveValueByPath(a, term.attribute);
						var br = deep.utils.retrieveValueByPath(b, term.attribute);
						if (ar != br)
							return term.ascending == ar > br ? 1 : -1;
					}
					return 0;
				});
				if(self._queried)
					return deep.chain.val(self);
				return array;
			}
			var create =  function(s,e)
			{
				if(args.length === 0)
					args = ["+"];
				if(self._queried)
					return doSort(self._nodes);
				if(self._nodes.length === 0)
					return [];
				if(self._nodes[0].value instanceof Array)
					return doSort(self._nodes[0].value);
				return self._nodes[0].value;
			};
			create._isDone_ = true;
			addInChain.apply(this, [create]);
			return self;
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
			var func = function(s,e)
			{
				var rangeObject = null;
				if(!self._queried)
				{
					if(self._nodes.length === 0)
						return utils.createRangeObject(0, 0, 0);
					var val = self._nodes[0];
					if(val.value instanceof Array)
					{
						rangeObject = utils.createRangeObject(start, end, val.value.length);
						rangeObject.results = val.value = val.value.slice(rangeObject.start, rangeObject.end+1);
						return rangeObject;
					}
					rangeObject = utils.createRangeObject(0, 0, 1);
					rangeObject.results = [val.value];
					return rangeObject;
				}
				rangeObject = utils.createRangeObject(start, end, self._nodes.length);
				self._nodes = self._nodes.slice(rangeObject.start, rangeObject.end+1);
				rangeObject.results = deep.chain.values(self);
				return rangeObject;
			};
			func._isDone_ = true;
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
			};
			func._isDone_ = true;
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
					return deep.errors.Internal("chain handler error : no positions to go back with name : "+name);
				self._nodes = position.entries;
				self._store = position.store;
				self._queried = position.queried;
				return position;
			};
			func._isDone_ = true;
			addInChain.apply(this,[func]);
			return this;
		},
		//_________________________________________________________________________________________


	
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
					if(r.ancestor)
						res.push(r.ancestor);
				});
				if(res.length > 0)
					res = deep.utils.arrayUnique(res, "path");
				self._nodes = res;
				if(res.length === 0 && errorIfEmpty)
					return deep.errors.Internal("deep.parents could not gives empty results");
				return deep.chain.values(self);
			};
			func._isDone_ = true;
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
		deep:function (object, schema, options)
		{
			var self = this;
			var func = function()
			{
				//console.log("deep chain restart")
				return deep(object, schema, options)
				.done(function (s) {
					//console.log("deep restart resolved: ", s)
					self._nodes = this._nodes;
					self._success = this._success;
					self._queried = false;
					//console.log("self : ",self._success)
					//return this.delay(100).log("done")
					//return deep.chain.val(self);
				});
			};
			func._isDone_ = true;
			addInChain.apply(this,[func]);
			return this;
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
			var func = function()
			{
				var appySet = function (obj)
				{
					var res = [];
					self._nodes.forEach(function(result){
						res.push(utils.setValueByPath(result.value, path, obj, '/'));
					});
					return res;
				};
				if(typeof obj === 'string')
					return deep.when(deep.get(obj))
					.done(applySet);
				return applySet(obj);
			};
			func._isDone_ = true;
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
				return deep.when(deep.getAll(args))
				.done(function (objects)
				{
					self._nodes.forEach(function(result){
						objects.forEach(function (object) {
							//console.log("deep.up : entry : ", result.value, " - to apply : ", object)
							result.value = utils.up(object, result.value, result.schema);
							if(result.ancestor)
								result.ancestor.value[result.key] = result.value;
						});
					});
					return deep.chain.val(self);
				});
			};
			func._isDone_ = true;
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
				return deep.when(deep.getAll(args))
				.done(function (objects)
				{
					self._nodes.forEach(function(result){
						objects.forEach(function (object) {
							result.value = utils.bottom(object, result.value, result.schema);
							if(result.ancestor)
								result.ancestor.value[result.key] = result.value;
						});
					});
					return deep.chain.val(self);
				});
			};
			func._isDone_ = true;
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
				var doReplace = function (by)
				{
					var replaced = [];
					self._nodes.forEach(function (r) 
					{
						deep.query(r.value, what, {resultType:"full"}).forEach(function(r){
							if(!r.ancestor)
								return;
							r.ancestor.value[r.key] = r.value = by;
							replaced.push(r);
						});
					});
					return replaced;
				};
				if(typeof by === 'string')
					return deep.when(deep.get(by, options))
					.done(doReplace);
				return doReplace(by);
			};
			func._isDone_ = true;
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
					deep.query(r, what, {resultType:"full"}).forEach(function(r)
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
				return removed;
			};
			func._isDone_ = true;
			addInChain.apply(this,[func]);
			return this;
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
				var def = deep.Deferred();
				//console.log("do childs")
				deep.when(self.extChilds(result))
				.done(function () {
					count--;
					//console.log("do childs ends : count : ", count);
					if(count === 0)
						def.resolve(deep.chain.values(self));
				}, function (error) {
					//console.error("error : deep.flatten : ",error);
					def.reject(error);
				});
				return def.promise();
			};
			var func = function(){
				var alls = [];
				//console.log("execute flatten")
				self._nodes.forEach(function (result)
				{
					count++;
					if(typeof result.value.backgrounds !== 'undefined' && result.value.backgrounds !== null)
					{
						alls.push(deep.when(self.extBack(result))
						.done(function(stack) {
							//console.log("backgrounds extendeds")
							var f = {};
							stack.forEach(function(s){ 
								//console.log("flatten : extended background : ",s)
								f = utils.bottom(s, result.value, result.schema); 
								delete s.backgrounds; 
							});
							delete result.value.backgrounds;
							return doChilds(result);
						}));
						delete result.value.backgrounds;
					}
					else
						alls.push(doChilds(result));
				});
				if(self._nodes.length === 0)
					return deep.chain.val(self);
				return deep.all(alls).done(function(){
					return deep.chain.val(self);
				});
			};
			func._isDone_ = true;
			addInChain.apply(this,[func]);
			return this;
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
			var self = this;
			var func = function()
			{
				var toTest = deep.chain.val(self);
				var ok = utils.deepEqual(toTest, obj);
				var report = { equal:ok, value:toTest, needed:obj };
				if(ok)
					return report;
				else
					return deep.errors.PreconditionFail("deep.equal failed ! ", report);
			};
			func._isDone_ = true;
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
						var rep = deep.Validator.validate(e.value, schema || e.schema || {});
						report.reports.push(rep);
						if(!rep.valid)
							report.valid = false;
					});
					//console.log("validate is valid : ", report);
					if(report.valid)
						return (self._queried)?report:report.reports.shift();
					else
						return deep.errors.PreconditionFail("deep.validate failed ! ", report);
				}
				if(typeof schema === 'string')
					return deep.when(deep.get(schema))
					.done(runSchema);
				else
					return runSchema(schema)
			};
			func._isDone_ = true;
			func._name = "deep.Chain.validate";
			addInChain.apply(this,[func]);
			return this;
		},
		/**
		 * callback response MUST be true
		 * @method assert
		 * @param  {Function} callBack
		 * @return {deep.Chain}   this
		 */
		assert:function(callBack){
			var self = this;
			var	func = function(s,e)
			{
				//console.log("deep.chain.done : ",s,e)
				var doTest = function(a)
				{
					if(a !== true)
						return deep.errors.Assertion("assertion failed");
					else
						return true;
				};
				var a = null;
				if(typeof callBack === 'function')
				{
					self.oldQueue = self._queue;
					self._queue = [];
					a = callBack.call(self,s);
				}
				else
					a = callBack;
				if(a && (a.then || a.promise))
					return deep.when(a)
					.done(doTest)
				return doTest(a);
			};
			func._isDone_ = true;
			return addInChain.apply(this, [func]);
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
				return deep.chain.val(self);
			};
			var func = function(s, e) {
				if(self._nodes.length === 0)
					return deep.chain.values(self);
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
						return deep.when(parsed.store.get(parsed.uri))
						.done(function (results) {
							results = [].concat(results);
							return doMap(results, localKey, foreignKey, whereToStore);
						});
					else
						return deep.errors.Internal("deep.mapOn need array as 'what' : provided : "+ JSON.stringify(what));
				}
				else
					return doMap(what, localKey, foreignKey, whereToStore);
			};
			func._isDone_ = true;
			addInChain.apply(this, [func]);
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
						var path = deep.utils.interpret(relation.href, entry.value);
						var parsed = deep.parseRequest(path);
						var wrap = { rel:relation, href:parsed } ;
						r[relation] = wrap;
						alls.push(deep.get(parsed, { defaultProtocole:"json", wrap:wrap}));
					});
				});
				if(alls.length == 0)
					return [s,e];
				return deep.all(alls)
				.done(function(s){
					//console.log("get relations : ", s)
					return temp;
				});
			}
			func._isDone_ = true;
			addInChain.apply(this, [func]);
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
				});
				if(alls.length == 0)
					return;
				return deep.all(alls)
				.done(function(results){
					//console.log("mapRelations : results : ", results);
					results.forEach(function(r){
						//console.log("do : ", r, " - on : ", entry.value)
						deep.utils.setValueByPath(entry.value, r.path, r.result, delimitter);
					});
					return results;
				});
			}
			func._isDone_ = true;
			addInChain.apply(this, [func]);
			return this;
		}
	}


	function callFunctionFromValue(entry, functionName, args)
	{
		//console.log("callFunctionFromValue : ", entry, functionName);
		if(!entry._isDQ_NODE_)
			throw new Error("deep.callFunctionFromValue need DQNode");
		var value = entry.value;
		if(typeof args === 'undefined')
			args = [];
		else if(!(args instanceof Array))
			args = [args];
		var prom;
		if(value && value[functionName])
		{
			value._deep_entry = entry;
			prom = value[functionName].apply(value, args);
			if(prom && prom.then)
				prom.then(function () {
					delete value._deep_entry;
				},
				function () {
					delete value._deep_entry;
				});
			else
				delete value._deep_entry;
			return prom;
		}
		return prom;
	}
	function runFunctionFromValue(entry, func, args)
	{
		//console.log("runFunctionFromValue", entry, func);
		if(!entry._isDQ_NODE_)
			throw new Error("deep.callFunctionFromValue need DQNode");
		var value = entry.value;
		if(typeof args === 'undefined')
			args = [];
		else if(!(args instanceof Array))
			args = [args];

		if(!value)
			return undefined;
		value._deep_entry = entry;
		var prom = func.apply(value, args);
		if(prom && prom.then)
			prom.then(function () {
				delete value._deep_entry;
			},
			function () {
				delete value._deep_entry;
			});
		else
			delete value._deep_entry;
		return prom;
	}

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
	var extendsChilds = fullAPI.extChilds = function doExtendsChilds(entry)
	{
		if(!entry)
			return entry;
		var toExtends = deep.query(entry, ".//*?backgrounds", {resultType:"full"});
		if(toExtends.length === 0)
			return entry;
		var deferred = deep.Deferred();
		var rec = toExtends[0];
		var handler = deep(rec);
		handler.flatten().then(function ()
		{
			deep.when(handler.extChilds(entry))
			.then(function () {
				deferred.resolve(entry);
			}, function (error) {
				deferred.reject(error);
			});
		},
		function (error) {
			deferred.reject(error);
		});
		return deferred.promise();
	};
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
	var extendsBackgrounds = fullAPI.extBack = function doExtendsBackgrounds(entry)
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
			//console.log("will retrieve backgrounds : ", value.backgrounds, " - ", entry);
			deep.when(deep.getAll(value.backgrounds, { entry:entry })).then(function extendedsLoaded(extendeds){
				//console.log("extendeds backgroudns: ", extendeds);
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
					recursion.push(self.extBack(exts));
				}
				deep.all(recursion).then(function finaliseExtendsBackgrounds(extendeds){
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
	};

	var applyCallBack = function (callBack, value) 
	{	
		var r = null;
		if(typeof callBack === 'function')
			r = callBack(value);
		else
			r = applyTreatment.call(callBack, value);
		if(typeof r === 'undefined')
			return value;
		return r;
	}

	deep.utils.up(fullAPI, deep.Chain.prototype);

	deep.Chain.addHandle("refresh", function()
	{
		var self = this;
		var func = function(s,e){
			var res = null;
			if(self._value instanceof Array)
			{
				res = [];
				self._value.forEach(function(v){
					if(typeof v['refresh'] === 'function')
						res.push(v.refresh.apply(v, arguments));
				});
				return deep.all(res);
			}
			else
				if(typeof self._value['refresh'] === 'function')
					return self._value.refresh.apply(self._value, arguments);
		}
		func._isDone_ = true;
		addInChain.apply(self,[func]);
		return this;
	});


	//________________________________________________________ DEEP CHAIN UTILITIES

	deep.chain = {
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
		transform:function (handler, transformer) 
		{
			var transfo = {
				results:[],
				nodes:null,
				promise:null
			}
			if(!handler._queried)
			{
				transfo.nodes = handler._nodes[0];
				if(transfo.nodes .value instanceof Array)
				{
					transfo.nodes .value.forEach(function(v){
						transfo.results.push(transformer(v));
					});
					transfo.promise = deep.all(transfo.results);
				}
				else
				{
					transfo.results = transformer(transfo.nodes .value);
					transfo.promise = deep.when(transfo.results);
				}
			}
			else
			{
				transfo.nodes = handler._nodes;
				transfo.nodes.forEach(function (e) {
					transfo.results.push(transformer(e.value));
				});
				transfo.promise = deep.all(transfo.results);
			}
			return deep.when(transfo.promise)
			.done(function(res){
				if(transfo.nodes instanceof Array)
					transfo.nodes.forEach(function(n){
						n.value = res.shift();
						if(n.ancestor)
							n.ancestor.value[n.key] = n.value;
					});
				else
				{
					transfo.nodes.value = res;
					if(transfo.nodes.ancestor)
							transfo.nodes.ancestor.value[transfo.nodes.key] = n.value;
				}
				return res;
			});
		},
		transformNodes:function (nodes, transformer) 
		{
			var results = [];
			nodes.forEach(function (e) {
				results.push(transformer(e));
			});
			//console.log("transfo will wait for : ", results);
			return deep.all(results)
			.done(function(res){
				//console.log("transformeNodes results : ", res);
				var fin = [];
				nodes.forEach(function(n)
				{
					n.value = res.shift();
					if(n.ancestor)
						n.ancestor.value[n.key] = n.value;
					fin.push(n.value);
				});
				return fin;
			});
		},
		val: function (handler) {
			if(handler._nodes.length === 0)
				return undefined;
			if(handler._queried)
				return this.values(handler);
			return handler._nodes[0].value;
		},
		first: function (handler, modifyNodes) 
		{
			if(handler._nodes.length === 0)
				return undefined;
			var firstNode = handler._nodes[0];
			if(handler._queried || !(firstNode.value instanceof Array))
			{
				if(modifyNodes)
					handler._nodes = [firstNode]
				return firstNode.value;
			}
			var val = firstNode.value[0];
			if(modifyNodes)
			{
				handler._queried = false;
				handler._nodes = deep.query(firstNode, "./0", { resultType:"full"});
			}
			return val;
		},
		last:function (handler, modifyNodes) {
			if(handler._nodes.length === 0)
				return undefined;
			if(handler._queried )
			{
				var lastNode = handler._nodes[handler._nodes.length-1];
				if(modifyNodes)
					handler._nodes = [lastNode]
				return lastNode.value;
			}
			var firstNode = handler._nodes[0];
			if (firstNode.value instanceof Array)
			{
				var lastIndex = firstNode.value.length-1;
				var val = firstNode.value[lastIndex];
				if(modifyNodes)
				{
					handler._queried = false;
					handler._nodes = deep.query(firstNode, "./"+lastIndex, { resultType:"full"});
				}
				return val;
			}
			return firstNode.value;
		},
		values:function (handler) {
			if(!handler._queried && (handler._nodes[0].value instanceof Array))
				return handler._nodes[0].value;
			var res = [];
			handler._nodes.forEach(function (e) {
				res.push(e.value);
			});
			return res;
		},
		each:function (handler, callBack) 
		{
			var res = [];
			if(!handler._queried && (handler._nodes[0].value instanceof Array))
				handler._nodes[0].value.forEach(function(v){
					if(typeof callBack === 'object')
						res.push(applyTreatment.call(callBack, v));
					else
						res.push(callBack(v));
				});
			else
				handler._nodes.forEach(function (e) {
					if(typeof callBack === 'object')
						res.push(applyTreatment.call(callBack, e.value));
					else
						res.push(callBack(e.value));
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
				queried:handler._queried,
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
			} 
			catch (e) 
			{
				console.log("Error while treating : ", e);
				if (typeof self.fail === 'function')
					return self.fail.apply(context, [e]) || e;
				return e;
			}
			if (typeof self.done === "function")
				return self.done.apply(context, [nodes, r, what]) || [nodes, r, what];

			return nodes || r;
		})
		.fail(function(error) 
		{
			console.log("Error while treating : ", error);
			if (typeof self.fail === 'function')
				return self.fail.apply(context, [error]) || error;
			return error;
		});
	};
//	require( "deep/deep-stores" )(deep);
//	//________________________________________________________________________________________
	if(typeof requirejs !== 'undefined')
		requirejs.onError = function (err) {
	        console.log('requirejs OnError : ' + err);
		    console.log(err.requireType);
		    if (err.requireType === 'timeout') {
		        console.log('modules: ' + err.requireModules);
		    }
		    //throw err;
		};

		/**
	 * start chain setted with a certain store
	 * @example
	 *
	 * 	deep.store("json").get("/campaign/").log();

	 *  ...
	 *  deep.store("campaign").get("?").log()
	 *
	 * 
	 * @class deep.store
 	 * @constructor
	 */
	deep.store = function (name)
	{
		//	console.log("deep.store(name) : ",name)
		return deep({}).store(name);
	};

	/**
	 * Empty class : Just there to get instanceof working (be warning with iframe issue in that cases).
	 * @class deep.store.Store
	 * @constructor
	 */
	deep.Store = function () {};
	deep.Store.prototype = {
		_deep_store_:true
	};


	deep.extensions = [];

	/**
	 * A store based on simple array
	 * @class deep.store.Array
	 * @constructor
	 * @param {Array} arr a first array of objects to hold
	 * @param {Object} options could contain 'schema'
	 */
	deep.store.ArrayStore = function (arr, options) 
	{
		var store = new deep.Store();
		options = options || {};
		store.schema = options.schema || {};
		var stock = {
			collection:arr
		};
		/**
		 * @method get
		 * @param  {String} id the id of the object to retrieve. Could also be a (deep)query.
		 * @param {Object} options an options object (here there is no options)
		 * @return {Object} the retrieved object
		 */
		store.get = function (id, options) 
		{
			if(id === "" || !id || id === "*")
				id = "?";
			//console.log("ArrayStore.get : ",id," - stock : ", stock)
			if(typeof id === "string" &&  id.match( /^((\.?\/)?\?)|^(\?)/gi ) )
				return deep(stock).query("./collection/*"+id).store(this);
			if(typeof id === "string")
				return deep(stock)
				.query("./collection/*?id=string:"+id)
				.done(function(res){
					return res.shift();
				})
				.store(this);
			return deep(stock)
			.query("./collection/*?id="+id)
			.done(function(res){
				return res.shift();
			})
			.store(this);
		};
		/**
		 * @method put
		 * @param  {Object} object the object to update
		 * @param  {Object} options an options object : could contain 'id'
		 * @return {Object} the updated object
		 */
		store.put = function (object, options) {
			options = options || {};
			var id = options.id || object.id;
			if(!id)
				throw new Error("Array store need id on put");
			var schema = options.schema || this.schema;
			if(schema)
				return deep(object, schema)
				.validate()
				.root(stock)
				.replace("./collection/*?id="+id, object)
				.done(function(success){
				    return success.shift().value;
				})
				.store(this);
			else
				return deep(stock)
				.replace("./collection/*?id="+id, object)
				.done(function(success){
				    return success.shift().value;
				})
				.store(this);
		};
		/**
		 * @method post
		 * @param  {Object} object
		 * @param  {Object} options (optional)
		 * @return {Object} the inserted object (decorated with it's id)
		 */
		store.post = function (object, options) 
		{
			options = options || {};
			if(!object.id)
				object.id = id = new Date().valueOf()+""; // mongo styled id
			var schema = options.schema || this.schema;

			return deep(stock)
			.query("./collection/*?id="+object.id)
			.done(function(res){
				if(res.length > 0)
					return new Error("deep.store.ArrayStore.post : An object has the same id before post : please put in place : object : ",object);
				if(schema)
					return deep(object)
					.validate(schema)
					.done(function (report) {
						stock.collection.push(object);
						return object;
					});
				stock.collection.push(object);
				return object;
			})
			.store(this);
		};
		/**
		 * @method del
		 * @param  {String} id
		 * @param  {Object} options no options for the moment
		 * @return {Object} the removed object
		 */
		store.del = function (id, options) {
			return deep(stock).remove("./collection/*?id="+id).store(this);
		};
		/**
		 * @method patch
		 * @param  {Object} object  the update to apply to object
		 * @param  {Object} options  could contain 'id'
		 * @return {deep.Chain} a chain that hold the patched object and has injected values as success object.
		 */
		store.patch = function (object, options) {
			options = options || {};
			var id = object.id || options.id;
			if(!id)
				throw new Error("deep.stores.Array need id on patch");
			var schema = options.schema || this.schema;
			return deep(stock)
			.query("./collection/*?id="+object.id)
			.done(function (res) {
				if(res.length == 0)
					return new Error("ArrayStore.patch : no object found in collection with id : "+ object.id+". Aborting patch. Please post before");
			})
			.up(object)
			.done(function (res) {
				if(schema)
					this.validate(schema);
			})
			.store(this);
		};
		/**
		 * select a range in collection
		 * @method range
		 * @param  {Number} start
		 * @param  {Number} end
		 * @return {deep.Chain} a chain that hold the selected range and has injected values as success object.
		 */
		store.range = function (start, end) {
			return deep(stock.collection).range(start,end).store(this);
		};
		return store;
	};

	/**
	 * A store based on simple object
	 * @class deep.store.Object
	 * @constructor
	 * @param {Object} obj the root object to hold
	 * @param {Object} options could contain 'schema'
	 */
	deep.store.ObjectStore = function (obj, options)
	{
		var store = new deep.Store();
		options = options || {};
		store.schema = options.schema || {};
		/**
		 * 
		 * @method get
		 * @param  {String} id
		 * @return {deep.Chain} depending on first argument : return an object or an array of objects
		 */
		store.get = function (id)
		{
			//if(id === "" || !id || id === "*")
			if(id[0] == "." || id[0] == "/")
				return deep(obj).query(id).store(this);
			return deep(obj).query("./"+id).store(this);
		};
		/**
		 * @method put
		 * @param  {[type]} object
		 * @param  {[type]} query
		 * @return {[type]}
		 */
		store.put = function (object, query)
		{
			//console.log("ObjectStore.put : ", object, query);
			deep(obj)
			.setByPath(query, object);
			return deep(object).store(this);
		};
		/**
		 * @method post
		 * @param  {[type]} object
		 * @param  {[type]} path
		 * @return {[type]}
		 */
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
			return deep(object)
				.store(this);
		};
		/**
		 * @method del
		 * @param  {[type]} id
		 * @return {[type]}
		 */
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
				deep(obj)
				.remove("./"+id)
				.done(function (removed)
				{
					res = removed;
				});
			return deep(res).store(this);
		};
		/**
		 * @method patch
		 * @param  {[type]} object
		 * @param  {[type]} id
		 * @return {[type]}
		 */
		store.patch = function (object, id)
		{
			if(id[0] == "." || id[0] == "/")
				return deep(obj).query(id).up(object).store(this);
			return deep(obj).query("./"+id).up(object).store(this);
		};
		return store;
	};
	/**
	 * parse 'retrievable' string request (e.g. "json::test.json")
	 * @for deep
	 * @method parseRequest
	 * @static
	 * @param  {String} request
	 * @return {Object} infos an object containing parsing result
	 */
	deep.parseRequest = function (request, options) 
	{
		var protoIndex = request.indexOf("::");
		var protoc = null;
		var uri = request;
		var store = null;
		var subprotocole = null;
		if(protoIndex > -1)
		{
			protoc = request.substring(0,protoIndex);
			var subprotoc = protoc.split(".");
			if(subprotoc.length > 1)
			{
				protoc = subprotoc.shift();
				subprotocole = subprotoc.join(".");
			}
			uri = request.substring(protoIndex+2);
		}
		
		var queryThis = false;
		if(request[0] == '#' || protoc == "first" || protoc == "last" || protoc == "this")
		{
			store = deep.protocoles.queryThis;
			queryThis = true;
		}
		else if(!protoc)
		{
			//console.log("no protocole : try extension");
			deep.extensions.some(function(storez){
				if(!storez.extensions)
					return;
				for(var j = 0; j < storez.extensions.length; ++j)
				{
					var extension = storez.extensions[j];
					if(uri.match(extension))
					{
						store = storez.store;
						break;
					}
				}
				if(store)
					return true;
				return false;
			});	
		}
		else
		{
			store = deep.protocoles.store(protoc);
		}
		//console.log("store : ", store)
		var res = {
			_deep_request_:true,
			request:request,
			queryThis:queryThis,
			store:store,
			protocole:protoc,
			subprotocole:subprotocole,
			uri:uri
		};
		//console.log("deep.parseRequest : results : ", res);
		return res;
	};

	/**
	 * retrieve an array of retrievable strings (e.g. "json::test.json")
	 * if request is not a string : will just return request
	 * @for deep
	 * @static 
	 * @method getAll
	 * @param  {String} requests a array of strings to retrieve
	 * @param  {Object} options (optional)
	 * @return {deep.Chain} a handler that hold result 
	 */
	deep.getAll = function  (requests, options)
	{
		var alls = [];
		requests.forEach(function (request) {
			//console.log("get all : ", request, options);
			alls.push(deep.get(request,options));
		});
		return deep.all(alls);
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
	 * @return {deep.Chain} a handler that hold result 
	 */
	deep.get = function  (request, options)
	{
		if(!request)
			return request;
		if(typeof request !== "string" && !request._deep_request_)
			return request;
		options = options || {};
		var infos = request;
		if(typeof infos === 'string')
			infos = deep.parseRequest(request, options);
		var res = null;
		//console.log("deep.get : infos : ", infos);
		if(!infos.store)
			if(!infos.protocole)
				return request;
			else
				return deep.errors.Store("no store found with : "+request, infos);
		else if(infos.subprotocole)
		{
			//console.log("deep.get with subprotocole : ", infos.subprotocole)
			var type = typeof infos.store;
			if(infos.store._deep_ocm_)
			{
				var o = infos.store();
				if(typeof o[infos.subprotocole] === 'object')
					res = deep.query(o[infos.subprotocole],infos.uri, options);
				else
				{
					//console.log("get with subprotoc: ",infos, infos.subprotocole);
					o = o.store(infos.subprotocole);
					if(!o)
						return deep.errors.Store("no store found with : "+request, infos);
					//console.log("store getted : ",o);
					res = o.get(infos.uri, options);
				}
			}
			else if(typeof infos.store[infos.subprotocole] === 'function')
				res = infos.store[infos.subprotocole](infos.uri, options);
			else if(typeof infos.store[infos.subprotocole] === 'object')
			{
				if(infos.store[infos.subprotocole].get)
					res = infos.store[infos.subprotocole].get(infos.uri, options);
				else
					res = deep.query(infos.store[infos.subprotocole],infos.uri, options);
			}
		}
		else
		{
			var type = typeof infos.store;
			if(typeof infos.store.get === 'function')
				res = infos.store.get(infos.uri, options);
			else if(type === 'function')
				res = infos.store(infos, options);
			else
				return deep.errors.Store("no store found with : "+request, infos);
		}

		if(options.wrap)
			return deep.when(res)
			.done(function(res){
				if(options.wrap.result)
				{
					if(typeof options.wrap.result.push === 'function')
						options.wrap.result.push(res);
					else
						options.wrap.result = [].concat(options.wrap.result);
				}
				else
					options.wrap.result = res;
				return options.wrap;
			});
		return res;
	};


	deep.protocoles = {
		/**
		 * options must contain the entry from where start query
		 * @param  {[type]} request [description]
		 * @param  {[type]} options [description]
		 * @return {[type]}         [description]
		 */
		queryThis:function (request, options) 
		{
			//console.log("deep.stores.queryThis : ", request, options)
			var entry = options.entry;
			var root = entry.root;

			var infos = request;
			if(typeof infos === 'string')
				infos = deep.parseRequest(infos);
			if(infos.uri[0] == '#')
				infos.uri = infos.uri.substring(1);
			var res = null;
			if(infos.uri.substring(0,3) == "../")
			{
				infos.uri = ((entry.path != "/")?(entry.path+"/"):"")+infos.uri;
				//console.log("queryThis with ../ start : ",infos.uri)
				res = deep.query(root || entry, infos.uri, { keepCache:false });
			}
			else if(infos.uri[0] == '/')
				res = deep.query(root || entry, infos.uri, { keepCache:false });
			else
				res = deep.query(entry, infos.uri, { keepCache:false });
			
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
		},
		store:function(path, options)
		{
			//console.log("deep.protocoles.store : ", path, options);
			if(typeof path === 'object')
				path = path.uri;
			if(deep.protocoles[path])
				return deep.protocoles[path];
			var splitted = path.split(".");
			if(splitted.length > 1)
			{
				var proto = deep.protocoles[splitted.shift()];
				//console.log("deep.protocoles.store start with : ",proto);
				while(proto && splitted.length > 0)
				{
					if(proto._deep_ocm_)
					{
						var p = proto();
						//console.log("deep.protocoles.store : got ocm : ",p)
						var rest = splitted.join(".");
						//console.log("deep.protocoles.store : ocm rest : ",rest)
						proto = p[rest]
						if(!proto)
							proto = p.store(rest, true);
						splitted = [];
						//console.log("proto.store give : ",proto);
						break;
					}
					//console.log("_____")
					proto = deep.protocoles[splitted.shift()];
				}
				//console.log("final proto : ", proto, splitted);
				if(!proto || splitted.length > 0)
					return deep.errors.Protocole("no protocole found with : "+path);
				return proto;
			}
			return null;
		},
		js:function (path, options) {
			if(typeof path === 'object')
				path = path.uri;
			var def = deep.Deferred();
			try{
				require([path], function(obj){
					def.resolve(obj);
				}, function(err){
					//console.log("require get error : ", err);
					def.reject(err);
				});
			}
			catch(e)
			{
				//console.log("require get errors catched : ", e);
				def.reject(e);
			}
			return def.promise();
		},
		aspect:function(path, options){
			return deep.protocoles.js(path, options)
			.done(function(res){
				return res.aspect;
			});
		},
		instance:function (path, options) {
			return deep.protocoles.js(path, options)
			.done(function(cl){
				if(typeof cl === 'function' && cl.prototype)
					return new cl();
				//console.log("deep.stores.instance  : could not instanciate : "+JSON.stringify(id));
				return new Error("deep.protocoles.instance  : could not instanciate : "+JSON.stringify(id));
			});
		}
	}


	deep.Chain.addHandle("store", function(name)
	{
		var self = this;
		var func = function(s,e){
			//console.log("deep.Chain.store : ", name);
			if(typeof name === 'string')
			{
				self._storeName = name;
				self._store = null;
			}
			else{
				self._storeName = name.name;
				self._store = name;
			}	
			deep.chain.position(self, self._storeName);
		}
		deep.handlers.decorations.store({
			get:function (argument) {},
			patch:function (argument) {},
			put:function (argument) {},
			post:function (argument) {	},
			del:function (argument) {	},
			range:function (argument) {	},
			rpc:function (argument) {},
			bulk:function (argument) {}
		}, self);
		func._isDone_ = true;
		addInChain.apply(self,[func]);
		return this;
	});



	deep.handlers.decorations.store = function (store, handler) {
			//console.log("store decoration");
			deep.utils.up({
				//_store : deep.collider.replace(store),
				get : function (id, options)
				{
					var self = this;
					if(id == "?" || !id)
						id = "";
					var func = function (s,e) {
						var store = self._store || deep.protocoles.store(self._storeName);
						if(store instanceof Error)
							return store;
						if(!store)
							return deep.errors.Store("no store declared in chain. aborting GET !");
						if(!store.get)
							return deep.errors.Store("provided store doesn't have GET. aborting GET !");
						return deep.when(store.get(id, options))
						.done(function (success) {
							//console.log("deep(...).store : get : success : ", success);
							self._nodes = [deep.Querier.createRootNode( success, null, {uri:id})]
						});
					};
					deep.chain.addInChain.apply(this,[func]);
					self.range = deep.Chain.range;
					return self;
				},
				post : function (object, id, options)
				{
					var self = this;
					var func = function (s,e)
					{
						var store = self._store || deep.protocoles.store(self._storeName);
						if(store instanceof Error)
							return store;
						if(!store)
							return deep.errors.Store("no store declared in chain. aborting POST !");
						if(!store.post)
							return deep.errors.Store("provided store doesn't have POST. aborting POST !");
						//console.log("deep.Chain.post : got store : ",store);
						return deep.when(store.post(object || deep.chain.val(self),id, options))
						.done(function (success) {
							self._nodes = [deep.Querier.createRootNode(success)];
						});
					};
					self.range = deep.Chain.range;
					deep.chain.addInChain.apply(this,[func]);
					return self;
				},
				put :function (object, options)
				{
					var self = this;
					//console.log("deep.chain.put : add in chain : ", object, id);
					var func = function (s,e) {
						var store = self._store || deep.protocoles.store(self._storeName);
						if(store instanceof Error)
							return store;
						if(!store)
							return deep.errors.Store("no store declared in chain. aborting PUT !");
						if(!store.put)
							return deep.errors.Store("provided store doesn't have PUT. aborting PUT !");
						return deep.when(store.put(object  || deep.chain.val(self), options))
						.done(function (success) {
							self._nodes = [deep.Querier.createRootNode(success)];
						});
					};
					self.range = deep.Chain.range;
					deep.chain.addInChain.apply(this,[func]);
					return self;
				},
				patch :function (object, id, options)
				{
					var self = this;
					var func = function (s,e) 
					{
						var store = self._store || deep.protocoles.store(self._storeName);
						if(store instanceof Error)
							return store;
						if(!store)
							return deep.errors.Store("no store declared in chain. aborting PATCH !");
						if(!store.patch)
							return deep.errors.Store("provided store doesn't have PATCH. aborting PATCH !");
						return deep.when(store.patch(object  || deep.chain.val(self),id, options))
						.done(function (success) {
							self._nodes = [deep.Querier.createRootNode(success)];
						});
					};
					self.range = deep.Chain.range;
					deep.chain.addInChain.apply(this,[func]);
					return self;
				},
				del : function (id, options) 
				{
					var self = this;
					var func = function (s,e) 
					{
						var store = self._store || deep.protocoles.store(self._storeName);
						if(store instanceof Error)
							return store;
						if(!store)
							return deep.errors.Store("no store declared in chain. aborting DELETE !");
						if(!store.del)
							return deep.errors.Store("provided store doesn't have DEL. aborting DELETE !");
						var val = deep.chain.val(self);
						return deep.when(store.del(id || val.id, options))
						.done(function (success) {
							self._nodes = [deep.Querier.createRootNode(success)];
						});
					};
					self.range = deep.Chain.range;
					deep.chain.addInChain.apply(this,[func]);
					return self;
				},
				rpc : function (method, body, uri, options)
				{
					var self = this;
					var func = function (s,e) {
						var store = self._store || deep.protocoles.store(self._storeName);
						if(store instanceof Error)
							return store;
						if(!store)
							return deep.errors.Store("no store declared in chain. aborting RPC !");
						if(!store.rpc)
							return deep.errors.Store("provided store doesn't have RPC. aborting RPC !");
						return deep.when(store.rpc(method, body, uri, options))
						.done(function (success) {
							self._nodes = [deep.Querier.createRootNode(success)];
						});
					};
					self.range = deep.Chain.range;
					deep.chain.addInChain.apply(this,[func]);
					return self;
				},
				range :function (arg1, arg2, uri, options)
				{
					var self = this;
					var func = function (s,e) {
						var store = self._store || deep.protocoles.store(self._storeName);
						if(store instanceof Error)
							return store;
						if(!store)
							return deep.errors.Store("no store declared in chain. aborting RANGE !");
						if(!store.range)
							return deep.errors.Store("provided store doesn't have RANGE. aborting RANGE !");
						return deep.when(store.range(arg1, arg2, uri, options))
						.done(function (success) {
							self._nodes = [deep.Querier.createRootNode(success)];
						});
					};
					self.range = deep.Chain.range;
					deep.chain.addInChain.apply(this,[func]);
					return self;
				},
				bulk : function (arr, uri, options) 
				{
					var self = this;
					var func = function (s,e) {
						var store = self._store || deep.protocoles.store(self._storeName);
						if(store instanceof Error)
							return store;
						if(!store)
							return deep.errors.Store("no store declared in chain. aborting BULK !");
						if(!store.bulk)
							return deep.errors.Store("provided store doesn't have BULK. aborting BULK !");
						return deep.when(store.bulk(arr, uri, options))
						.done(function (success) {
							self._nodes = [deep.Querier.createRootNode(success)];
						});
					};
					self.range = deep.Chain.range;
					deep.chain.addInChain.apply(this,[func]);
					return self;
				}
			}, handler);
			return handler;
		};
	//________________________________________________________________________ OCM for the mass !!!
	/**
	 * OCM for the mass !! 
	 * return an Object Capabilities Manager
	 * @param  {String} protocoleName the protocole associated with this manager
	 * @return {deep.OCM} an Object Capabilities Manager
	 */
	deep.ocm = function(protocoleName)
	{
		var params = {
			currentModes:null,
			stores:{},
			objects:{},
			compiled:{},
			compileModes:function(modes, layer)
			{
				//console.log("compil modes : ",modes);
				var res = {};
				modes.forEach(function (m) {
					var r = layer[m];
					if(r)
						deep.utils.up(r, res);
				});
				return res;
			}
		};
		var m = function()
		{
			var modes = Array.prototype.slice.apply(arguments);
			if(modes.length === 0 || params.blocked)
				if(params.currentModes && params.currentModes.length > 0)
					modes = params.currentModes;
				else if ( deep.context.mode && deep.context.mode.length > 0 )
					modes = deep.context.mode;
				else 
					throw deep.errors.OCM("You need to set a mode before using ocm objects");
			var joined = modes.join(".");
			if(params.compiled[joined])
				return params.compiled[joined];
			var obj = {};
			if(!deep.ocm.nocache)
				params.compiled[joined] = obj;
			// compile stores	
			var storesLayer = params.compileModes(modes, params.stores)
			obj.store =  function(storeName, direct)
			{
				if(storesLayer[storeName])
					if(direct)
						return storesLayer[storeName];
					else
						return deep.store(storesLayer[storeName]);
				return deep(deep.errors.Store("no stores found with : "+joined));
			}
			// compile objects
			for(var i in params.objects)
			{
				var compiledLayer = params.compileModes(modes, params.objects[i])
				obj[i] = compiledLayer;
			}
			return obj;
		}
		deep.ocm.instances.push(m);
		m.name = protocoleName;
		deep.protocoles[protocoleName] = m;
		m.add = function (name, protocole, layer) 
		{
			if(params.blocked)
				return m;
			if(!layer)
			{
				layer = protocole;
				protocole = null;
			}
			else
				deep.protocoles[protocole] = function(path, options)
				{
					if(typeof path === 'object')
						path = path.uri;
					return deep.query(m()[name], path, options);
				}
			params.objects[name] = layer;
			return m;
		};
		m.flatten = function () {
			if(params.blocked)
				return deep.when(null);
			var alls = [];
			deep(params.stores).pushHandlerTo(alls).flatten();
			for(var i in params.objects)
				deep(params.objects[i]).pushHandlerTo(alls).flatten();
			return deep.all(alls);
		}
		m.stores = function(){
			if(params.blocked)
				return null;
			return deep(params.stores);
		};
		m.object = function(name){
			if(params.blocked)
				return null;
			return deep(params.objects[name]);
		};
		m._deep_ocm_ = true;
		m.mode = function (arg) {
			if(params.blocked)
				return m();
			if(arg == null)
				params.currentModes = null;
			else
				params.currentModes = Array.prototype.slice.apply(arguments);
			return m();
		};
		m.block = function(key){
			params.block = true;
			m.unblock = function(ukey){
				if(ukey === key)
					params.blocked = false;
			}
		};
		m.unblock = function(key){}
		return m;
	}
	deep.ocm.instances = [];
	deep.ocm.nocache = false;
	// deep mode management
	deep.mode = function(args){
		return deep({}).mode((args)?Array.prototype.slice.apply(arguments):null);
	}
	deep.Chain.addHandle("mode", function(arg)
	{
		var self = this;
		var args = arguments;
		var func = function(s,e)
		{
			deep.context = self.context = deep.utils.simpleCopy(deep.context);
			if(arg instanceof Array)
				deep.context.mode = arg;
			else
				deep.context.mode = (arg)?Array.prototype.slice.apply(args):null;
		}
		func._isDone_ = true;
		addInChain.apply(self,[func]);
		return this;
	});
	deep.generalMode = function(){
		deep.context = deep.utils.simpleCopy(deep.context);
		deep.context.mode = Array.prototype.slice.apply(arguments);
	}
	//_________________________________________________
	//
	deep.Chain.addHandle("logState", function()
	{
		var self = this;
		var func = function(s,e)
		{
			if(e)
				console.log("deep.Chain state : ERROR : ", JSON.stringify(e, null, ' '));
			else
				console.log("deep.Chain state : SUCCESS : ", JSON.stringify(s, null, ' '));
		}
		addInChain.apply(self,[func]);
		return this;
	});
		//
	deep.Chain.addHandle("nodes", function(callBack)
	{
		var self = this;
		var func = function(s,e)
		{
			return callBack(deep.chain.nodes(self));
		}
		if(callBack)
			addInChain.apply(self,[func]);
		else
			return deep.chain.nodes(self);
		return this;
	});
	//_________________________________________________________________________________
	return deep;
});



