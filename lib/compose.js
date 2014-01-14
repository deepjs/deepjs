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
define(function(require, exports, module){
	return function(deep)
	{

	deep.compose = {};

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

	deep.compose.ClassFactory = function(){
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
	};

	//_____________________________________________________________

	deep.Composer = function ComposerConstructor(fn)
	{
		var comp = function TheCompoStart()
		{
			if(!comp.compiled)  // need to reduce queue to one element
				comp.compiled = deep.Composer.compile(comp.queue);
			return comp.compiled.apply(this, arguments);
		};
		comp.queue = [fn];
		comp._deep_compiler_ = true;
		comp._deep_composer_ = true;
		comp.clone = function compoClone(){
			var c = deep.Composer();
			c.queue = this.queue.concat();
			return c;
		};
		comp.up = function compoUp(fn){
			if(!fn._deep_composer_)
				return fn;
			this.compiled = null;
			this.queue = this.queue.concat(fn.queue);
			return this;
		};
		comp.bottom = function compoBottom(fn){
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
		};
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
		queue.forEach(function(fn){
			var oldOne = null;
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
					oldOne = func;
					func = function compoDOAround(){
						if(arguments[0] instanceof Error)
							return arguments[0];
						return fn(oldOne).apply(this, arguments);
					};
					break;
				case "fail" :
					oldOne = func;
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
					oldOne = func;
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
		});
		return func;
	};

	deep.compositions = {
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