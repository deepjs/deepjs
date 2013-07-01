/**
 *
 * When you collide two functions together, you could use deep.compose to manage how collision is resolved.
 * Keep in mind that if you collide a simple function (up) on a composition (chained or not) : it mean : simply overwrite the composition by the function.
 * So if you apply a composition from bottom on a function, the composition will never b applied.
 * If you collide two compositions : they will be merged to give a unique composition chain.
 *
 * @example
 * deep.compose : Chained Aspect Oriented Programming
==========================
SEE DOCS/deep.md for full doc



## deep.compose.before( func )

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


## deep.compose.after( func )

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

## deep.compose.around( func )

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


## deep.compose.parallele( func )

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
 *
 *
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * @module deep
 * @submodule deep-compose
 * @example
 *
 *
 * 	var a = {
 *   	myFunc:function(){
 *   		// do something
 *  	 }
 * 	}
 *
 * 	var b = {
 * 		myFunc:deep.compose.after(function(){
 * 	   		// do something
 * 		})
 * 	}
 *
 *
 * 	deep.utils.up(b,a).myFunc()
 *
 */
if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(function(require, exports, module){
	return function(deep)
	{
	// console.log("Deep-compose init");

	/**
	 *Not intended to be used directly.
	 *
	 * Use deep.compose... in place.
	 *
	 * @class Composer
	 * @namespace deep
	 * @private
	 * @constructor
	 * @param {Array} stack stack of functions to chain
	 */
	var Composer = function (stack) {
		this.stack = stack || [];
	};

	function chain(before, after)
	{
		return function executeChain() {
			var self = this;
			var args = arguments;
			var def = deep.Deferred();
			var r = before.apply(this, args);
			//console.log("chain.first : result == ", r)

			if(typeof r === 'undefined')
			{
				//console.log("chain.first : result == undefined")
				r = after.apply(self,args);
				//console.log("chain.second : result : ", r)
				if(typeof r === 'undefined')
					return r;
				if(!r.then)
					return r;
				deep.when(r)
				.done(function (suc) {
					def.resolve(suc);
				}).fail(function (error) {
					def.reject(error);
				});
			}
			else if(r && !r.then)
			{
				r = after.apply(self,[r]);
				if(typeof r === 'undefined')
					return r;
				if(!r.then)
					return r;
				deep.when(r)
				.done(function (suc) {
					//	console.log("chain.second.deep.when : result : ", suc)
					def.resolve(suc);
				}).fail(function (error) {
					def.reject(error);
				});
			}
			else
			{
				//console.log("________________BEFORE deep.when___________");
				deep.when(r)
				.done(function (r)
				{
					//console.log("after : deep.when(first) res : ", r);
					var argus = args ;
					if(typeof r !== 'undefined' )
						argus = [r];
					r = after.apply(self,argus);
					if(typeof r === 'undefined' )
						return	def.resolve(r);
					if(!r.then)
						return def.resolve(r);
					deep.when(r).then(function (suc) {
						def.resolve(suc);
					}, function (error) {
						def.reject(error);
					});
				}).fail(function (error) {
					def.reject(error);
				});
			}
			return def.promise();
		};
	}
	Composer.prototype = {
		/**
		 * 	If it returns something, it will be injected as argument(s) in next function.
			If it return nothing, th original arguments are injected in next function.
			If it returns a promise or a chain : it will wait until the resolution of the returned value.
			If the returned object isn't a promise, the next function is executed immediately.

			@example

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

				base.myFunc("hello"); // will log 'bottom' then 'base'

			@method before
		 * @chainable
		 * @param  {Function} argument the function to execute BEFORE the collided one
		 * @return {[type]}
		 */
		before : function before(argument)
		{
			var wrapper = function beforeWrapper(previous)
			{
				return chain(argument, previous);
			};
			this.stack.push(wrapper);
			return this;
		},
		/**
		 *
		 * chainable around composition
		 *
		 *
		 * here you want to do your own wrapper.
		 * Juste provid a function that receive in argument the collided function (the one which is bottom),
		 * an which return the function that use this collided function.
		 *
		 * @example
		 * 		var base = {
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
		 *
		 * @method around
		 * @chainable
		 * @param  {Function} wrapper a fonction to wrap the collided one
		 * @return {Composer} this
		 */
		around : function around(wrapper)
		{
			var func = function aroundWrapper(previous)
			{
				return wrapper(previous);
			};
			this.stack.push(func);
			return this;
		},
		/**
		If the previous returns something, it will be injected as argument(s) in 'func'.
		If the previous return nothing, th original arguments are injected in 'func'.
		If the previous returns a promise or a chain : it will wait until the resolution of the returned value before executing 'func'.
		If the previous returned object isn't a promise, 'func' is executed immediately.

		Same thing for returned object(s) from 'func' : it will be chained..

		@example

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

			base.myFunc("hello"); // will log 'base' before 'after'

		@method after
		@chainable
		@param {Function} argument the function to execute AFTER the collided one
		@return {Composer} this
		*/
		after : function after(argument)
		{
			var wrapper = function afterWrapper(previous)
			{
				return chain(previous, argument);
			};
			this.stack.push(wrapper);
			return this;
		},
		/**
		 * wrap collided function with fn and execute fn only if collided function return an error.
		 * @method fail
		 * @chainable
		 * @param  {Function} fn
		 * @return {Composer} this
		 */
		fail : function fail(fn)
		{
			var wrapper = function failWrapper(previous)
			{
				return function()
				{
					var self = this;
					var args = arguments;
					return deep.when(previous.apply(this, args))
					.done(function (res) {
						//console.log("compose.fail : previous done : ", res);
						if(res instanceof Error)
							return fn.apply(self, [res]);
						return res;
					})
					.fail(function (error) {
						//console.log("compose.fail : previous error : ", error);
						return fn.apply(self, [error]);
					});
				};
			};
			this.stack.push(wrapper);
			return this;
		},
		/**
		 * replace collided function by this one
		 * @method replace
		 * @chainable
		 * @param  {Function} argument
		 * @return {Composer} this
		 */
		replace : function replace(argument)
		{
			var wrapper = function replaceWrapper(previous)
			{
				return argument;
			};
			this.stack.push(wrapper);
			return this;
		},
		/**
		 * execute collided function PARALLELY with provided function
		 *
		 * when you want to call a function in the same time of an other, and to wait that both function are resolved (even if deferred)
		 * before firing eventual next composed function, you could use deep.compose.parallele( func )
		 *
		 * Keep in mind that the output of both functions will be injected as a single array argument in next composed function.
		 * Both will receive in argument either the output of previous function (if any, an even if deferred), or the original(s) argument(s).

		 * So as it implies that the forwarded arguments become an array :
		 * It has to be used preferently with method(s) that do not need to handle argument(s), and that return a promise just for maintaining the chain asynch management.
		 *
		 * @example
		 *
		 * 		var a = {
		 * 			load:function(){
		 * 				return deep("json::myfile.json")
		 * 				.done(function (success) {
		 * 					// do something
		 * 				});
		 * 			}
		 * 		}
		 *
		 * 		deep({
		 * 			load:deep.compose.parallele(function(){
		 * 				return deep("json::myotherfile.json")
		 * 				.done(function (success) {
		 * 					// do something
		 * 				});
		 * 			})
		 * 		})
		 * 		.bottom(a)
		 * 		.load() // will perform both loads (http get on json files) parallely (in the same time)
		 * 		.log();  // will print a concatened array of loadeds stuffs.
		 *
		 * @method parallele
		 * @chainable
		 * @param  {[type]} argument
		 * @return {[type]}
		 */
		parallele : function parallele(argument)
		{
			var wrapper = function (previous)
			{
				return function paralleleWrapper()
				{
					var args = arguments;
					var promises = [argument.apply(this, args), previous.apply(this,args)];
					return deep.all(promises);
				};
			};
			this.stack.push(wrapper);
			return this;
		}
	};

	var createStart = function (decorator)
	{
		decorator = decorator || new Composer();
		var start = function start() {
			//if(!decorator.createIfNecessary)
			//	throw new Error("Decorator not applied ! (start)");
			return compose.wrap(function(){}, decorator).apply(this, arguments);
		};
		start.decorator = decorator;
		start.after = function startAfter(argument) {
			decorator.after(argument);
			return start;
		};
		start.before = function startBefore(argument) {
			decorator.before(argument);
			return start;
		};
		start.fail = function startFail(argument) {
			decorator.fail(argument);
			return start;
		};
		start.around = function startAround(argument) {
			decorator.around(argument);
			return start;
		};
		start.parallele = function startParallele(argument) {
			decorator.parallele(argument);
			return start;
		};
		start.replace = function startReplace(argument) {
			decorator.replace(argument);
			return start;
		};
		start.createIfNecessary = function createIfNecessary(arg) {
			start.decorator.createIfNecessary = (typeof arg === 'undefined')?true:arg;
			return start;
		};
		start.ifExists = function ifExists(arg) {
			start.decorator.ifExists = (typeof arg === 'undefined')?true:arg;
			return start;
		};
		start.condition = function startCondition(arg) {
			start.condition = arg;
			return start;
		};
		return start;
	};

	/**
	 * @namespace deep
	 * @class compose
	 * @static
	 * @param  {[type]} decorator
	 * @return {[type]}
	 */
	var compose = {
		Decorator:Composer,
		cloneStart:function cloneStart(start) {
			var newStack = start.decorator.stack.concat([]);
			var nd = new Composer(newStack);
			nd.ifExists = start.decorator.ifExists;
			nd.createIfNecessary = start.decorator.createIfNecessary;
			return createStart(nd);
		},
		wrap:function cWrap(func, decorator)
		{
			var fin = func;
			decorator.stack.forEach(function (wrapper)
			{
				fin = wrapper(fin);
			});
			return fin;
		},
		/**
		 * @method createIfNecessary
		 * @chainable
		 * @static
		 * @return {compose} starter
		 */
		createIfNecessary : function cCIN()
		{
			var start = createStart();
			start.decorator.createIfNecessary = true;
			return start;
		},
		/**
		 * @method ifExists
		 * @static
		 * @chainable
		 * @return {compose} starter
		 */
		ifExists : function cIE()
		{
			var start = createStart();
			start.decorator.ifExists = true;
			return start;
		},
		/**
		 * @method condition
		 * @static
		 * @chainable
		 * @param argument a boolean expression or a function to call and give a boolean
		 * @return {compose} starter
		 */
		condition:function cCondition(argument) {
			var start = createStart();
			start.decorator.condition = argument;
			return start;
		},
		/**
		 * @method up
		 * @static
		 * @chainable
		 * @return {compose} starter
		 */
		up : function cUp(bottom, up)
		{
			if(typeof up !== 'function' || typeof bottom !== 'function')
				throw new Error("Composer.collide : you could only apply function together");
			if(!up.decorator || !(up.decorator instanceof Composer))
				return up;
			if(bottom.decorator && bottom.decorator instanceof Composer)
			{
				bottom.decorator.stack = bottom.decorator.stack.concat(up.decorator.stack);
				return bottom;
			}
			return compose.wrap(bottom,up.decorator);
		},
		/**
		 * @method bottom
		 * @static
		 * @chainable
		 * @return {compose} starter
		 */
		bottom : function cBottom(bottom, up)
		{
			if(typeof up !== 'function' || typeof bottom !== 'function')
				throw new Error("Composer.collide : you could only apply function together");
			if(!up.decorator || !(up.decorator instanceof Composer))
				return up;
			if(bottom.decorator && bottom.decorator instanceof Composer)
			{
				up.decorator.stack = bottom.decorator.stack.concat(up.decorator.stack);
				return up;
			}
			return compose.wrap(bottom,up.decorator);
		},
		/**
		 * @method around
		 * @static
		 * @chainable
		 * @return {compose} starter
		 */
		around : function cAround(argument)
		{
			return createStart().around(argument);
		},
		/**
		 * @method after
		 * @static
		 * @chainable
		 * @return {compose} starter
		 */
		after : function cAfter(argument)
		{
			return createStart().after(argument);
		},
		/**
		 * @method before
		 * @static
		 * @chainable
		 * @return {compose} starter
		 */
		before : function cBefore(argument)
		{
			return createStart().before(argument);
		},
		/**
		 * @method fail
		 * @static
		 * @chainable
		 * @return {compose} starter
		 */
		fail : function cFail(argument)
		{
			return createStart().fail(argument);
		},
		/**
		 * @method parallele
		 * @static
		 * @chainable
		 * @return {compose} starter
		 */
		parallele : function cParallele(argument)
		{
			return createStart().parallele(argument);
		},
		/**
		 * @method replace
		 * @static
		 * @chainable
		 * @return {compose} starter
		 */
		replace : function cReplace(argument)
		{
			return createStart().replace(argument);
		}
	};
	// console.log("Deep-compose initialised");



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
    compose.sequence = function (funcs, args) {
        if (!funcs || funcs.length === 0)
            return args;
        var current = funcs.shift();
        var def = deep.Deferred();
        var context = {};
        var doIt = function (r) {
            deep.when(r).then(function (r) {
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
            }, function (error) {
                if (!def.rejected && !def.resolved && !def.canceled)
                    def.reject(error);
            });
        };
        doIt(current.apply(context, args));
        return def.promise();
    };

	return compose;
}
});