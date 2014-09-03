/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
 
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "../query", "../utils"], function(require, Querier, utils){
	//_______________________________________________________ QUERY UTILS
	utils.remove = function(obj, what, schema) {
		var removed = [];

		function finalise(r) {
			if (!r.ancestor)
				return;
			removed.push(r);
			if (r.ancestor.value instanceof Array)
				r.ancestor.value.splice(r.key, 1);
			else {
				delete r.ancestor.value[r.key];
			}
		}
		r = Querier.query(obj, what, {
			fullOutput: true,
			schema: schema
		});
		//console.log("deep.utils.remove : ", obj, what, r);
		if (!r)
			return r;
		if (r._deep_query_node_) {
			finalise(r);
			return removed.shift();
		}
		r.forEach(finalise);
		return removed;
	};

	utils.replace = function(target, what, by, schema) {
		var replaced = [];

		function finalise(r) {
			if (!r.ancestor)
				return;
			r.ancestor.value[r.key] = r.value = by;
			replaced.push(r);
		}
		var r = Querier.query(target, what, {
			fullOutput: true,
			schema: schema
		});
		if (!r)
			return r;
		if (r._deep_query_node_) {
			finalise(r);
			return replaced.shift();
		}
		r.forEach(finalise);
		return replaced;
	};
	return utils;
});