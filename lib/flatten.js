/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */

if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "./nodes", "./traversal"], function(require, nodes, traversal) {
	var flattener = {};
	// ________________________________________________ mount chain to handle stack application : i.e. add .done that does the job nicely
	function applyStack(chain, stack) {
		var stacki = stack[0],
			i = 0;
		while (stacki) {
			var tmp = [];
			while (stacki && !stacki._deep_sheet_) {
				tmp.unshift(stacki)
				stacki = stack[++i];
			}
			if (tmp.length > 0) {
				chain.done(function(s) {
					tmp.push(s);
					return deep.up.apply(deep, tmp);
				});
			}
			if (!stacki)
				break;
			var sheet = {};
			while (stacki && stacki._deep_sheet_) {
				sheet = deep.up(stacki, sheet);
				stacki = stack[++i];
			}
			chain.done(function(s) {
				if (!s)
					return sheet;
				if (!s._deep_sheet_)
					return deep.sheet(sheet, s);
				else
					return deep.up(sheet, s);
			});
		}
	}
	//________________________________________________________ 
	var developStack = function(loadeds, entry) {
		// console.log("developStack : ", loadeds);
		var stack = [];
		var needLoad = false,
			len = loadeds.length;
		for (var i = 0; i < len; ++i) {
			var s = loadeds[i],
				r;
			if (s && s._backgrounds) {
				r = recurse(s._backgrounds, entry);
				stack.push(r);
				if (r && r.then)
					needLoad = true;
			}
			if (typeof s === 'string') {
				r = deep.get(s, {
					entry: entry
				});
				stack.push(r);
				if (r && r.then)
					needLoad = true;
			}
			// stack.push(s);
			if (s && s._foregrounds) {
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
					delete s._backgrounds;
				}
				if (typeof s === 'string')
					finalStack.push(stack.shift());
				else
					finalStack.push(s);
				if (s && s._foregrounds) {
					finalStack = finalStack.concat(stack.shift());
					delete s._foregrounds;
				}
			}
			return finalStack;
		};
		if (!needLoad)
			return treatStack(stack);
		return deep.all(stack)
			.done(treatStack);
	};
	var recurse = function(array, entry) {
		var all = [];
		var needLoad = false;
		array.forEach(function(b) {
			if (typeof b === 'string') {
				var r = deep.get(b, {
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
		return deep.all(all)
		.done(function(res) {
			return developStack(res, entry);
		});
	};

	var test = function(value) {
		return value._backgrounds || value._foregrounds || value._deep_flattener_;
	}
	var opt = {
		first: true,
		returnStack: true,
		excludeLeafs: true
	};
	var extendsChilds = function(entry, descriptor) {
		descriptor = traversal.depthFirst(descriptor || entry, test, opt);
		if (!descriptor)
			return entry;
		var toExtends = descriptor.result;
		if (!toExtends)
			return entry;
		if (toExtends.value._deep_flattener_)
			return toExtends.value.flatten(toExtends)
		var r = flattener.flatten(toExtends);
		if (r && r.then)
			return r
			.done(function() {
				return extendsChilds(entry, descriptor);
			});
		return extendsChilds(entry, descriptor);
	}
	var flattenEntry = function(entry) {
		var promises = [];
		var obj = entry.value,
			r, wait, d;
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
			d = deep.all(promises);
		else
			d = deep.when.immediate(promises);
		return d.done(function(res) {
			var toReturn = obj;
			if (obj._backgrounds) {
				delete obj._backgrounds;
				toReturn = (obj._deep_sheet_ ? null : {});
				applyStack(this, res.shift());
				this.done(function(bck) {
					if (bck)
						return deep.bottom(bck, obj);
					return obj;
				});
			}
			if (obj._foregrounds) {
				delete obj._foregrounds;
				applyStack(this, res.shift());
			}
			return toReturn;
		})
		.done(function(s) {
			entry.value = s;
			if (entry.ancestor)
				entry.ancestor.value[entry.key] = s;
			return entry;
		});
	}
	flattener.flatten = function(entry) {
		if (!entry)
			return entry;
		if (!entry._deep_query_node_)
			entry = nodes.root(entry);
		var r = flattenEntry(entry);
		if (r && r.then)
			return r
			.done(extendsChilds)
			.when(entry.value);
		r = extendsChilds(entry);
		if (r && r.then)
			return r.when(entry.value);
		return entry.value;
	}
	return flattener;
});