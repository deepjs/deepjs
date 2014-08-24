/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */

if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "./utils", "./errors"], function (require, utils, errors) {
	var promise = {};

	promise.Undefined = {
		_deep_undefined_: true
	};

	/**
	 * return a promise that will be fullfilled when arg are ready (resolve or immediat)
	 * @for deep
	 * @static
	 * @method when
	 * @param  {Object} arg an object to waiting for
	 * @return {deep.Promise} a promise
	 */
	promise.when = function(arg) {
		//console.log("deep.when : ", arg)
		if (!arg || (!arg.promise && !arg.then))
			return new promise.Promise().resolve(arg);
		//if (arg._deep_promise_)
		//    return arg;
		if (arg._deep_deferred_)
			return arg.promise();
		if (typeof arg.then === 'function') //any promise compliant object
		{
			//console.log("doing simple promise (no promise and then is present) on : ", arg);
			var p = new promise.Promise();
			arg.then(function(s) {
				p.resolve(s);
			}, function(e) {
				p.reject(e);
			});
			return p;
		}
		if (typeof arg.promise === "function") // jquery deferred case
			return arg.promise();
		if (typeof arg.promise === 'object')
			return arg.promise;
		return new promise.Promise().resolve(arg);
	};
	promise.when.immediate = function(result) {
		return new promise.Promise().resolve(result);
	};

	/**
	 * return a promise that will be fullfilled when all args are ready (resolve or immediat)
	 * @for deep
	 * @static
	 * @method all
	 * @param  {Object} arg an array of objects to waiting for
	 * @return {deep.Promise} a promise
	 */
	promise.all = function(arr) {
		if(arguments.length > 1)
			arr = deep.utils.argToArr(arguments);
		if (arr.length === 0)
			return promise.when.immediate([]);
		var def = promise.Deferred();
		var count = arr.length;
		var c = 0,
			d = -1;
		var res = [], async;
		arr.every(function(a) {
			if (def.rejected)
				return false;
			var i = d + 1;
			if (!a || !a.then) {
				if (a instanceof Error) {
					if (!def.rejected && !def.resolved && !def.canceled)
						def.reject(a);
					return false;
				}
				res[i] = a;
				c++;
				if (c == count)
					def.resolve(res);
			} else
			{
				async = true;
				a.then(function(r) {
					res[i] = r;
					c++;
					if (c == count)
						def.resolve(res);
				}, function(error) {
					if (!def.rejected && !def.resolved && !def.canceled)
						def.reject(error);
				});
			}
			d++;
			return true
		});
		if(!async)
			return deep.when.immediate(res);
		return def.promise();
	};

	//_____________________________________________________________________ PROMISED CHAIN MECANIC

	var addInChain = utils.addInChain = function(handle) {
		this._state.queue.push(handle);
		if (this._initialised && !this._running && !this._executing)
			this._next();
		return this;
	};

	var next = function forceChainHandle() {
		if (!this._initialised || this._paused)
			return;
		var self = this;

		var asynchChainDone = function(res) {
			if (typeof res !== 'undefined') {
				if (res instanceof Error) {
					self._state.success = null;
					self._state.error = res;
				} else {
					if (res && res._deep_undefined_)
						res = undefined;
					self._state.success = res;
					self._state.error = null;
				}
			}
			self._running = false; // asynch flag
			if (!self._executing) // real asynch event
				self._next();
		};

		var asynchChainFail = function(e) {
			self._running = false; // asynch flag
			self._state.success = null;
			self._state.error = e;
			if (!self._executing) // real asynch event
				self._next();
		};

		if (self._state.queue.length !== 0) {
			self._executing = true; //  synch flag
			while (!self._running) // while not asynch
			{
				var previousContext = promise.Promise.context;
				try {
					var next = self._state.queue.shift();
					if (self._state.error)
						while (next && next._isDone_)
							next = self._state.queue.shift();
					else
						while (next && next._isFail_)
							next = self._state.queue.shift();
					if (!next)
						break;

					//________________________________encouter a promise in queue : was a chain stack call. launch chain.
					if (next._deep_promise_) {
						self._paused = true;
						next._context = self._context;
						next.resolve();
						break;
					}

					if (previousContext !== self._context) {
						if (previousContext && previousContext.suspend)
							previousContext.suspend();
						promise.Promise.context = self._context;
						if (self._context && self._context.resume)
							self._context.resume();
					}

					self._running = true; //  asynch flag
					self._state.oldQueue = self._state.queue;
					self._state.queue = [];
					var res = next(self._state.success, self._state.error);

					if (res === self) {
						if (self._state.oldQueue) {
							if (self._state.queue.length)
								self._state.queue = self._state.queue.concat(self._state.oldQueue);
							else
								self._state.queue = self._state.oldQueue;
							self._state.oldQueue = null;
						}
						self._running = false; //  asynch flag
						continue;
					}
					if (res && (res.then || res.promise)) {
						if (res._deep_promise_ || res._deep_chain_)
							res.done(asynchChainDone).fail(asynchChainFail);
						else
							promise.when(res).done(asynchChainDone).fail(asynchChainFail);
					} else {
						self._running = false;
						if (typeof res !== 'undefined') {
							if (res && res._deep_undefined_)
								res = undefined;
							var isError = res instanceof Error;
							self._state.success = (isError) ? null : res;
							self._state.error = (isError) ? res : null;
						}
					}
				} catch (e) {
					if (self._context.debug)
						utils.dumpError(e);
					if (self._context.rethrow)
						throw e;
					self._state.success = null;
					self._state.error = e;
					self._running = false; // async flag
				} finally {
					if (previousContext !== self._context) {
						if (self._context && self._context.suspend)
							self._context.suspend();
						if (previousContext && previousContext.resume)
							previousContext.resume();
						promise.Promise.context = previousContext;
					}
					if (self._state.oldQueue) {
						if (self._state.queue.length)
							self._state.queue = self._state.queue.concat(self._state.oldQueue);
						else
							self._state.queue = self._state.oldQueue;
						self._state.oldQueue = null;
					}
				}
			}
			self._executing = false;
		}
		// else
		//     console.log('________________________ STOP becaus empty queue');
	};

	//_____________________________________________________________________ DEFERRED

	/**
	 * A deep implementation of Deferred object (see promise on web)
	 * @class deep.Deferred
	 * @constructor
	 */
	promise.Deferred = function deepDeferred() {
		if (!(this instanceof promise.Deferred))
			return new promise.Deferred();
		this._promises = [];
		this._deep_deferred_ = true;
		return this;
	};

	promise.Deferred.prototype = {
		_deep_deferred_: true,
		_promises: null,
		rejected: false,
		resolved: false,
		canceled: false,
		_success: null,
		_error: null,
		ended: function() {
			return this.rejected || this.resolved || this.canceled;
		},
		/**
		 * resolve the Deferred and so the associated promise
		 * @method resolve
		 * @param  {Object} argument the resolved object injected in promise
		 * @return {deep.Deferred} this
		 */
		resolve: function(argument) {
			//console.log("deep.Deferred.resolve : ", argument);
			if (this.rejected || this.resolved || this.canceled)
				throw new Error("DeepDeferred (resolve) has already been ended ! could not recolve anymore.");
			if (argument instanceof Error)
				return this.reject(argument);
			this._success = argument;
			this.resolved = true;
			var self = this;
			this._promises.forEach(function(promise) {
				promise.resolve(argument);
			});
		},
		/**
		 * reject the Deferred and so the associated promise
		 * @method reject
		 * @param  {Object} argument the rejected object injected in promise
		 * @return {deep.Deferred} this
		 */
		reject: function(argument) {
			//  console.log("DeepDeferred.reject");
			if (this.rejected || this.resolved || this.canceled)
				throw new Error("DeepDeferred has already been ended ! could not reject anymore.");
			this._error = argument;
			this.rejected = true;
			var self = this;
			this._promises.forEach(function(promise) {
				promise.reject(argument);
			});
		},
		/**
		 * return a promise for this deferred
		 * @method promise
		 * @return {deep.Promise}
		 */
		promise: function() {
			var prom = new Promise();
			//console.log("deep2.Deffered.promise : ", prom, " r,r,c : ", this.rejected, this.resolved, this.canceled)
			if (this.resolved)
				return prom.resolve(this._success);
			if (this.rejected)
				return prom.reject(this._error);
			this._promises.push(prom);
			return prom;
		}
	};

	var Promise = promise.Promise = function(state, options) {
		state = state || {};

		this._context = promise.Promise.context;

		this._state = state || {};

		this._state.success = state.success || undefined;
		this._state.error = state.error || null;

		this._state.queue = this._state.queue ||  [];
		this._state.oldQueue = this._state.oldQueue || null;
		this._state.handlers = state.handlers ||  [];
		this._state.handlers.push(this);

		this._running = false;
		this._executing = false;
		this._initialised = false;
		this._identity = promise.Promise;
		for(var i in Promise.API)
			this[i] = Promise.API[i];
		//this._id = Date.now().valueOf();
		//console.log('PROMISE CONSTRUCTOR DONE');
	};

	Promise.API = {};

	promise.Promise.prototype = {
		_locals: undefined,
		_deep_promise_: true,
		_enqueue: addInChain,
		_next: next,
		_running: false,
		_executing: false,
		_initialised: false,
		resolve: function(success) {
			//console.log("resolve : ", opt, this._id);
			this._paused = false;
			this._initialised = true;
			if(typeof success !== "undefined")
				this._state.success = success;
			this._state.error = (this._state.success instanceof Error) ? this._state.success : this._state.error;
			this._state.success = (this._state.success instanceof Error) ? null : this._state.success;
			this._next();
			//console.log("_start : end ", opt, this._id);
			return this;
		},
		reject: function(error) {
			//console.log("reject : ", opt, this._id);
			this._paused = false;
			this._initialised = true;
			this._state.error = error;
			this._next();
			//console.log("_start : end ", opt, this._id);
			return this;
		}/*,
		_start: function(opt) {
			//console.log("_start : ", opt, this._id);
			if (opt)
				for (var i in opt)
					this._state[i] = opt[i];
			this._paused = false;
			this._initialised = true;
			this._state.error = (this._state.success instanceof Error) ? this._state.success : this._state.error;
			this._state.success = (this._state.success instanceof Error) ? null : this._state.success;
			this._next();
			//console.log("_start : end ", opt, this._id);
			return this;
		}*/,
		_forward: function(clone) {
			return {
				handlers: (clone ? this._state.handlers.slice() : this._state.handlers),
				queue: ((clone && this._state.queue) ? this._state.queue.slice() : []),
				oldQueue: ((clone && this._state.oldQueue) ? this._state.oldQueue.slice() : null),
				success: this._state.success,
				error: this._state.error
			};
		},
		close: function() {
			var self = this;
			if (this._state.handlers.length == 1)
				return this;
			this._state.handlers.pop();
			return this._state.handlers[this._state.handlers.length - 1]; //._start();
		},
		clone: function() {
			var opt = this._forward(true);
			var handler = new this._identity(opt);
			handler._initialised = true;
			return handler;
		},
		catchError: function(arg) {
			var self = this;
			var func = function(s, e) {
				self.toContext("rethrow", arg ? true : false);
			};
			return self._enqueue(func);
		},
		pushTo: function(array) {
			var self = this;
			if (self._initialised) {
				var func = function(s, e) {
					array.push(self);
				};
				self._enqueue(func);
			} else
				array.push(self);
			return this;
		},
		done: function(callBack) {
			if(arguments.length !== 1)
				throw new Error("done has weirds args : ", arguments);
			if (!callBack)
				return this._state.success;
			var self = this;
			var func = function(s, e) {
				//console.log("deep.done : ",s,e)
				//self._state.oldQueue = self._state.queue;
				//self._state.queue = [];
				var a = callBack.call(self, s);
				if (a === self)
					return;
				return a;
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},
		fail: function(callBack) {
			if(arguments.length !== 1)
				throw new Error("fail has weirds args : ", arguments);
			if (!callBack)
				return this._state.error;
			var self = this;
			var func = function(s, e) {
				//self._state.oldQueue = self._state.queue;
				//self._state.queue = [];
				var a = callBack.call(self, e);
				if (a === self)
					return;
				return a;
			};
			func._isFail_ = true;
			return self._enqueue(func);
		},
		always: function(callBack) {
			if(arguments.length !== 1)
				throw new Error("always has weirds args : ", arguments);
			var self = this;
			var func = function(s, e) {
				//self._state.oldQueue = self._state.queue;
				//self._state.queue = [];
				var a = callBack.call(self, s, e);
				if (a === self)
					return;
				return a;
			};
			return self._enqueue(func);
		},
		then: function(successCallBack, errorCallBack) {
			var self = this;
			var func = null;
			if (successCallBack) {
				func = function(s, e) {
					var a = successCallBack.call(self, s);
					if (a === self)
						return;
					return a;
				};
				func._isDone_ = true;
				self._enqueue(func);
			}
			if (errorCallBack) {
				func = function(s, e) {
					var a = errorCallBack.call(self, e);
					if (a === self)
						return;
					return a;
				};
				func._isFail_ = true;
				self._enqueue(func);
			}
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
		log: function() {
			var self = this;
			var args = Array.prototype.slice.call(arguments);
			var func = function(s, e) {
				if (e)
					return deep.nodes.elog(args, s, e);
				return deep.nodes.slog(args, s, e);
			};
			return self._enqueue(func);
		},
		// __________________________________________________ LOG
		/**
		 *
		 * log any chain errors
		 *
		 * @method  log
		 * @return {deep.Chain} this
		 * @chainable
		 */
		elog: function() {
			var self = this;
			var args = Array.prototype.slice.call(arguments);
			var func = function(s, e) {
				return deep.nodes.elog(args, s, e);
			};
			func._isFail_ = true;
			return self._enqueue(func);
		},
		/**
		 *
		 * log any chain errors
		 *
		 * @method  log
		 * @return {deep.Chain} this
		 * @chainable
		 */
		slog: function() {
			var self = this;
			var args = Array.prototype.slice.call(arguments);
			var func = function(s, e) {
				return deep.nodes.slog(args, s, e);
			};
			func._isDone_ = true;
			return self._enqueue(func);
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
		delay: function(ms, callback) {
			var self = this;
			var func = function(s, e) {
				var time;
				if (deep.counter) {
					deep.counter.delayAsked = (deep.counter.delayAsked ||  0) + ms;
					deep.counter.delayCount = (deep.counter.delayCount ||  0) + 1;
					time = Date.now().valueOf();
				}
				//console.log("deep.delay : ", ms);
				var def = promise.Deferred();
				setTimeout(function() {
					if (deep.counter) {
						var end = Date.now().valueOf() - time;
						deep.counter.totalDelay = (deep.counter.totalDelay ||  0) + end;
						//console.log("deep.delay.end : ", ms, end);
					}
					def.resolve(undefined);
				}, ms);
				var p = def.promise();
				if (callback)
					p.done(function() {
						return callback(s);
					});
				return p;
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},

		/**
		 * set key/value in current state
		 *
		 * @chainable
		 * @method context
		 * @param  {String} key
		 * @param  {*} value
		 * @return {deep.Chain} this
		 */
		toState: function(key, val) {
			var self = this;
			var create = function(s, e) {
				if (!key)
					return deep.errors.Internal(".toState need key/val couple.");
				val = (typeof val === 'undefined') ? s : val;
				self._state[key] = val;
				return val;
			};
			create._isDone_ = true;
			return self._enqueue(create);
		},
		/**
		 * read key/value in current state
		 *
		 * @chainable
		 * @method state
		 * @param  {String} key
		 * @param  {*} value
		 * @return {deep.Chain} this
		 */
		fromState: function(key) {
			var self = this;
			var func = function(s, e) {
				if (!key)
					return self._state;
				var out = self._state[key];
				return (typeof out === 'undefined') ? deep.Undefined : out;
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},

		/**
		 * set key/value in current deep.context
		 *
		 * @chainable
		 * @method context
		 * @param  {String} key
		 * @param  {*} value
		 * @return {deep.Chain} this
		 */
		toContext: function(key, val) {
			var self = this;
			var func = function(s, e) {
				if (!key)
					return deep.errors.Internal(".toContext need key/val couple.");
				val = (typeof val === 'undefined') ? s : val;
				if (!self._contextCopied)
					deep.context = self._context = utils.shallowCopy(self._context);
				if (deep.context.protocols)
					self._context.protocols = utils.shallowCopy(self._context.protocols);
				self._contextCopied = true;
				self._context[key] = val;
				return val;
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},
		/**
		 * shallow copy current deep.context
		 *
		 * @chainable
		 * @method contextualise
		 * @return {deep.Chain} this
		 */
		contextualise: function() {
			var self = this;
			var func = function(s, e) {
				if (!self._contextCopied)
					deep.context = self._context = utils.shallowCopy(deep.context);
				if (deep.context.protocols)
					self._context.protocols = utils.shallowCopy(self._context.protocols);
				self._contextCopied = true;
				return s;
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},
		/**
		 * read key/value in current deep.context
		 *
		 * @chainable
		 * @method context
		 * @param  {String} key
		 * @param  {*} value
		 * @return {deep.Chain} this
		 */
		fromContext: function(key) {
			var self = this;
			var create = function(s, e) {
				if (!key)
					return self._context;
				var out = self._context[key];
				return (typeof out === 'undefined') ? deep.Undefined : out;
			};
			create._isDone_ = true;
			return self._enqueue(create);
		},
		/**
		 * set key/value in current deep.context
		 *
		 * @deprecated
		 * @chainable
		 * @method context
		 * @param  {String} key
		 * @param  {*} value
		 * @return {deep.Chain} this
		 */
		/*context:function (key, val) {
            var self = this;
            var create = function (s, e) {
                if(!val)
                    return self._context[key];
                if(!key)
                    return self._context;
                if(!self._contextCopied)
                    deep.context = self._context = utils.shallowCopy(self._context);
                self._contextCopied = true;
                self._context[key] = val;
            };
            create._isDone_ = true;
            return self._enqueue(create);
        },*/
		/**
		 * log current deep.context. If key is provided : log only this property.
		 *
		 * @chainable
		 * @method logContext
		 * @param  {String} key (optional)
		 * @return {deep.Chain} this
		 */
		clog: function(key) {
			var self = this;
			var func = function chainLogHandle(s, e) {
				if (key)
					console.log("deep.chain.context." + key + " : ", self._context[key]);
				else
					console.log("deep.chain.context : ", self._context);
			};
			return self._enqueue(func);
		},
		/**
		 * wait promise resolution or rejection before continuing chain
		 *
		 *  asynch
		 *  transparent false
		 *
		 * @method  when
		 * @param  {deep.when} prom the promise to waiting for
		 * @chainable
		 * @return {deep.Chain}
		 */
		when: function(prom) {
			var self = this;
			var func = function(s, e) {
				return prom;
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},

		/**
		 * set current context modes. See OCM docs and Asynch context management.
		 * @param  {String|Object} arg  if it's an object : will use it as a map. If it's a string : use it as key (need second arguments)
		 * @param  {String} arg2 (optional) the value for the key (if provided)
		 * @return {deep.Chain}        this
		 */
		modes: function(arg, arg2) {
			var self = this;
			//console.log("chain.mode : ", arg, arg2, deep.context.modes);

			if (typeof arg === 'string') {
				var obj = {};
				obj[arg] = arg2;
				arg = obj;
			}
			//console.log("chain.mode obj: ", arg);
			var func = function(s, e) {
				if (!self._contextCopied)
					deep.context = self._context = utils.simpleCopy(self._context);
				self._contextCopied = true;
				self._context.modes = utils.simpleCopy(self._context.modes) || {};
				for (var i in arg)
					self._context.modes[i] = arg[i];
				//console.log("deep.context.mode setted : ",self._context.modes);
				return s;
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},
		/**
		 * set current context roles. See OCM docs and Asynch context management.
		 * It take a list of roles as arguments. aka. .roles("role1", "role2") ....
		 * @return {deep.Chain}        this
		 */
		roles: function() {
			var self = this;
			var args = arguments;
			var func = function(s, e) {
				//self._state.oldQueue = self._state.queue;
				//self._state.queue = [];
				//console.log("Roles arguments : ", args);
				var roles = Array.prototype.slice.call(args);
				//console.log("Roles roles : ", roles);
				if (roles[0].forEach)
					roles = roles.shift();
				self.modes("roles", roles);
				return s;
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},
		//_____________________________________________________________  BRANCHES
		/**
		 * asynch handler for chain branches creation
		 *
		 * if you return the branches function (the branch creator) : the chain will wait until all the branches are done before continuing
		 *
		 *  Inject function result in chain as success or error.
		 *
		 * @example
		 *  deep().branches( function(branches)
		 *  {
		 *      branches.branch().query(...).load().log()
		 *      branches.branch().query(...).post().log();
		 *      //...
		 *      return branches;
		 *  });
		 *
		 *  // if you want to return a subset of branches promises :
		 *  // you could use prom.all([array_of_promises]) :
		 *
		 *      var branch = branches.branch().myChain()...;
		 *      //...
		 *      return prom.all([prom.when(branch), ...]);
		 *
		 * @method  branches
		 * @async
		 * @chainable
		 * @param   {Function} func the callback that will receive the brancher (see above)
		 * @return  {chains.Chain} this
		 */
		branches: function(func) {
			var self = this;
			var create = function(s, e) {
				var a = func.call(self, brancher(self));
				if (a === self)
					return;
				return a;
			};
			create._isDone_ = true;
			return self._enqueue(create);
		},
			/**
	 * deep chain identity method
	 * @param  {*} val     The value injected as success (optional).
	 *                     Could be a protocoled ressource reference (e.g. json::myfile.json).
	 *                     Will be load before injection.
	 * @param  {Object} schema  Optional : the json-schema associate
	 * @param  {Object} options Optional (internal use only for the moment)
	 * @return {deep.Chain}  a deep.Chain holding the success (or error if load fail).
	 */

		deep : function(val, schema, options) {
			options = options || {};
			var h = new deep.Chain(this._state, options);
			var self = this;
			var func = function(s, e) {
				return deep(val || s, schema, options);
			};
			func._isDone_ = true;
			this._enqueue(h);
			h._enqueue(func);
			return h;
		},
		loop:function(cb, interval, maxIteration) {
			var func = function(s, e) {
				return deep.loop(cb, interval, maxIteration, s);
			};
			func._isDone_ = true;
			return this._enqueue(func);
		}
	};
	var brancher = function(handler) {
		var self = this;
		var br = {
			branches: [],
			branch: function() {
				if (this._ended)
					throw errors.Chain("Branching failed : brancher has already bean ended. Could not add branches any more.");
				var cloned = handler.clone(true);
				this.branches.push(cloned);
				return cloned;
			},
			promise: function() {
				this._ended = true;
				return promise.all(this.branches);
			}
		};
		return br;
	};
	promise.wrapNodeAsynch = promise.wrapNodeAsync = promise.async = function(parent, cmd, args) {
		var def = promise.Deferred();
		//console.log("wrapNodeAsynch : ", typeof parent, cmd);
		var callback = function() {
			var argus = Array.prototype.slice.apply(arguments);
			var err = argus.shift();
			if (err)
				def.reject(err);
			else if (!argus.length)
				def.resolve(true);
			else if (argus.length == 1)
				def.resolve(argus[0]);
			else
				def.resolve(argus);
		};
		args.push(callback);
		if (parent) {
			if (typeof cmd === 'string')
				parent[cmd].apply(parent, args);
			else
				cmd.apply(parent, args);
		} else
			cmd.apply({}, args);
		return def.promise();
	};

	/**
	 * execute array of funcs sequencially
	 * @for deep
	 * @static
	 * @method sequence
	 * @param  {String} funcs an array of functions to execute sequentially
	 * @param  {Object} args (optional) some args to pass to first functions
	 * @return {deep.Promise} a promise
	 */
	promise.series = function(funcs, context, args) {
		if (!funcs || funcs.length === 0)
			return args;
		var current = funcs.shift();
		var def = promise.Deferred();
		context = context || {};
		var doIt = function(r) {
			promise.when(r).then(function(r) {
				if (funcs.length === 0) {
					if (typeof r === 'undefined') {
						r = args;
						if (args.length == 1)
							r = args[0];
					}
					def.resolve(r);
					return r;
				}
				if (typeof r === 'undefined')
					r = args;
				else
					r = [r];
				current = funcs.shift();
				doIt(current.apply(context, r));
			}, function(error) {
				if (!def.rejected && !def.resolved && !def.canceled)
					def.reject(error);
			});
		};
		doIt(current.apply(context, args));
		return def.promise();
	};

	/**
	 * iterate over an array of objects (could be array of promises).
	 * Execute 'done' callback  for each entry. (or 'fail' if item is error)
	 * @param  {[type]}   collection [description]
	 * @param  {Function} done       [description]
	 * @param  {[type]}   fail       [description]
	 * @return {[type]}              [description]
	 */
	promise.iterate = function(collection, done, fail) {
		var coll = collection.concat([]);
		var res = [];
		var doneAndIterate = function(s) {
			if (coll.length > 0)
				this.done(function(s) {
					res.push(s);
				})
					.when(coll.shift())
					.done(doneAndIterate);
			return done.call(this, s);
		};
		var failAndIterate = function(e) {
			if (!fail)
				return e;
			if (coll.length > 0)
				this.when(coll.shift())
					.done(doneAndIterate);
			var self = this;
			return promise.when(fail.call(this, e))
				.done(function(s) {
					if (typeof s === 'undefined' || s instanceof Error)
						return s ||  e;
					res.push(s);
					self.fail(failAndIterate);
				});
		};
		var iterator = promise.when(coll.shift())
			.done(doneAndIterate)
			.fail(failAndIterate)
			.done(function(s) {
				res.push(s);
				return res;
			});
		return iterator;
	};

	promise.wired = function(functions, args, context, done, fail) {
		//console.log("wired : ", functions, args, context, done, fail);
		var ctx = context || {};
		if (args && !args.forEach)
			args = [args];
		var coll = functions.concat([]);
		var doneAndIterate = function(s) {
			//console.log("done and wired : ",s)
			if (done)
				this.done(function(s) {
					return done.call(this, s);
				});
			if (coll.length > 0)
				this.done(function(s) {
					args = s;
					if (args && !args.forEach)
						args = [args];
					this.when(coll.shift())
						.done(doneAndIterate);
				});
			if (s._deep_query_node_)
				return s.value.apply(context || (s.ancestor) ? s.ancestor.value : {}, args);
			return s.apply(ctx, args);
		};
		var failAndIterate = function(e) {
			if (!fail)
				return e;
			if (coll.length > 0)
				this.when(coll.shift())
					.done(doneAndIterate);
			var self = this;
			return promise.when(fail.call(this, e))
				.done(function(s) {
					if (typeof s === 'undefined' || s instanceof Error)
						return s ||  e;
					args = s;
					if (args && !args.forEach)
						args = [args];
					self.fail(failAndIterate);
				});
		};
		var iterator = promise.when(coll.shift())
			.done(doneAndIterate)
			.fail(failAndIterate);
		return iterator;
	};
	return promise;
});