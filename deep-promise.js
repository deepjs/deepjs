if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(["require"], function (require){

	return function(deep)
	{
	var promise = require("./promise");
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
		this.promises = [];
		return this;
	};

	deep.Deferred.prototype = {
		_deep_deferred_:true,
		context:null,
		promises:null,
		rejected:false,
		resolved:false,
		canceled:false,
		result:null,
		failure:null,
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

			this.result = argument;
			this.resolved = true;

			this.promises.forEach(function (promise) {
				promise.result = argument;
				promise.running = false;
				promise.resolved = true;
				nextPromiseHandler.apply(promise, [argument, null]);
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

			this.failure = argument;
			this.rejected = true;

			this.promises.forEach(function (promise) 
			{
				promise.failure = argument;
				promise.rejected = true;
				promise.running = false;
				nextPromiseHandler.apply(promise, [null, argument]);
			});
		},
		/**
		 * cancel the Deferred and so the associated promise
		 * @method cancel
		 * @param  {Object} reason the cancel reason object injected in promise
		 * @return {deep.Deferred} this
		 */
		cancel:function cancel(reason)
		{
			//console.log("DeepDeferred.cancel");
			if(this.rejected || this.resolved || this.canceled)
				throw new Error("DeepDeferred (cancel) has already been canceled !");
			this.canceled =  true;
			this.promises.forEach(function (promise) {
				this.promise.canceled = true;
				this.promise.cancel();
			})
		},

		/**
		 * return a promise for this deferred
		 * @method promise
		 * @return {deep.Promise}
		 */
		promise:function defPromise() {
			var prom = new deep.Promise();
			if(this.resolved || this.rejected || this.canceled)
			{
				prom.rejected = this.rejected;
				prom.resolved = this.resolved;
				prom.canceled = this.canceled;
				prom.failure = this.failure;
				prom.result = this.result;
				prom.running = false;
				return prom;
			}
			this.promises.push(prom);
			return prom;
		}
	};
	//________________________________________________________ PROMISES
	/**
	 * a deep implementation of Promise (see web for Promise) 
	 * @namespace deep
	 * @class Promise
	 * @constructor
	 */
	deep.Promise = function ()
	{
		this.running = true;
		this.context = deep.context;
		this.queue = [];
		this._deep_promise_ = true;
	};
	deep.Promise.prototype = {
		_deep_promise_:true,
		rejected:false,
		resolved:false,
		canceled:false,
		synch:false,
		result:null,
		failure:null,
		context:null,
		/**
		 * add .done callback handler in promise chain
		 * @method done
		 * @param  {Function} argument successHandler
		 * @return {deep.Deferred} this
		 */
		done:function done(callBack)
		{
			//console.log("add done in defInterface : ", this.rejected, this.resolved, this.running)
			var self = this;
			var	func = function runPromiseDone(s,e)
			{
				//console.log("deep.promise.done : ",s,e)
				if(e || !callBack || s instanceof Error)
				{
					//console.log("deep.promise.done : but error : ",e)
					forceNextPromiseHandler(self, s, e);
					return;
				}
				var r = callBack(s);
				if(r && (r instanceof deep.Chain || r._isBRANCHES_ || r.promise))
					r = deep.promise(r);
				if(r && typeof r.then === 'function')
					r.then(function (argument)
					{
						if(typeof argument === 'undefined')
							argument = s;
						forceNextPromiseHandler(self, (argument instanceof Error)?null:argument, (argument instanceof Error)?argument:null);
					}, function (error) {
						forceNextPromiseHandler(self, null, error);
					});
				else if(typeof r === 'undefined')
					forceNextPromiseHandler(self, s, e);
				else if(r instanceof Error)
					forceNextPromiseHandler(self, null, r);
				else
					forceNextPromiseHandler(self, r, null);
			};
			func._deep_done_ = true;
			this.queue.push(func);
			if((this.resolved || this.rejected))
				nextPromiseHandler.apply(this);
			return self;
		},
		/**
		 * add .fail callback handler in promise chain
		 * @method fail
		 * @param  {Function} argument successHandler
		 * @return {deep.Deferred} this
		 */
		fail:function fail(callBack)
		{
			var self = this;
			//console.log("add fail in defInterface")
			var func = function runPromiseFail(s,e)
			{
				//console.log("deep.promise.fail : ",s,e)
				if((e === null || typeof e === 'undefined') || !callBack)
				{
					forceNextPromiseHandler(self, s, null);
					return;
				}
				var r = callBack(e);
				if(r && (r instanceof deep.Chain || r._isBRANCHES_ || r.promise))
					r = deep.when(r);
				if(r && typeof r.then === 'function')
					r.then(function (argument)
					{
						if(typeof argument === 'undefined')
							forceNextPromiseHandler(self, null, e);
						else if(argument instanceof Error)
							forceNextPromiseHandler(self, null, argument);
						else
							forceNextPromiseHandler(self, argument, null);
					},function (error) {
						forceNextPromiseHandler(self, null, error);
					});
				else if(typeof r === 'undefined')
					forceNextPromiseHandler(self, null, e);
				else if(r instanceof Error)
					forceNextPromiseHandler(self, null, r);
				else
					forceNextPromiseHandler(self, r, null);
			};
			func._deep_fail_ = true;
			this.queue.push(func);
			if((this.resolved || this.rejected))
				nextPromiseHandler.apply(this);
			return self;
		},
		/**
		 * add .done and .fail in promise chain.
		 * @method then
		 * @param  {Function} sc successHandler
		 * @param  {Function} ec errorhandler
		 * @return {deep.Deferred} this
		 */
		then:function then(successCallBack, errorCallBack)
		{
			var self = this;
			if(successCallBack)
				this.done(successCallBack);
			if(errorCallBack)
				this.fail(errorCallBack);
			if((this.resolved || this.rejected))
				nextPromiseHandler.apply(this);
			return self;
		},
		/**
		 * @method cancel
		 * @return {[type]}
		 */
		cancel:function(){
			console.warning("promise cancelation not yet implemented");
		}
	};
	function nextPromiseHandler(result, failure )
	{
		//console.log("nextPromiseHandler ", this.running, " - ", this.queue, result, failure);
		if(this.running)
			return;
		this.running = true;
		var self = this;
		if((typeof failure === 'undefined') && (typeof result === 'undefined'))
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

				var next = this.queue.shift();
				if(failure)
					while(next && next._deep_done_)
						next = this.queue.shift();
				else
					while(next && next._deep_fail_)
						next = this.queue.shift();
				if(!next)
				{
					this.running = false;
					return;
				}

				if(previousContext !== this.context)
				{
					if(previousContext && previousContext.suspend)
						previousContext.suspend();
					deep.context = this.context;
					if(this.context && this.context.resume)
						this.context.resume();
				}
				//console.log("newQueueThen . will try next item : ",this.queue, result, failure)
				//console.log("next promise handler : ", next)
				next(result,failure);
			}
			catch(e)
			{
				var msg = "Internal deep.promise error : ";
				//console.error(msg, e);
				if(deep.rethrow)
					throw e;
				//setTimeout(function(){
				self.running = false;
				nextPromiseHandler.apply(self, [null, e]);
				//}, 1);
			}
			finally
			{
				if(previousContext !== this.context)
				{
					if(this.context && this.context.suspend)
						this.context.suspend();
					if(previousContext && previousContext.resume)
						previousContext.resume();
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
	function forceNextPromiseHandler(handler, s, e)
	{
		//console.log("forceNextQueue Item : ", s,e)
		handler.running = false;
		nextPromiseHandler.apply(handler, [s, e]);
	}
	function createImmediatePromise(result)
	{
		//console.log("deep.createImmediatePromise : ", result instanceof Error)
		var prom = new deep.Promise();
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
	 * @return {deep.Promise} a promise
	 */
	deep.promise = function promise(arg)
	{
		//console.log("deep.promise : ", arg)
		if(typeof arg === "undefined" || arg === null)
			return createImmediatePromise(arg);
		if(arg._isBRANCHES_)		// chain.branches case
			return deep.all(arg.branches);
		if(typeof arg.promise === "function" )  // deep.Deferred, deep.Chain and jquery deferred case
			return arg.promise();
		if(typeof arg.promise === 'object')
			return arg.promise;
		if(typeof arg.then === 'function')		//any promise compliant object
		{
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
	};

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
		arr.forEach(function (a){
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
		return def.promise();
	};

	promise.when = deep.when;
	promise.promise = deep.promise;
	promise.all = deep.all;
	promise.Deferred = deep.Deferred;
	return deep;
	}
})
