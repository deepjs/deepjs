/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "./utils", "./compiler"], function (require, utils)
{
	var flattener = {};
	/**
	 * Flatten object. Means seek after and consum (apply) recursively any flattenable sub properties. (aka backgrounds or _deep_ocm_) 
	 * @param  {Object|_deep_query_node_} node the root object to flatten
	 * @return {deep.Promise}     the promise that gives flattened object
	 */
	// todo manage list of arguments : compile them when flattened
	flattener.flatten = function flatten(node) {
		//console.log("deep.flatten : ", node.value);
		if(node._deep_flattener_)
			return node.flatten();
		if(typeof node !== 'object')
			return deep.when(node);
		if(!node._deep_query_node_)
			node = utils.createRootNode(node);
		var finalise = function(){ return node.value; };
		if (node.value.backgrounds);
		{
			var r = flattener.extendsBackgrounds(node);
			if(r && (r.then || r.promise))
				return deep.when(r)
					.done(deep.extendsChilds)
					.done(finalise);
			r = deep.extendsChilds(r);
			if(r && r.then)
				return r.done(finalise);
			return deep.when(node.value);
		}
		var r2 = flattener.extendsChilds(node);
		if(r2 && (r2.then || r2.promise))
			return deep.when(r2).done(finalise);
		return deep.when(node.value);
	};



	/**
	 * will perform the backgrounds application on any backgrounds properties at any level
	 *
	 *
	 * @method  extendsChilds

	 * @private
	 * @param  {DeepEntry} entry from where seeking after backgrounds properties
	 * @return {deep.Promise} a promise
	 */
	flattener.extendsChilds = function extendsChilds(entry, descriptor)
	{
		//console.log("extends childs : ", entry, descriptor);
		if(!entry)
			return entry;
		if (!entry._deep_query_node_)
			entry = utils.createRootNode(entry);
		//var toExtends = deep.Querier.firstObjectWithProperties(entry, "backgrounds|_deep_ocm_");
		descriptor = utils.preorder(descriptor || entry, function(){ return this.backgrounds || this._deep_flattener_; }, {first:true, returnStack:true});
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
			if(r && r.then)
				return r.then(finalise);
			return finalise();
		}
		function recurse(toExt) {
			var r = flattener.extendsChilds(toExtends);
			if(r && r.then)
				return r.then(recurse2);
			return recurse2();
		}
		//if(toExtends.value._deep_flattener_)
		//	console.log("got child._deep_flattener_ : ", toExtends);
		if(toExtends.value._deep_flattener_)
			return toExtends.value.flatten(toExtends).done(function(){ return entry; });
		var r = flattener.extendsBackgrounds(toExtends);
		if(r && r.then)
			return r.done(recurse);
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
	flattener.extendsBackgrounds = function extendsBackgrounds(entry)
	{
		// console.log("extends backgrounds : ", entry);
		if(!entry)
			return entry;
		if (!entry._deep_query_node_)
			entry = utils.createRootNode(entry);
		var value = entry.value;
		if (!value.backgrounds)
			return entry;
		var extendsLoaded = function (loadeds)
		{
			// console.log("backgrounds loaded : ", loadeds);
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
			return r
			.done(function (extendeds) {
				var len = extendeds.length-1;
				for(;len>=0;len--)
				{
					entry.value = utils.bottom(extendeds[len], entry.value);
					if(entry.ancestor)
						entry.ancestor.value[entry.key] = entry.value;
				}
				delete entry.value.backgrounds;
				return entry;
			});
		var len = r.length-1;
		for(;len>=0;len--)
		{
			entry.value = utils.bottom(r[len], entry.value);
			if(entry.ancestor)
				entry.ancestor.value[entry.key] = entry.value;
		}
		delete entry.value.backgrounds;
		return entry;
	};

	//_____________________________________________________________________________ test perf
	return flattener;
});


