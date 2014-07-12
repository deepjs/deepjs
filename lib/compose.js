/**
 *
 *
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * @module deep
 * @submodule deep-compose
 * 
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "./compiler", "./errors", "./utils"], function(require, compiler, errors, utils){

	errors.Composition = function(msg, report, fileName, lineNum){
		if(typeof msg === 'object')
			report = msg;
		if(!msg)
			msg = "CompositionError";
		return errors.Error(500, msg, report, fileName, lineNum);
	};
	var composer = {};
	var Composer = composer.Composer = compiler.Classes(function(namespace, api){
		this.namespace = namespace;
		this.api = this.api || {};
		var self = this;
		if(namespace)
		{
			namespace.after = function (fn){
				fn._deep_composition_ = "after";
				return self.create(fn);
			};
			namespace.branches = function (fn){
				fn._deep_composition_ = "branches";
				return self.create(fn);
			};
			namespace.before = function (fn){
				fn._deep_composition_ = "before";
				return self.create(fn);
			};
			namespace.around = function (fn){
				fn._deep_composition_ = "around";
				return self.create(fn);
			};
			namespace.parallele = function(fn){
				fn._deep_composition_ = "parallele";
				return self.create(fn);
			};
			namespace.fail = function(fn){
				fn._deep_composition_ = "fail";
				return self.create(fn);
			};
		}
		if(api)
			deep.up(api, this.api);

	}, {
		add:function(name, type, method){
			var self = this;
			var h = function(){
				var doIt = method.apply({}, arguments);
				doIt._deep_composition_ = type;
				if(!this._deep_composer_)
					return self.create(doIt);
				this._queue(doIt);
				return this;
			};
			this.api[name] = h;
			if(this.namespace)
				this.namespace[name] = h;
			return this;
		},
		create:function(fn){
			var closure = { queue:[], compiled:false }, self = this;
			if(fn)
				if(!fn.forEach)
					closure.queue = [fn];
				else
					closure.queue = fn.slice();
			var comp = function()
			{
				if(!closure.compiled || closure.containsBranches)  // need to reduce queue to one element
					closure.compiled = Composer.compile(closure, self);
				return closure.compiled.apply(this, arguments);
			};

			comp._deep_compiler_ = true;
			comp._deep_composer_ = true;
			comp._clone = function (){
				var c = self.create(closure.queue);
				return c;
			};
			comp._compile = function(){
				closure.compiled = Composer.compile(closure, self);
				return closure.compiled;
			};
			comp._up = function (fn){
				if(!fn._deep_composer_)
				{
					fn._deep_composition_ = "fn";
					closure.queue = [fn];
					return fn;
				}
				closure.compiled = null;
				closure.queue = closure.queue.concat(fn._queue());
				return this;
			};
			comp._queue = function(fn){
				if(!fn)
					return closure.queue;
				closure.queue.push(fn);
			};
			comp._unshift = function(fn){
				closure.queue.unshift(fn);
			};
			comp._bottom = function (fn){
				if(closure.queue[0]._deep_composition_ == "fn")
					return this;
				closure.compiled = null;
				if(fn._deep_composer_)
					closure.queue = fn._queue().concat(closure.queue);
				else if(typeof fn === 'function')
				{
					fn._deep_composition_ = "fn";
					closure.queue.unshift(fn);
				}
				return this;
			};
			for(var i in this.api)
				comp[i] = this.api[i];
			return comp;
		},
		api:{
			after : function (fn){
				this.compiled = null;
				fn._deep_composition_ = "after";
				this._queue(fn);
				return this;
			},
			before : function (fn){
				fn._deep_composition_ = "before";
				this._queue(fn);
				return this;
			},
			around : function (fn){
				fn._deep_composition_ = "around";
				this._queue(fn);
				return this;
			},
			parallele : function (fn){
				fn._deep_composition_ = "parallele";
				this._queue(fn);
				return this;
			},
			fail : function (fn){
				fn._deep_composition_ = "fail";
				this._queue(fn);
				return this;
			},
			branches : function(fn){
				fn._deep_composition_ = "branches";
				this._queue(fn);
				return this;
			}
		}
	});

	var compose = composer.compose = {};
	var Composition = composer.Composition = new Composer(composer.compose);

	compose.Arguments = function(arr){
		if(!arr.forEach)
			arr = [arr];
		arr._deep_arguments_  = true;
		return arr;
	};

	Composer.chain = function (before, after, closure)
	{
		return function (){
			var self = this;
			closure.args = arguments;
			var r = before.apply(this, closure.args);
			if(r instanceof Error)
				return r;
			if(r && (r.then || r.promise))
			{
				var d = deep.when(r)
				.done(function(r1){
					if(typeof r1 === 'undefined')
						return after.apply(self, closure.args);
					if(!r1._deep_arguments_)
						r1 = [r1];
					closure.args = r1;
					return after.apply(self, closure.args);
				})
				.done(function(success){
					this._finished = true;
				})
				.fail(function(e){
					this._finished = true;
				});
				if(!d._finished)
					return d;
				if(d._state.error)
					return d._state.error;
				return d._state.success;
			}
			if(typeof r === 'undefined')
				return after.apply(self, closure.args);
			closure.args = r;
			if(!r._deep_arguments_)
				closure.args = [r];
			var r2 = after.apply(self, closure.args);
			return (typeof r2 === 'undefined')?r:r2;
		};
	};

	var compile = Composer.compile = function (closure, composer)
	{
		var queue = closure.queue;
		if(queue[0]._deep_composition_ === "around")
			throw errors.Composition("composition starting with 'around' : could not be compiled. aborting.");
		var func = null;
		var len = queue.length;
		var closure = {};
		queue.forEach(function(fn){
			var oldOne = null;
			switch(fn._deep_composition_)
			{
				case "fn" :
					func = fn;
					break;
				case "branches" :
					var brancher = composer.create();
					fn.call(brancher);
					if(func)
					{
						func._deep_composition_ = "fn";
						brancher._unshift(func);
					}
					func = brancher._compile();
					closure.containsBranches = true;
					break;
				case "after" :
					if(func)
						func = Composer.chain(func, fn, closure);
					else
						func = fn;
					break;
				case "before" :
					if(func)
						func = Composer.chain(fn, func, closure);
					else
						func = fn;
					break;
				case "around" :
					oldOne = func;
					func = function (){
						closure.args = arguments;
						return fn(oldOne).apply(this, arguments);
					};
					break;
				case "fail" :
					oldOne = func;
					func = function (){
						if(!oldOne)
							return undefined;
						closure.args = arguments;
						var self = this, r = null;
						try{
							r = oldOne.apply(this, closure.args);
						}
						catch(e){
							r = e;
						}
						finally{
							var d = deep.when(r)
							.done(function(){
								this._finished = true;
							})
							.fail(function(e){
								args = Array.prototype.slice.apply(closure.args);
								args = [e, args];
								var r = fn.apply(self, args);
								if(typeof r === 'undefined')
									return e;
								if(!r.then && !r.promise)
									this._finished = true;
								return r;
							});
							if(!d._finished)
								return d;
							if(d._state.error)
								return d._state.error;
							return d._state.success;
						}
					};
					break;
				case "parallele" :
					if(!func)
					{
						func = fn;
						return;
					}
					oldOne = func;
					func = function compoDOParallele(){
						closure.args = arguments;
						var r1 = oldOne.apply(this, arguments);
						var r2 = fn.apply(this, arguments);
						
						return deep.all(r1, r2);
					};
					break;
				default : throw errors.Composition("composition unrecognised : "+fn._deep_composition_);
			}
		});
		return func;
	};

	Composition.add("log", "after", function(){
		return function(){ 
			console.log("Composer Log Arguments : ", arguments);
		};
	});
	//________________________________________    custom composer examples
/*
	Composition.add("myAround", "around", function(onlyTag, normalize){
		return function(old){
			return function(){ 
				return myWrapper(old.apply(this, arguments), onlyTag, normalize) 
			};
		};
	});
	Composition.add("sanitize", "before", function(onlyTag, normalize){
		return function(){
			var toSanitize = arguments[0];
			arguments[0] = sanitize(toSanitize, onlyTag, normalize);
			return Array.prototype.slice.apply(arguments); // to Array
		};
	});
*/
	return composer;
});