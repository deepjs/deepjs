/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(function(require, exports, module){
	var promise = require("./promise");
	// console.log("Deep-compose init");

	var DeepDecorator = function (stack) {
		this.stack = stack || [];
	};

	function chain(before, after)
	{
		return function () {
			var self = this;
			var args = arguments;
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
				promise.when(r)
				.then(function (suc) {
					def.resolve(suc);
				}, function (error) {
					def.reject(error);
				});
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
				});
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
				});
			}
			return promise.promise(def);
		};
	}
	DeepDecorator.prototype = {
		around : function (argument)
		{
			var wrapper = function (previous)
			{
				return argument(previous);
			};
			this.stack.push(wrapper);
			return this;
		},
		after : function (argument)
		{
			var wrapper = function (previous)
			{
				return chain(previous, argument);
			};
			this.stack.push(wrapper);
			return this;
		},
		fail : function (fn)
		{
			var wrapper = function (previous)
			{
				return function()
				{
					var self = this;
					var args = arguments;
					return promise.when(previous.apply(this, args))
					.done(function (res) {
						if(res instanceof Error)
							return fn.apply(self, args);
						return res;
					})
					.fail(function (argument) {
						return fn.apply(self, args);
					});
				};
			};
			this.stack.push(wrapper);
			return this;
		},
		before : function (argument)
		{
			var wrapper = function (previous)
			{
				return chain(argument, previous);
			};
			this.stack.push(wrapper);
			return this;
		},
		replace : function (argument)
		{
			var wrapper = function (previous)
			{
				return argument;
			};
			this.stack.push(wrapper);
			return this;
		},
		parallele : function (argument)
		{
			var wrapper = function (previous)
			{
				return function ()
				{
					var args = arguments;
					var promises = [argument.apply(this, args), previous.apply(this,args)];
					return promise.all(promises);
				};
			};
			this.stack.push(wrapper);
			return this;
		}
	};
	var createStart = function (decorator)
	{
		decorator = decorator || new DeepDecorator();
		var start = function () {
			if(!decorator.createIfNecessary)
				throw new Error("Decorator not applied ! (start)");
			return compose.wrap(function(){}, decorator).apply(this, arguments);
		};
		start.decorator = decorator;
		start.after = function (argument) {
			decorator.after(argument);
			return start;
		};
		start.before = function (argument) {
			decorator.before(argument);
			return start;
		};
		start.fail = function (argument) {
			decorator.fail(argument);
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
		start.replace = function (argument) {
			decorator.replace(argument);
			return start;
		};
		start.createIfNecessary = function (arg) {
			start.decorator.createIfNecessary = (typeof arg === 'undefined')?true:arg;
			return start;
		};
		start.ifExists = function (arg) {
			start.decorator.ifExists = (typeof arg === 'undefined')?true:arg;
			return start;
		};
		start.condition = function (arg) {
			start.condition = arg;
			return start;
		};
		return start;
	};

	var compose = {
		Decorator:DeepDecorator,
		cloneStart:function (start) {
			var newStack = start.decorator.stack.concat([]);
			var nd = new DeepDecorator(newStack);
			nd.ifExists = start.decorator.ifExists;
			nd.createIfNecessary = start.decorator.createIfNecessary;
			return createStart(nd);
		},
		wrap:function (func, decorator)
		{
			var fin = func;
			decorator.stack.forEach(function (wrapper)
			{
				fin = wrapper(fin);
			});
			return fin;
		},
		createIfNecessary : function ()
		{
			var start = createStart();
			start.decorator.createIfNecessary = true;
			return start;
		},
		ifExists : function ()
		{
			var start = createStart();
			start.decorator.ifExists = true;
			return start;
		},
		condition:function (argument) {
			var start = createStart();
			start.decorator.condition = argument;
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
		fail : function (argument)
		{
			return createStart().fail(argument);
		},
		parallele : function (argument)
		{
			return createStart().parallele(argument);
		},
		replace : function (argument)
		{
			return createStart().replace(argument);
		}
	};
	// console.log("Deep-compose initialised");

	return compose;
});