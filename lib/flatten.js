/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */

if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "./nodes/nodes", "./nodes/traversal", "./promise", "./compiler", "./sheet", "./protocol"], function(require, nodes, traversal, prom, compiler, sheeter, proto) {
	var flattener = {};
	// ________________________________________________ mount chain to handle stack application : i.e. add .done that does the job nicely
	function applyStack(chain, stack) {
		// console.log("apply stack ", stack)
		var stacki = stack[0],
			i = 0,
			tmp,
			topSheets = [];
		while (stacki) {
			tmp = [];
			while (stacki && !stacki._deep_sheet_ && typeof stacki !== 'function') {
				if(stacki._transformations)
					topSheets = topSheets.concat(stacki._transformations);
				tmp.unshift(stacki);
				stacki = stack[++i];
			}
			if (tmp.length > 0) {
				chain.done(function(entry) {
					// console.log("apply stack will apply non sheets" , tmp, " on ", entry.path, entry.value)
					entry.value = compiler.upFromArgs(entry.value, tmp, { excludeGrounds:true });
					return entry;
				});
			}
			if (!stacki)
				break;
			var sheets = [];
			while (stacki && (stacki._deep_sheet_ || typeof stacki === 'function')) {
				sheets.push(stacki);
				stacki = stack[++i];
			}
			chain.done(function(entry) {
				var s = entry.value;
				if (!s || !sheets.length)
					return entry;
				this.done(function (res) {
					if(res)
						if(res._deep_query_node_)
							entry.value = res.value;
						else 
							entry.value = res;
					return entry;
				})
				sheets.unshift(entry);
				return sheeter.sheet.apply(sheeter, sheets);
			});
			//.log("flatten applyStack done")
		}
		return topSheets;
	};
	//________________________________________________________ 
	var developStack = function(loadeds, entry) {
		// console.log("developStack : ", loadeds, entry.path, entry.value);
		var stack = [];
		var needLoad = false,
			len = loadeds.length;
		for (var i = 0; i < len; ++i) {
			var s = loadeds[i],
				r;
			if(!s)
				continue;
			if (typeof s === 'string') {
				// console.log("develop stack try to get : ", s, " from : ", entry.path, entry.value, entry.ancestor)
				r = proto.get(s, {
					entry: entry
				});
				stack.push(r);
				if (r && r.then)
					needLoad = true;
				continue;
			}
			if (s._backgrounds) {
				r = recurse(s._backgrounds, entry);
				stack.push(r);
				if (r && r.then)
					needLoad = true;
			}
			if (s._foregrounds) {
				r = recurse(s._foregrounds, entry);
				stack.push(r);
				if (r && r.then)
					needLoad = true;
			}
		}
		if (!stack.length)
			return loadeds;
		var treatStack = function(stack) {
			var finalStack = [];
			for (var i = 0; i < len; ++i) {
				var s = loadeds[i];
				if (s && s._backgrounds) {
					finalStack = finalStack.concat(stack.shift());
					//delete s._backgrounds;
				}
				if (typeof s === 'string')
					finalStack.push(stack.shift());
				else
					finalStack.push(s);
				if (s && s._foregrounds) {
					finalStack = finalStack.concat(stack.shift());
					//delete s._foregrounds;
				}
			}
			// console.log('final stack : ', finalStack);
			return finalStack;
		};
		if (!needLoad)
			return treatStack(stack);
		return prom.all(stack)
			.done(treatStack);
	};

	var recurse = function(array, entry) {
		var all = [];
		var needLoad = false;
		array.forEach(function(b) {
			if (typeof b === 'string') {
				var r = proto.get(b, {
					entry: entry
				});
				if (r && r.then)
					needLoad = true;
				all.push(r);
			} else
				all.push(b);
		});
		if (!needLoad)
			return developStack(all, entry);
		return prom.all(all)
		.done(function(res) {
			return developStack(res, entry);
		});
	};

	var test = function(value) {
		return value._backgrounds || value._foregrounds || value._deep_flattener_ || value._transformations;
	};
	var opt = {
		first: true,
		returnStack: true,
		excludeLeafs: true,
		minDepth:1
	};
	var extendsChilds = function(entry, descriptor, exclude) {
		//console.log("extends child : ", entry.path, entry.value, descriptor)
		descriptor = traversal.depthFirst(descriptor || entry, test, opt, exclude);
		if (!descriptor)
			return entry;
		var toExtends = descriptor.result;
		if (!toExtends)
			return entry;
		toExtends.post_actions = entry.post_actions;
		var r;
		if (toExtends.value._deep_flattener_)
		{
			r = toExtends.value.flatten(toExtends).when(entry);
		}
		else
			r = flattener.flatten(toExtends);
		if (r && r.then)
			return r
			.done(function() {
				return extendsChilds(entry, descriptor, exclude);
			});
		return extendsChilds(entry, descriptor, exclude);
	};

	var extendsGrounds = function(entry){
		if (!entry._deep_query_node_)
			entry = nodes.root(entry);
		var promises = [],
			obj = entry.value,
			r, wait;
		if (obj._backgrounds) {
			r = developStack(obj._backgrounds, entry);
			promises.push(r);
			if (r && r.then)
				wait = true;
		}
		if (obj._foregrounds) {
			r = developStack(obj._foregrounds, entry);
			promises.push(r);
			if (r && r.then)
				wait = true;
		}
		if (wait)
			return prom.all(promises);
		return prom.immediate(promises);
	};

	var flattenEntry = function(entry) {
		var obj = entry.value;
		// console.log("flatten entry : ", entry.path)
		return extendsGrounds(entry)
		.done(function(res) {
			//var toReturn = obj;
			if (obj._backgrounds) {
				delete obj._backgrounds;
				entry.value = obj._deep_sheet_ ? null : {};
				entry.transformations = applyStack(this, res.shift());
				this.done(function(entry) {
					if (entry.value)
						entry.value = compiler.abottom(entry.value, obj, { excludeGrounds:true });
					else
						entry.value = obj;					
					return entry;
				});
			}
			entry.transformations = entry.transformations || [];
			if(obj._transformations)
			{
				entry.transformations = entry.transformations.concat(obj._transformations);
				delete obj._transformations;
			}
			if (obj._foregrounds) {
				delete obj._foregrounds;
				entry.transformations = entry.transformations.concat(applyStack(this, res.shift()));
			}

			return entry;
		})
		.done(function(entry) {
			// console.log('flatten entry final : ', entry.path, entry.value);
			var s = entry.value;
			delete s._transformations;
			delete s._backgrounds;
			delete s._foregrounds;
			if(entry.transformations && entry.transformations.length)
				entry.post_actions.push(entry);
			entry.set(s);
			return entry;
		});
	}
	flattener.extendsGrounds = extendsGrounds;
	flattener.flatten = function(entry, exclude) {
		if (!entry)
			return entry;
		if(exclude)
		{
			var exc = {};
			for(var i = 0, len = exclude.length; i < len; ++i)
				exc[exclude[i]] = true;
			exclude = exc;
		}
		var returnValue = false;
		if (!entry._deep_query_node_)
		{
			returnValue = true;
			entry = nodes.root(entry);
		}
		var executePostActions = false;
		if(!entry.post_actions)
		{
			executePostActions = true;
			entry.post_actions = [];
		}
		var p;
		if(entry.value && entry.value._deep_flattener_)
			p = entry.value.flatten(entry).when(entry);
		else
		{
			p = prom.when(flattenEntry(entry))
			.done(function(s){
				return extendsChilds(s, null, exclude);
			});

			if(executePostActions)
				p.done(function(success){
					for(var i = 0, len = entry.post_actions.length; i < len; ++i)
					{
						var ent = entry.post_actions[i];
						if(ent.transformations && ent.transformations.length)
							nodes.sheet(ent, ent.transformations);
					}
				});
		}
		p.done(function (s) {
			return returnValue ? entry.value : entry;
		});
		return p;
	};

	nodes.flatten = function(s, exclude)
 	{
		if(!s)
			return prom.immediate(s);
		if(s._deep_array_)
		{
			var alls = [];
			s.forEach(function(node) {
				if (!node.value || typeof node.value !== 'object')
					return;
				alls.push(flattener.flatten(node, exclude));
			});
			if (alls.length === 0)
				return prom.immediate(s);
			return prom.all(alls)
				.done(function() {
					return s;
				});
		}
		var tmp = s;
		return flattener.flatten(tmp, exclude);
	};

	return flattener;
});