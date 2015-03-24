/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "./nodes", "../utils/array"], function(require, nodes, utils) {
	"use strict";
	var traversal = {};
	var setHierarchy = function addHierarchy(entry, cache, results) {
		if (entry.paths.length === 0) {
			results.push(entry);
			cache._deep_node_ = entry;
			entry.childs = [];
			entry.hierarch = null;
			return;
		}
		var len = entry.paths.length - 1;
		var temp = cache;
		var last = cache._deep_node_ ||  null;
		for (var i = 0; i < len; ++i) {
			var part = entry.paths[i];
			var tmp = temp[part];
			if (!tmp)
				temp[part] = tmp = {};
			if (tmp._deep_node_)
				last = tmp._deep_node_;
			temp = tmp;
		}
		var node = temp[entry.key] = {
			_deep_node_: entry
		};
		entry.hierarch = last;
		entry.childs = [];
		if (last)
			last.childs.push(entry);
		else
			results.push(entry);
	};


	var prepareTest = function(test, options) {
		if (options.inArray)
			return function(value) {
				if (value && value[options.inArray]) {
					var o = {}, sel = value[options.inArray],
						len = sel.length;
					for (var i = 0; i < len; ++i)
						o[sel[i]] = true;
					if (test(o))
						return true;
				}
				return false;
			};
		return test;
	}

/*
	traversal.traversalTransform = function(entry, test, transform, recurse, algo)
	{
		if(typeof algo !== 'function')
			switch(algo)
			{
				case 'df' : algo = traversal.depthFirst; break;
				case 'bf' : algo = traversal.breadthFirst; break;
				default: algo = traversal.depthFirst;
			}
		var opt = {
			first: true,
			returnStack: true,
			excludeLeafs: false
		};
		var descriptor = entry;
		var done = function(s){
			descriptor = algo(descriptor, test, opt);
			if(descriptor && descriptor.forEach)
				descriptor = descriptor[0];
			if (!descriptor)
				return;
			var d = deep.when(transform(descriptor.result));
			if(recurse)
				d.done(function(){
					return traversal.traversalTransform(descriptor.result, test, transform, recurse, algo);
				});
			return d.done(done);
		}
		return deep.when(done())
		.done(function(){
			return entry;
		});
	}
*/

	traversal.depthFirst = function(root, test, options, exclude) {
		options = options || {};
		if (typeof test === 'string')
			test = traversal.parseSelector(test);
		if (test && test.forEach) {
			var count1 = 0,
				count2 = 0,
				q, currents = [root],
				curr;
			while (q = test[count1++]) {
				var r = [];
				while (curr = currents[count2++])
					r = r.concat(traversal.depthFirst(curr, q, options));
				count2 = 0;
				currents = r;
			}
			return currents;
		}

		var res = [],
			current = null,
			stack = null,
			hierarchyCache = options.hierarchy ? {} : null;

		if (test)
			test = prepareTest(test, options);

		if (root._deep_stack_)
			stack = root.stack;
		else {
			if (!root._deep_query_node_)
				root = nodes.root(root);
			stack = [root];
		}
		var firstDepth = root.depth;

		while (stack.length > 0) {
			current = stack.pop();
			if ( exclude && exclude[current.path])
				continue;
			var v = current.value;
			if (!v)
				continue;
				//console.log("traversal : ", options.minDepth, current.depth, firstDepth);

			if(!options.minDepth || (options.minDepth && options.minDepth <= (current.depth-firstDepth)))
				if (test) {
						if (test(v))
						{
							if (options.hierarchy)
								setHierarchy(current, hierarchyCache, res);
							else  if (options.first) {
								if (options.returnStack)
									return {
										stack: stack,
										result: current,
										_deep_stack_: true,
										depth:firstDepth
									};
								else
									return current;
							} else
								res.push(current);
						}
				} else
					res.push(current);
			
			var type = typeof v, va;
			if (type === 'function' || (type !== 'object' && type !== 'function'))
				continue;
			var r = [];
			if (v.forEach) {
				for (var i = 0, len = v.length; i < len; ++i) {
					va = v[i];
					type = typeof va;
					if ((options.excludeLeafs && type !== 'object' && type !== 'function') || (typeof jQuery !== 'undefined' && va instanceof jQuery)) // jQuery nodes contain cyclic value
						continue;
					r.unshift(nodes.create(i, current)); //{ path:current.path+i+'/', value:va });
				}
			} else
				for (var j in v) {
					va = v[j];
					type = typeof va;
					if ((options.excludeLeafs && type !== 'object' && type !== 'function') || (typeof jQuery !== 'undefined' && va instanceof jQuery))
						continue;
					r.unshift(nodes.create(j, current));
				}
			stack = stack.concat(r);
		}
		if (options.first && res.length === 0)
			return [];
		return res;
	};

	traversal.breadthFirst = function(root, test, options, exclude) {
		options = options || {};
		if (typeof test === 'string')
			test = traversal.parseSelector(test);
		if (test && test.forEach) {
			var count1 = 0,
				count2 = 0,
				q, currents = [root],
				curr;
			while (q = test[count1++]) {
				var r = [];
				while (curr = currents[count2++])
					r = r.concat(traversal.breadthFirst(curr, q, options));
				count2 = 0;
				currents = r;
			}
			return currents;
		}

		var res = [],
			current = null,
			stack = null,
			hierarchyCache = options.hierarchy ? {} : null;
		if (test)
			test = prepareTest(test, options);

		if (root._deep_stack_)
			stack = root.stack;
		else {
			if (!root._deep_query_node_)
				root = nodes.root(root);
			stack = [root];
		}
		while (stack.length > 0) {
			current = stack.shift();
			if ( exclude && exclude[current.path])
				continue;
			var v = current.value;
			if (!v)
				continue;
			if(!options.minDepth || (options.minDepth && options.minDepth <= (current.depth-firstDepth)))
				if (test) {
					if (test(v)) {
						if (options.first) {
							if (options.returnStack)
								return {
									stack: stack,
									result: current,
									_deep_stack_: true
								};
							else
								return current;
						} else if (options.hierarchy)
							setHierarchy(current, hierarchyCache, res);
						else
							res.push(current);
					}
				} else
					res.push(current);
			var type = typeof v,
				va;
			if (type !== 'object' && type !== 'function')
				continue;
			if (v.forEach) {
				for (var i = 0, len = v.length; i < len; ++i) {
					va = v[i];
					type = typeof va;
					if ((options.excludeLeafs && type !== 'object' && type !== 'function') || (typeof jQuery !== 'undefined' && va instanceof jQuery))
						continue;
					stack.push(nodes.create(i, current));
				}
			} else
				for (var j in v) {
					va = v[j];
					type = typeof va;
					if ((options.excludeLeafs && type !== 'object' && type !== 'function') || (typeof jQuery !== 'undefined' && va instanceof jQuery))
						continue;
					stack.push(nodes.create(j, current));
				}
		}
		if (options.first && res.length === 0)
			return null;
		return res;
	};

	var selectorsCache = {};

	traversal.parseSelector = function(selector) {
		if (selectorsCache[selector])
			return selectorsCache[selector];
		var chars = selector[0];
		var res = [];
		var finalString = "";
		var index = 0;
		while (chars) {
			switch (chars) {
				case '|':
				case '&':
				case '(':
				case ')':
				case ' ':
				case '!':
					finalString += chars;
					chars = selector[++index];
					break;
				case '>':
					res.push(finalString);
					chars = selector[++index];
					finalString = "";
					break;
				default:
					finalString += "value.";
					var count = index,
						isEqual = false;
					while (chars) {
						var shouldBreak = false;
						switch (chars) {
							case '|':
							case '&':
							case '(':
							case ')':
								//case ' ':
							case '>':
							case '!':
								shouldBreak = true;
								break;
							case '=':
								finalString += selector.substring(index, count + 1) + "==";
								index = count + 1;
								break;
						}
						if (shouldBreak) {
							finalString += selector.substring(index, count);
							index = count;
							break;
						}
						chars = selector[++count];
						if (!chars)
							finalString += selector.substring(index, count);
					}
			}
		}
		finalString = finalString.replace("&", "&&").replace("|", "||").replace("value.this", "value");
		if (finalString.length > 0)
			res.push(finalString);

		res = res.map(function(q) {
			if (q !== "value.*" && q !== "")
				return new Function("value", "return " + q + ";");
			return function() {
				return true;
			};
		});

		selectorsCache[selector] = res;
		return res;
	};


	return traversal;
});