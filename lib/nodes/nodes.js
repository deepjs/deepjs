/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * @module deep
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "../promise", "../utils", "../compiler", "../utils/logs", "../protocol", "./nodes-create"], function(require, prom, utils, compiler, logs, proto, nodes) {

		nodes.val = function(s) {	// return value(s) from node(s)
			if (!s)
				return s;
			if (s._deep_array_)
				return s.map(function(e) {
					return e.value;
				});
			if (s._deep_query_node_)
				return s.value;
			return s;
		};
		nodes.paths = function(nodes) {	// return paths from node(s)
			if (nodes._deep_query_node_)
				return [nodes.path];
			return nodes.map(function(e) {
				return e.path;
			});
		};
		nodes.schemas = function(nodes) {	// return schemas from node(s)
			if (nodes._deep_query_node_)
				return [nodes.schema];
			return nodes.map(function(e) {
				return e.schema;
			});
		};
		nodes.each = function(node, transformer) {  // loop on node(s)
			if(node._deep_query_node_)
				return transformer(node);
			node.forEach(function(n){
				transformer(n);
			});
			return node;
		};
		nodes.map = function(node, transformer) {  // transform node(s) value(s)
			if(!node)
				return transformer(node);
			if (node._deep_query_node_) {
				var r = transformer(node);
				if (r && (r.then || r.promise))
					return promise.when(r)
						.done(function(r) {
							node.set(r);
						});
				node.set(r);
				return r;
			}
			if(!node.forEach)
				return tansformer(node);
			return prom.all(node.map(transformer))
			.done(function(res) {
				var count = 0;
				//if(node._deep_array_)
					node.forEach(function(n) {
						n.set(res[count++]);
					});
			});
		};
		nodes.asyncUps = function(s, objects){	// load 
			return proto.getAll(objects)
			.done(function(objects){
				return nodes.ups(s, objects);
			});
		};
		nodes.ups = function(s, objects) {
			if(s._deep_query_node_)
				objects.forEach(function(object) {
					s.set(compiler.aup(object, s.value));
				});
			else if(s._deep_array_)
				s.forEach(function(result) {
					objects.forEach(function(object) {
						result.set(compiler.aup(object, result.value));
					});
				});
			else
				objects.forEach(function(object) {
					s = compiler.aup(object, s);
				});
			return s;
		};
		nodes.asyncBottoms = function(s, objects){
			return proto.getAll(objects)
			.done(function(objects){
				return nodes.bottoms(s, objects);
			});
		};
		nodes.bottoms = function(s, objects) {
			if(s._deep_query_node_)
				objects.forEach(function(object) {
					s.set(compiler.abottom(object, s.value));
				});
			else if(s._deep_array_)
				s.forEach(function(result) {
					objects.forEach(function(object) {
						result.set(compiler.abottom(object, result.value));
					});
				});
			else
				objects.forEach(function(object) {
					s = compiler.abottom(object, s);
				});
			return s;
		};

	nodes.clone = function(node) {
		//console.log("deep.utils.nodes.create : "+path+" : schema : ",schema)
		var clone = utils.shallowCopy(node);
		if (clone.paths)
			clone.paths = clone.paths.slice();
		return clone;
	};


	var stringify = function(key, value) {
		if (value && value._deep_query_node_)
			return nodes.print(value);
		if (typeof value === 'function')
			return 'Function';
		if (value instanceof Date)
			return value.toString();
		if (value instanceof RegExp)
			return value.toString();
		if (typeof jQuery !== 'undefined' && value instanceof jQuery)
			return "jquery:" + value.selector;
		return value;
	};
	utils.stringify = function(value, nospace) {
		return JSON.stringify(value, stringify, nospace ? null : ' ');
	};



	return nodes;
})