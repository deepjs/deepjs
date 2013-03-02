/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(function(require, exports, module){
	var promise = require("deep/promise");
	// console.log("Deep-compose init");
	var DeepDecorator = function (stack) {
		this.stack = stack || [];
	}
	function chain(before, after)
	{
		return function () {
			var self = this;
			var args = Array.prototype.slice.call(arguments);
			
			var def = promise.Deferred();
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
				promise.when(r).then(function (suc) {
					def.resolve(suc);
				}, function (error) {
					def.reject(error);
				})
			}
			else if(!r.then)
			{
				r = after.apply(self,[r]);
				if(typeof r === 'undefined')
					return r;
				if(!r.then)
					return r;
				promise.when(r).then(function (suc) {
					//	console.log("chain.second.promise.when : result : ", suc)
					def.resolve(suc);
				}, function (error) {
					def.reject(error);
				})
			}
			else
			{
				//console.log("________________BEFORE promise.when___________");
				promise.when(r).then(function (r)
				{
					//console.log("after : promise.when(first) res : ", r);
					var argus = args ;
					if(typeof r !== 'undefined' )
						argus = [r];
					r = after.apply(self,argus);
					if(typeof r === 'undefined' )
						return	def.resolve(r);
					if(!r.then)
						return def.resolve(r);
					promise.when(r).then(function (suc) {
						def.resolve(suc);
					}, function (error) {
						def.reject(error);
					});
				}, function (error) {
					def.reject(error);
				})
			}
			return promise.promise(def);
		}
	}
	DeepDecorator.prototype = {
		around : function (argument, options) 
		{
			var wrapper = function (previous) 
			{
				return argument(previous);
			}
			this.stack.push(wrapper);
			return this;
		},
		after : function (argument, options) 
		{
			var wrapper = function (previous) 
			{
				return chain(previous, argument);
			}
			this.stack.push(wrapper);
			return this;
		},
		before : function (argument, options) 
		{
			var wrapper = function (previous) 
			{
				return chain(argument, previous);
			}
			this.stack.push(wrapper);
			return this;
		},
		parallele : function (argument, options) 
		{
			var wrapper = function (previous) 
			{
				return function () 
				{
					var args = Array.prototype.slice.call(arguments);	
					var promises = [argument.apply(this, args), previous.apply(this,args)];
					return promise.all(promises);
				}
			}
			this.stack.push(wrapper);
			return this;
		}
	}
	var createStart = function (decorator) 
	{
		var decorator = decorator || new DeepDecorator();
		var start = function () {
			if(!decorator.createIfNecessary)
				throw new Error("Decorator not applied ! (start)");
		//	var args = Array.prototype.slice.call(arguments);
			return compose.wrap(function(){}, decorator).apply(this)
		}
		start.decorator = decorator;
		start.after = function (argument) {
			decorator.after(argument);
			return start;
		};
		start.before = function (argument) {
			decorator.before(argument);
			return start;
		};
		start.around = function (argument) {
			decorator.around(argument);
			return start;
		};
		start.parallele = function (argument) {
			decorator.parallele(argument);
			return start;
		};
		return start;
	}

	var compose = {
		Decorator:DeepDecorator,
		cloneStart:function (start) {
			var newStack = start.decorator.stack.concat([]);
			var nd = new DeepDecorator(newStack);
			nd.createIfNecessary = start.decorator.createIfNecessary;
			return createStart(nd);
		},
		wrap:function (func, decorator) 
		{
			var fin = func;
			decorator.stack.forEach(function (wrapper) 
			{
				fin = wrapper(fin);
			})
			return fin;
		},
		createIfNecessary : function () 
		{
			var start = createStart();
			start.decorator.createIfNecessary = true;
			return start;
		},
		up : function (bottom, up) 
		{
			if(typeof up !== 'function' || typeof bottom !== 'function')
				throw new Error("DeepDecorator.collide : you could only apply function together");
			if(!up.decorator || !(up.decorator instanceof DeepDecorator))
				return up;
			if(bottom.decorator && bottom.decorator instanceof DeepDecorator)
			{
				bottom.decorator.stack = bottom.decorator.stack.concat(up.decorator.stack);
				return bottom;
			}
			return compose.wrap(bottom,up.decorator);
		},
		bottom : function (bottom, up) 
		{
			if(typeof up !== 'function' || typeof bottom !== 'function')
				throw new Error("DeepDecorator.collide : you could only apply function together");
			if(!up.decorator || !(up.decorator instanceof DeepDecorator))
				return up;
			if(bottom.decorator && bottom.decorator instanceof DeepDecorator)
			{
				up.decorator.stack = bottom.decorator.stack.concat(up.decorator.stack);
				return up;
			}
			return compose.wrap(bottom,up.decorator);
		},
		around : function (argument) 
		{
			return createStart().around(argument);
		},
		after : function (argument) 
		{
			return createStart().after(argument);
		},
		before : function (argument) 
		{
			return createStart().before(argument);
		},
		parallele : function (argument) 
		{
			return createStart().parallele(argument);
		}
	}
	// console.log("Deep-compose initialised");

	return compose;
})