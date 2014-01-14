/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(["require"], function (require, deep)
{
	return function(deep){
	/**
	 * Flatten object. Means seek after and consum (apply) recursively any flattenable sub properties. (aka backgrounds or _deep_ocm_) 
	 * @param  {Object|_deep_query_node_} node the root object to flatten
	 * @return {deep.Promise}     the promise that gives flattened object
	 */
	deep.flatten = function utilsFlatten(node) {
		//console.log("deep.flatten : ", node.value);
		if(node._deep_flattener_)
			return node.flatten();
		if(typeof node !== 'object')
			return deep.when(node);
		if(!node._deep_query_node_)
			node = deep.utils.createRootNode(node);
		var finalise = function(){ return node.value; };
		if (node.value.backgrounds);
		{
			var r = deep.extendsBackgrounds(node);
			if(r && (r.then || r.promise))
				return deep.when(r)
					.done(deep.extendsChilds)
					.done(finalise);
			r = deep.extendsChilds(r);
			if(r && (r.then || r.promise))
				return deep.when(r).done(finalise);
			return deep.when(node.value);
		}
		var r2 = deep.extendsChilds(node);
		if(r2 && (r2.then || r2.promise))
			return deep.when(r2).done(finalise);
		return deep.when(node.value);
	};

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
	deep.Chain.addHandle("flatten", function () {
			var self = this;
			var doFlatten = function () {
				var alls = [];
				self._nodes.forEach(function (node) {
					if (!node.value || typeof node.value !== 'object')
						return;
					alls.push(deep.flatten(node));
				});
				if (alls.length === 0)
					return [];
				return deep.all(alls)
				.done(function () {
					return deep.chain.val(self);
				});
			};
			//flattenBackgrounds._isDone_ = true;
			doFlatten._isDone_ = true;
			//addInChain.apply(this, [flattenBackgrounds]);
			deep.utils.addInChain.apply(this, [doFlatten]);
			return this;
	});

	/**
	 * will perform the backgrounds application on any backgrounds properties at any level
	 *
	 *
	 * @method  extendsChilds

	 * @private
	 * @param  {DeepEntry} entry from where seeking after backgrounds properties
	 * @return {deep.Promise} a promise
	 */
	deep.extendsChilds = function extendsChilds(entry, descriptor)
	{
		//console.log("extends childs : ", entry, descriptor);
		if(!entry)
			return entry;
		if (!entry._deep_query_node_)
			entry = deep.utils.createRootNode(entry);
		//var toExtends = deep.Querier.firstObjectWithProperties(entry, "backgrounds|_deep_ocm_");
		descriptor = deep.utils.preorder(descriptor || entry, function(){ return this.backgrounds || this._deep_flattener_; }, {first:true, returnStack:true});
		//console.log("extendchilds : ", entry, descriptor);
		if(!descriptor)
			return entry;
		var toExtends = descriptor.result;
		if (!toExtends)
			return entry;
		function finalise() {
			if (toExtends.ancestor)
				toExtends.ancestor[toExtends.key] = toExtends.value;
			return entry;
		}
		function recurse2(toExt) {
			if (toExtends.ancestor)
				delete toExtends.ancestor[toExtends.key];
			var r = deep.extendsChilds(entry, descriptor);
			if(r && (r.then || r.promise))
				return deep.when(r)
				.done(finalise);
			return finalise();
		}
		function recurse(toExt) {
			var r = deep.extendsChilds(toExtends);
			if(r && (r.then || r.promise))
				return deep.when(r)
				.done(recurse2);
			return recurse2();
		}
		//if(toExtends.value._deep_flattener_)
		//	console.log("got child._deep_flattener_ : ", toExtends);
		if(toExtends.value._deep_flattener_)
			return toExtends.value.flatten(toExtends).done(function(){ return entry; });
		var r = deep.extendsBackgrounds(toExtends);
		if(r && (r.then || r.promise))
			return deep.when(r)
			.done(recurse);
		return recurse();
	};
	/**
	 * will perform the backgrounds application FIRSTLY and FULLY (full recursive) on current entries before appying extendsChild.
	 *
	 *	not intend to be call directly by programmer. use at your own risk : Use deep.Chain.flatten() instead.
	 *
	 * @method  extendsBackgrounds
	 * @private
	 * @param  {DeepEntry} entry from where seeking after backgrounds properties
	 * @return {deep.Promise} a promise
	 */
	deep.extendsBackgrounds = function extendsBackgrounds(entry)
	{
		//console.log("extends backgrounds : ", entry);
		if(!entry)
			return entry;
		if (!entry._deep_query_node_)
			entry = deep.utils.createRootNode(entry);
		var value = entry.value;
		if (!value.backgrounds)
			return entry;
		var extendsLoaded = function (loadeds)
		{
			//console.log("backgrounds loaded : ", loadeds);
			var stack = [];
			var needRecursion = false;
			loadeds.forEach(function (s) {
				if (s && s.backgrounds) {
					stack.push(getBackgrounds(s.backgrounds));
					needRecursion = true;
				}
			});
			if (!needRecursion)
				return loadeds;
			return deep.all(stack)
			.done(function (stack) {
				var finalStack = [];
				loadeds.forEach(function (s) {
					if (s && s.backgrounds)
						finalStack = finalStack.concat(stack.shift());
					finalStack.push(s);
				});
				return finalStack;
			});
		};
		var getBackgrounds = function (backgrounds)
		{
			var all = [];
			var needLoad = false;
			backgrounds.forEach(function (b) {
				if (typeof b === 'string') {
					var rget = deep.get(b, {
						entry: entry
					});
					all.push(rget);
					needLoad = true;
				} else
					all.push(b);
			});
			if (!needLoad)
				return extendsLoaded(all);
			return deep.all(all)
			.done(extendsLoaded);
		};
		var backgrounds = value.backgrounds;
		delete value.backgrounds;
		var r = getBackgrounds(backgrounds);

		if (r && r.then)
			return deep.when(r)
			.done(function (extendeds) {
				var len = extendeds.length-1;
				for(;len>=0;len--)
					deep.utils.bottom(extendeds[len], entry.value);
				delete entry.value.backgrounds;
				return entry;
			});
		var len = r.length-1;
		for(;len>=0;len--)
			deep.utils.bottom(r[len], entry.value);
		delete entry.value.backgrounds;
		return entry;
	};

	//_____________________________________________________________________________ test perf

	deep.flatten.test = function(num){
		num = num || 100;
		console.time("test flatten");
		if(console.profile)
			console.profile("test flatten");
		for(var i = 0; i < num; ++i)
		{
			var bc2 = {
				test:2
			};

			var bc = {
				test:1
			};

			var b = {
				backgrounds:[bc]
			};

			deep.flatten({
				backgrounds:[bc2, b],
				c:{
					backgrounds:[b],
					prop:2
				},
				d:{
					backgrounds:["this::../c"],
					yop:{
						la:{
							backgrounds:[{ jos:true }],
							boum:true
						}
					}
				}
			});
			//.log();
		}
		if(console.profile)
			console.profileEnd("test flatten");
			console.timeEnd("test flatten");
	};

	deep.utils.flatten = deep.flatten;
	return deep;
}
});


