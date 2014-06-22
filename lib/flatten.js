/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "./utils", "./compiler", "./nodes", "./traversal"], function (require, utils, compiler, nodes, traversal)
{
	var flattener = {};
	/**
	 * Flatten object. Means seek after and consum (apply) recursively any flattenable sub properties. (aka backgrounds or _deep_ocm_) 
	 * @param  {Object|_deep_query_node_} node the root object to flatten
	 * @return {deep.Promise}     the promise that gives flattened object
	 */
	// todo manage list of arguments : compile them when flattened
	flattener.flatten = function (node) {
		//console.log("deep.flatten : ", node.value);
		if(node._deep_flattener_)
			return node.flatten();
		if(typeof node !== 'object')
			return deep.when(node);
		if(!node._deep_query_node_)
			node = nodes.root(node);
		var finalise = function(){ return node.value; };
		var r = flattener.extendsBackgrounds(node);
		if(r && (r.then || r.promise))
			return deep.when(r)
				.done(deep.extendsChilds)
				.done(finalise);
		r = deep.extendsChilds(r);
		if(r && r.then)
			return r.done(finalise);
		return deep.when(node.value);
	};

	/**
	 * will perform the backgrounds application on any backgrounds properties at any depth
	 *
	 *
	 * @method  extendsChilds

	 * @private
	 * @param  {DeepEntry} entry from where seeking after backgrounds properties
	 * @return {deep.Promise} a promise
	 */
	flattener.extendsChilds = function (entry, descriptor)
	{
		//console.log("extends childs : ", entry, descriptor);
		if(!entry)
			return entry;
		if (!entry._deep_query_node_)
			entry = nodes.root(entry);
		//var toExtends = deep.Querier.firstObjectWithProperties(entry, "backgrounds|_deep_ocm_");
		descriptor = traversal.depthFirst(descriptor || entry, function(value){ return value._backgrounds || value._deep_flattener_; }, {first:true, returnStack:true, excludeLeafs:true });
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
	flattener.extendsBackgrounds = function (entry)
	{
		// console.log("extends backgrounds : ", entry);
		if(!entry)
			return entry;
		if (!entry._deep_query_node_)
			entry = nodes.root(entry);
		var value = entry.value;
		if (!value._backgrounds)
		{
			 if(value._sheets)
			    return deep.getAll(value._sheets, { entry:entry })
				.done(function(success){
					delete value._sheets;
					return deep.sheets(success, value, { entry:entry });
				})
				.done(function(){
					return entry;
				});
			return entry;
		}
		var extendsLoaded = function (loadeds)
		{
			// console.log("backgrounds loaded : ", loadeds);
			var stack = [];
			var needRecursion = false;
			for(var i = 0, len = loadeds.length;i<len;++i)
			{
				var s = loadeds[i];
				if (s && s._backgrounds) {
					stack.push(getBackgrounds(s._backgrounds));
					needRecursion = true;
				}
			}
			if (!needRecursion)
				return loadeds;
			return deep.all(stack)
			.done(function (stack) {
				var finalStack = [];
				for(var i = 0, len = loadeds.length;i<len;++i)
				{
					var s = loadeds[i];
					if (s && s._backgrounds)
						finalStack = finalStack.concat(stack.shift());
					finalStack.push(s);
				}
				return finalStack;
			});
		};
		var getBackgrounds = function (backgrounds)
		{
			var all = [];
			var needLoad = false;
			backgrounds.forEach(function (b) {
				if (typeof b === 'string') {
					all.push(deep.get(b, {
						entry: entry
					}));
					needLoad = true;
				} else
					all.push(b);
			});
			if (!needLoad)
				return extendsLoaded(all);
			return deep.all(all)
			.done(extendsLoaded);
		};
		var backgrounds = value._backgrounds;
		delete value._backgrounds;
		var r = getBackgrounds(backgrounds);
		var finalise = function(extendeds){
			// var len = extendeds.length-1;
			var sheets = [], bck = null;
			for(var i = 0, len = extendeds.length; i < len;++i)
			{
				var val = extendeds[i];
				if(val._deep_sheet_)
				{
					if(!bck)
						bck = deep.utils.copy(val);
					else if(bck._deep_sheet_)
						bck = utils.up(val, bck);
					else
						sheets.push(deep.sheet(val, bck));
				}
				else
					bck = utils.up(val, bck || {});
			}
			delete entry.value._backgrounds;
			var value = entry.value = utils.bottom(bck, entry.value);
			if(entry.ancestor)
				entry.ancestor.value[entry.key] = value;

			if(sheets.length > 0)
				return deep.all(sheets)
				.done(function(success){
					if(value._sheets)
					    return deep.getAll(value._sheets, { entry:entry })
						.done(function(success){
							delete value._sheets;
							return deep.sheets(success, value, { entry:entry });
						});
				})
				.done(function(){
					return entry;
				});
			else if(value._sheets)
			    return deep.getAll(value._sheets, { entry:entry })
				.done(function(success){
					delete value._sheets;
					return deep.sheets(success, value, { entry:entry });
				})
				.done(function(){
					return entry;
				});
			return entry;
		};
		if (r.then)
			return r.then(finalise);
		return finalise(r);
	};

	//_____________________________________________________________________________ test perf
	return flattener;
});


