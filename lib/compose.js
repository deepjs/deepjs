/**
 *
 *
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * @module deep
 * @submodule deep-compose
 * TODO : add deep.Arguments([]) or deep.Arguments(1,2,3)		OK
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(function(require, exports, module){
return function(deep)
{
	deep.Arguments = function(arr){
		if(!arr.forEach)
			arr = [arr];
		arr._deep_arguments_  = true;
		return arr;
	};
	deep.compose = {
		after : function (fn){
			fn._deep_composition_ = "after";
			return deep.Composer(fn);
		},
		branches : function (fn){
			fn._deep_composition_ = "branches";
			return deep.Composer(fn);
		},
		before : function (fn){
			fn._deep_composition_ = "before";
			return deep.Composer(fn);
		},
		around : function (fn){
			fn._deep_composition_ = "around";
			return deep.Composer(fn);
		},
		parallele : function(fn){
			fn._deep_composition_ = "parallele";
			return deep.Composer(fn);
		},
		fail : function(fn){
			fn._deep_composition_ = "fail";
			return deep.Composer(fn);
		},
		Classes : function(){
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
		},
		ClassFactory : function(){
			var args = arguments;
			var Factory = function (modes){
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
			return Factory;
		}
	};
	//_____________________________________________________________
	deep.Composer = function (fn)
	{
		var compClosure = { queue:[] };
		var comp = function()
		{
			if(!compClosure.compiled || compClosure.containsBranches)  // need to reduce queue to one element
				compClosure.compiled = deep.Composer.compile(compClosure);
			return compClosure.compiled.apply(this, arguments);
		};
		if(fn)
			if(!fn.forEach)
				compClosure.queue = [fn];
			else
				compClosure.queue = fn.slice();
		comp._deep_compiler_ = true;
		comp._deep_composer_ = true;
		comp.clone = function (){
			var c = deep.Composer(compClosure.queue);
			return c;
		};
		comp.compile = function(){
			compClosure.compiled = deep.Composer.compile(compClosure);
			return compClosure.compiled;
		};
		comp.up = function (fn){
			if(!fn._deep_composer_)
				return fn;
			compClosure.compiled = null;
			compClosure.queue = compClosure.queue.concat(fn.queue());
			return this;
		};
		comp.queue = function(fn){
			if(!fn)
				return compClosure.queue;
			compClosure.queue.push(fn);
		};
		comp.unshift = function(fn){
			compClosure.queue.unshift(fn);
		};
		comp.bottom = function (fn){
			if(compClosure.queue[0]._deep_composition_ == "fn")
				return this;
			compClosure.compiled = null;
			if(fn._deep_composer_)
				compClosure.queue = fn.queue().concat(compClosure.queue);
			else if(typeof fn === 'function')
			{
				fn._deep_composition_ = "fn";
				compClosure.queue.unshift(fn);
			}
			return this;
		};
		for(var i in deep.compositions)
			comp[i] = deep.compositions[i];
		return comp;
	};

	deep.Composer.chain = function (before, after, closure)
	{
		return function (){
			var self = this;
			closure.args = arguments;
			var asynch = false;
			var d = deep.when(before.apply(this, closure.args))
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
			{
				asynch = true;
				return d;
			}
			if(d._error)
				return d._error;
			return d._success;
		};
	};

	deep.Composer.add = function(name, type, method){
		var h = function(){
			var doIt = method.apply({}, arguments);
			doIt._deep_composition_ = type;
			if(!this._deep_composer_)
				return deep.Composer(doIt);
			this.compiled = null;
			this.queue(doIt);
			return this;
		};
		deep.compositions[name] = deep.compose[name] = h;
		return deep.Composer;
	};

	var compile = deep.Composer.compile = function (compClosure)
	{
		var queue = compClosure.queue;
		if(queue[0]._deep_composition_ === "around")
			throw deep.errors.Composition("composition starting with 'around' : could not be compiled. aborting.");
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
					var brancher = deep.Composer();
					fn.call(brancher);
					if(func)
					{
						func._deep_composition_ = "fn";
						brancher.unshift(func);
					}
					func = brancher.compile();
					compClosure.containsBranches = true;
					break;
				case "after" :
					if(func)
						func = deep.Composer.chain(func, fn, closure);
					else
						func = fn;
					break;
				case "before" :
					if(func)
						func = deep.Composer.chain(fn, func, closure);
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
							if(d._error)
								return d._error;
							return d._success;
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
				default : throw deep.errors.Composition("composition unrecognised : "+fn._deep_composition_);
			}
		});
		return func;
	};

	deep.compositions = {
		after : function (fn){
			this.compiled = null;
			fn._deep_composition_ = "after";
			this.queue(fn);
			return this;
		},
		before : function (fn){
			this.compiled = null;
			fn._deep_composition_ = "before";
			this.queue(fn);
			return this;
		},
		around : function (fn){
			this.compiled = null;
			fn._deep_composition_ = "around";
			this.queue(fn);
			return this;
		},
		parallele : function (fn){
			this.compiled = null;
			fn._deep_composition_ = "parallele";
			this.queue(fn);
			return this;
		},
		fail : function (fn){
			this.compiled = null;
			fn._deep_composition_ = "fail";
			this.queue(fn);
			return this;
		},
		branches : function(fn){
			fn._deep_composition_ = "branches";
			this.compiled = null;
			this.queue(fn);
			return this;
		}
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
*/
	return deep.compose;
};
});