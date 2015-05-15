/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * 
 */
 
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "./nodes", "../utils", "./query", "../promise", "../protocol"], function(require, nodes, utils, querier, prom, protoc){
	nodes.deepLoad = function(entry, context, destructive, excludeFunctions){
		var doDeepLoad = function(toLoad) {
			var value = toLoad.value;
			if (value && value._deep_ocm_)
				value = value();
			switch(typeof value){
				case 'string' :
					if (context)
						value = utils.interpret(value, context);
					var s = protoc.get(value, {
						entry: toLoad
					});
					if (s && s.then)
						return prom.when(s)
							.then(function(s) {
								if (s && s._deep_ocm_)
									return s();
							});
					if (s && s._deep_ocm_)
						return s();
					return s;
				case 'function' :
					var d = null;
					if (toLoad.ancestor)
						d = value.call(toLoad.ancestor.value, context);
					else
						d = value(context);
					if (d && d.then)
						return prom.when(d)
						.done(function(s) {
							if (s && s._deep_ocm_)
								return s();
						});
					return d;
				default :
					return value;
			}
		};
		res = [];
		var value = entry.value,
			toLoads;
		if (value._deep_ocm_)
			value = value();
		if (value && value._deep_loadable_ === false)
			return entry;
		if (!destructive) {
			entry = utils.simpleCopy(entry);
			entry.value = utils.copy(value);
		} else
			entry.value = value;
		if (typeof value === 'object') {
			var query = (excludeFunctions) ? ".//!?_type=string" : ".//!?or(_type=string,_type=function)";
			toLoads = querier.query(entry, query, {
				fullOutput: true
			});
		} else {
			if (!destructive)
				entry.ancestor = null;
			toLoads = [entry];
			toLoads._deep_array_ = true;
		}

		return nodes.map(toLoads, doDeepLoad)
			.when(entry.value);
	};
});