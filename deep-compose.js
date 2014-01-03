/**
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
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
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
		return function compositionChain1() {
			var self = this;
			var args = arguments;
			var def = deep.Deferred();
			var r = before.apply(this, args);
			//console.log("chain.first : result == ", r);

			if(r instanceof Error)
				return r;

			if(typeof r === 'undefined' || !r.then)
			{
				//console.log("________________  !r || !r.then")
				var subarg = args;
				if(r)
					if(!r.forEach)
						subarg = [r];
					else
						subarg = r;
				//console.log("before second call : args : ", subarg);
				var r2 = after.apply(self,subarg);
				//console.log("chain composition : after : r2 : ",r2);
				if(typeof r2 === 'undefined')
					return r;
				if(!r2.then)
					return r2;
				deep.when(r2)
				.done(function (suc) {
					//	console.log("chain.second.deep.when : result : ", suc)
					if(typeof suc === "undefined")
						return def.resolve(r);
					def.resolve(suc);
				}).fail(function (error) {
					def.reject(error);
				});
			}
			else
			{
				//console.log("________________r && r.then___________");
				deep.when(r)
				.done(function (r)
				{
					//console.log("after : deep.when(first) res : ", r);
					var argus = args ;
					if(typeof r !== 'undefined' ||  !r.forEach)
						argus = [r];
					var r2 = after.apply(self,argus);
					if(typeof r2 === 'undefined' )
						return	def.resolve(r);
					if(!r2.then)
						return def.resolve(r2);
					deep.when(r2).then(function (suc) {
						if(typeof suc === "undefined")
							return def.resolve(r);
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
			this.stack.push(function (previous){
				return chain(argument, previous);
			});
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
			this.stack.push(function (previous){
				return wrapper(previous);
			});
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
			this.stack.push(function (previous){
				return chain(previous, argument);
			});
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
			this.stack.push(function (previous){
				return function(){
					var self = this;
					var args = arguments;
					return deep.when(previous.apply(this, args))
					.fail(function (error) {
						//console.log("compose.fail : previous error : ", error);
						return fn.apply(self, [error]);
					});
				};
			});
			return this;
		},
		/**
		 * wrap collided function with fn and execute fn only if collided function success (in promised way).
		 * @method done
		 * @chainable
		 * @param  {Function} fn
		 * @return {Composer} this
		 */
		done : function fail(fn)
		{
			return this.after(fn);
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

	var createStart = function createStartDeco(decorator)
	{
		decorator = decorator || new Composer();
		var start = function start() {
			//if(!decorator.createIfNecessary)
				//throw new Error("Decorator not applied ! (start)");
			return compose.wrap(function(arg){ return arg; }, decorator).apply(this, arguments);
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
		start.done = function startFail(argument) {
			decorator.done(argument);
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
		/*start.createIfNecessary = function createIfNecessary(arg) {
			start.decorator.createIfNecessary = (typeof arg === 'undefined')?true:arg;
			return start;
		};*/
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
		ClassFactory:function(){
			var args = arguments;
			var Constructor = function (mds){
				var mds = deep.context.modes;
				if(modes)
					deep.utils.up(modes, mds);
				
				return deep
				.modes(mds)
				.done(function(){
					return deep.compose.Classes.apply(deep.compose, args);
				})
				.done();
			};
			return Constructor;
		},
		Classes:function(){
			var args = arguments;
			function Constructor(){
				//console.log("Compose Classes constructor : ", this);
				for(var i = 0; i < args.length; ++i)
				{
					var cl = args[i];
					if(typeof cl === 'function')
					{
						var r = cl.apply(this, arguments);
						if(typeof r === 'object')
							deep.utils.up(r, this);
					}
				}
			}
			var prototype = {};
			for(var i = 0; i < args.length; ++i)
			{
				var cl = args[i];
				if(cl._deep_ocm_)
					args[i] = cl = cl();
				if(typeof cl === 'function')
				{
					if(cl.prototype)
						prototype = deep.utils.up(cl.prototype, prototype);
				}
				else
					prototype = deep.utils.up(cl, prototype);
			}	
			Constructor.prototype = prototype;
			// console.log("before composer return classes : ", Constructor.prototype)
			return Constructor;
		},
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
		 * @deprecated
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
		fail : function (argument)
		{
			return createStart().fail(argument);
		},
		/**
		 * @method done
		 * @static
		 * @chainable
		 * @return {compose} starter
		 */
		done : function (argument)
		{
			return createStart().done(argument);
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

	deep.Composer = function ComposerConstructor(fn)
	{
		var comp = function TheCompoStart()
		{
			if(!comp.compiled)  // need to reduce queue to one element
				comp.compiled = deep.Composer.compile(comp.queue);
			return comp.compiled.apply(this, arguments);
		};
		comp.queue = [fn];
		comp._deep_merger_ = true;
		comp._deep_composer_ = true;
		for(var i in deep.compositions)
			comp[i] = deep.compositions[i];
		return comp;
	};

	deep.Composer.chain = function compoAddChain(before, after)
	{
		return function compoDoChain(){
			if(arguments[0] instanceof Error)
				return arguments[0];
			var args = arguments;
			var r1 = before.apply(this, args);
			if(r1 instanceof Error)
				return r1;
			if(typeof r1 === 'undefined')
				return after.apply(this, args);
			var self = this;
			if(r1.then || r1.promise)
				return deep.when(r1)
				.done(function(r1){
					if(typeof r1 === 'undefined')
						return after.apply(self, args);
					var r2 = after.apply(self, r1.forEach?r1:[r1]);
					if(typeof r2 === 'undefined')
						return r1;
					return r2;
				});
			var r2 = after.apply(this, r1.forEach?r1:[r1]);
			if(typeof r2 === 'undefined')
				return r1;
			return r2;
		};
	};

	deep.compositions = {
		clone : function compoClone(){
			var c = deep.Composer();
			c.queue = this.queue.concat();
			return c;
		},
		up : function compoUp(fn){
			if(!fn._deep_composer_)
				return fn;
			this.compiled = null;
			this.queue = this.queue.concat(fn.queue);
			return this;
		},
		bottom : function compoBottom(fn){
			if(this.queue[0]._deep_composition_ == "fn")
				return this;
			this.compiled = null;
			if(fn._deep_composer_)
				this.queue = fn.queue.concat(this.queue);
			else if(typeof fn === 'function')
			{
				fn._deep_composition_ = "fn";
				this.queue.unshift(fn);
			}
			return this;
		},
		after : function compoAfter(fn){
			this.compiled = null;
			fn._deep_composition_ = "after";
			this.queue.push(fn);
			return this;
		},
		before : function compoBefore(fn){
			this.compiled = null;
			fn._deep_composition_ = "before";
			this.queue.push(fn);
			return this;
		},
		around : function compoAround(fn){
			this.compiled = null;
			fn._deep_composition_ = "around";
			this.queue.push(fn);
			return this;
		},
		parallele : function compoParallele(fn){
			this.compiled = null;
			fn._deep_composition_ = "parallele";
			this.queue.push(fn);
			return this;
		},
		fail : function compoFail(fn){
			this.compiled = null;
			fn._deep_composition_ = "fail";
			this.queue.push(fn);
			return this;
		}
	};

	deep.Composer.add = function(name, type, method){
		var h = function(){
			var doIt = method.apply({}, arguments);
			doIt._deep_composition_ = type;
			if(!this._deep_composer_)
				return deep.Composer(doIt);
			this.compiled = null;
			this.queue.push(doIt);
			return this;
		};
		deep.compositions[name] = deep.compose[name] = h;
		return deep.Composer;
	};

	var compile = deep.Composer.compile = function compoDOCompil(queue)
	{
		if(queue[0]._deep_composition_ === "around")
			throw deep.errors.Composition("composition starting with 'around' : could not be compiled. aborting.");
		var func = null;
		var len = queue.length;
		for(var i = 0; i < len; i++)
		{
			var fn = queue[i];
			switch(fn._deep_composition_)
			{
				case "fn" : 
					func = fn;
					break;
				case "after" :
					if(func)
						func = deep.Composer.chain(func, fn);
					else
						func = fn; 
					break;
				case "before" : 
					if(func)
						func = deep.Composer.chain(fn, func);
					else
						func = fn; 
					break;
				case "around" : 
					var oldOne = func;
					func = function compoDOAround(){
						if(arguments[0] instanceof Error)
							return arguments[0];
						return fn(oldOne).apply(this, arguments);
					};
					break;
				case "fail" : 
					var oldOne = func;
					func = function compoDOFail(){
						var r1 = arguments[0];
						if(oldOne)
							r1 = oldOne.apply(this, arguments);
						var self = this;
						if(r1.then || r1.promise)
							return deep.when(r1).fail(function(e){
								return fn.call(self, e);
							});
						if(r1 instanceof Error)
						{
							var r = fn.call(self, r1);
							if(typeof r !== 'undefined')
								return r;
						}
						return r1;
					};
					break;
				case "parallele" : 
					if(!func)
						return func = fn; 
					var oldOne = func;
					func = function compoDOParallele(){
						var r1 = oldOne.apply(this, arguments);
						var r2 = fn.apply(this, arguments);
						if(r1 instanceof Error)
							return r1;
						if(r2 instanceof Error)
							return r2;
						if((r1 && (r1.then || r1.promise)) || (r2 && (r2.then || r2.promise)))
							return deep.all(r1, r2);
						return [r1,r2];
					};
					break;
				default : throw deep.errors.Composition("composition unrecognised : "+fn._deep_composition_);
			}
		};
		return func;
	};

	deep.compose = function (){
		var args = Array.prototype.slice.apply(arguments);
		return deep.getAll(args)
		.done(function(res){
			var base = deep.utils.copy(res[0]);
			var len = res.length;
			for(var count = 1;count<len;++count)
				deep.utils.up( res[count], base );
			return base;
		});
	};

	deep.compose.ClassFactory = function(){
			var args = arguments;
			var Constructor = function (mds){
				var mds = deep.context.modes;
				if(modes)
					deep.utils.up(modes, mds);
				
				return deep
				.modes(mds)
				.done(function(){
					return deep.compose.Classes.apply(deep.compose, args);
				})
				.done();
			};
			return Constructor;
	};

	deep.compose.Classes = function(){
		var args = arguments;
		function Constructor(){
			for(var i = 0; i < args.length; ++i)
			{
				var cl = args[i];
				if(typeof cl === 'function')
				{
					var r = cl.apply(this, arguments);
					if(typeof r === 'object')
						deep.utils.up(r, this);
				}
			}
		}
		var prototype = {};
		for(var i = 0; i < args.length; ++i)
		{
			var cl = args[i];
			if(cl._deep_ocm_)
				args[i] = cl = cl();
			if(typeof cl === 'function')
			{
				if(cl.prototype)
					prototype = deep.utils.up(cl.prototype, prototype);
			}
			else
				prototype = deep.utils.up(cl, prototype);
		}	
		Constructor.prototype = prototype;
		return Constructor;
	};

	deep.compose.after = function compoStartAfter(fn){
		fn._deep_composition_ = "after";
		return deep.Composer(fn);
	};

	deep.compose.before = function compoStartBefore(fn){
		fn._deep_composition_ = "before";
		return deep.Composer(fn);
	};

	deep.compose.around = function compoStartAround(fn){
		fn._deep_composition_ = "around";
		return deep.Composer(fn);
	};

	deep.compose.parallele = function(fn){
		fn._deep_composition_ = "parallele";
		return deep.Composer(fn);
	};

	deep.compose.fail = function(fn){
		fn._deep_composition_ = "fail";
		return deep.Composer(fn);
	};

	//________________________________________    custom composer examples
/*
	deep.Composer.add("myAround", "around", function(onlyTag, normalize){
		return function(old){
			return function(){ 
				return myWrapper(old.apply(this, arguments), onlyTag, normalize) 
			};
		};
	});
	deep.Composer.add("sanitize", "before", function(onlyTag, normalize){
		return function(){
			var toSanitize = arguments[0];
			arguments[0] = sanitize(toSanitize, onlyTag, normalize);
			return Array.prototype.slice.apply(arguments); // to Array
		};
	});

	var a = {
		test:deep.compose.myAround(true, false).sanitize(true, false)
	}

	deep.compose.testUp = function(num, doProfile){

		num = num || 1000;

		console.log("compose 1");
		console.time("compose1");
		if(doProfile && console.profile)
			console.profile();
		for(var i = 0; i < num; ++i)
		{
			var a = { 
				test:deep.compose.after(function testAfter(arg1, arg2){ 
					return [arg1+2, arg2+" after"];
				})
				.before(function testBefore(arg1, arg2){ 
					return [arg1+2, arg2+" before"];
				})
			};
			var b = { 
				test:function testez(arg1, arg2){ 
					return [arg1+2, arg2+" middle"];
				}
			};
			deep.utils.up(a, b);
			//deep(
				b.test(1,"hello");
			//).equal([5,"deep before middle after"]).logError();
				b.test(1,"hello");
		}
		if(doProfile && console.profileEnd)
			console.profileEnd();
		console.timeEnd("compose1");


		console.log("compose 2");
		console.time("compose2");
		if(doProfile && console.profile)
			console.profile();
		for(var i = 0; i < num; ++i)
		{
			var a = { 
				test:deep.compose.after(function testAfter(arg1, arg2){ 
					return [arg1+2, arg2+" after"];
				})
				.before(function testBefore(arg1, arg2){ 
					return [arg1+2, arg2+" before"];
				})
			};
			var b = { 
				test:function testez(arg1, arg2){ 
					return [arg1+2, arg2+" middle"];
				}
			};
			deep.utils.up2(a, b);
			//deep(
				b.test(1,"hello");
			//).equal([5,"deep before middle after"]).logError();
				b.test(1,"hello");
		}
		if(doProfile && console.profileEnd)
			console.profileEnd();
		console.timeEnd("compose2");
}
	deep.compose.testBottom = function(num, doProfile){

		num = num || 1000;

		console.log("compose 1");
		console.time("compose1");
		if(doProfile && console.profile)
			console.profile();
		for(var i = 0; i < num; ++i)
		{
			var a = { 
				test:deep.compose.after(function testAfter(arg1, arg2){ 
					return [arg1+2, arg2+" after"];
				})
				.before(function testBefore(arg1, arg2){ 
					return [arg1+2, arg2+" before"];
				})
			};
			var b = { 
				test:function testez(arg1, arg2){ 
					return [arg1+2, arg2+" middle"];
				}
			};
			deep.utils.bottom(b,a);
			//deep(
				a.test(1,"hello");
			//).equal([5,"deep before middle after"]).logError();
				//a.test(1,"hello");
		}
		if(doProfile && console.profileEnd)
			console.profileEnd();
		console.timeEnd("compose1");


		console.log("compose 2");
		console.time("compose2");
		if(doProfile && console.profile)
			console.profile();
		for(var i = 0; i < num; ++i)
		{
			var a = { 
				test:deep.compose.after(function testAfter(arg1, arg2){ 
					return [arg1+2, arg2+" after"];
				})
				.before(function testBefore(arg1, arg2){ 
					return [arg1+2, arg2+" before"];
				})
			};
			var b = { 
				test:function testez(arg1, arg2){ 
					return [arg1+2, arg2+" middle"];
				}
			};
			deep.utils.bottom2(b,a);
			//deep(
				a.test(1,"hello");
			//).equal([5,"deep before middle after"]).logError();
				//a.test(1,"hello");
		}
		if(doProfile && console.profileEnd)
			console.profileEnd();
		console.timeEnd("compose2");
}*/
	return deep.compose;
}
});