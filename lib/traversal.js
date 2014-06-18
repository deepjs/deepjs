/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
 
if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(["require", "./nodes"], function(require, nodes){
	var traversal = {};
	var setHierarchy = function addHierarchy(entry, cache, results)
	{
		if(entry.paths.length === 0)
		{
			results.push(entry);
			cache._deep_node_ = entry;
			entry.childs = [];
			entry.hierarch = null;
			return;
		}
		var len = entry.paths.length-1;
		var temp = cache;
		var last = cache._deep_node_ || null;
		for(var  i = 0; i < len; ++i)
		{
			var part = entry.paths[i];
			var tmp = temp[part];
			if(!tmp)
				temp[part] = tmp = {};
			if(tmp._deep_node_)
				last = tmp._deep_node_;
			temp = tmp;
		}
		var node = temp[entry.key] = { _deep_node_:entry };
		entry.hierarch = last;
		entry.childs = [];
		if(last)
			last.childs.push(entry);
		else
			results.push(entry);
	};

	traversal.depthFirst = function (root, test, options)
	{
		options = options || {};
		var res = [],
			current = null,
			stack = null,
			hierarchyCache = options.hierarchy?{}:null;

		if(root._deep_stack_)
			stack = root.stack;
		else
		{
			if(!root._deep_query_node_)
				root = nodes.root(root);
			stack = [root];
		}
		while(stack.length > 0)
		{
			current = stack.pop();
			//console.log("current : ", current);
			var v = current.value;
			if(!v)
				continue;
			if(test)
			{
				if(test(v))
					if(options.first)
					{
						if(options.returnStack)
							return { stack:stack, result:current, _deep_stack_:true };
						else
							return current;
					}
					else if(options.hierarchy)
						setHierarchy(current, hierarchyCache, res);
					else
						res.push(current);
			}
			else
				res.push(current);

			if(typeof v === 'function')
				continue;
			var r = [];
			var type = typeof v, va;
			if(type !== 'object' && type !== 'function')
				continue;
			if(v.forEach)
			{
				for(var i = 0, len = v.length; i < len; ++i)
				{
					va = v[i];
					type = typeof va;
					if( (options.excludeLeafs && type !== 'object' && type !== 'function') || (typeof jQuery !== 'undefined' && va instanceof jQuery)) // jQuery nodes contain cyclic value
						continue;
					r.unshift(nodes.create(i, current)); //{ path:current.path+i+'/', value:va });
				}
			}
			else
				for(var j in v)
				{
					va = v[j];
					type = typeof va;
					if( (options.excludeLeafs && type !== 'object' && type !== 'function') || (typeof jQuery !== 'undefined' && va instanceof jQuery))
						continue;
					r.unshift(nodes.create(j, current));
				}
			stack = stack.concat(r);
		}
		if(options.first && res.length === 0)
			return [];
		return res;
	};

	traversal.breadthFirst = function (root, test, options)
	{
		options = options || {};
		var res = [],
			current = null,
			stack = null,
			hierarchyCache = options.hierarchy?{}:null;
		if(root._deep_stack_)
			stack = root.stack;
		else
		{
			if(!root._deep_query_node_)
				root = nodes.root(root);
			stack = [root];
		}
		while(stack.length > 0)
		{
			current = stack.shift();
			var v = current.value;
			if(!v)
				continue;
			if(test)
			{
				if(test(v))
				{
					if(options.first)
					{
						if(options.returnStack)
							return { stack:stack, result:current, _deep_stack_:true };
						else
							return current;
					}
					else if(options.hierarchy)
						setHierarchy(current, hierarchyCache, res);
					else
						res.push(current);
				}
			}
			else
				res.push(current);
			var type = typeof v, va;
			if(type !== 'object' && type !== 'function')
				continue;
			if(v.forEach)
			{
				for(var i = 0, len = v.length; i < len; ++i)
				{
					va = v[i];
					type = typeof va;
					if((options.excludeLeafs && type !== 'object' && type !== 'function') || (typeof jQuery !== 'undefined' && va instanceof jQuery))
						continue;
					stack.push(nodes.create(i, current));
				}
			}
			else
				for(var j in v)
				{
					va = v[j];
					type = typeof va;
					if((options.excludeLeafs && type !== 'object' && type !== 'function') || (typeof jQuery !== 'undefined' && va instanceof jQuery))
						continue;
					stack.push(nodes.create(j, current));
				}
		}
		if(options.first && res.length === 0)
			return null;
		return res;
	};

	return traversal;
});