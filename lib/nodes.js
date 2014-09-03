/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * @module deep
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "./promise", "./utils", "./compiler", "./logs", "./protocol"], function(require, prom, utils, compiler, logs, proto) {

	var nodes = {
		val: function(s) {
			if (!s)
				return s;
			if (s._deep_array_)
				return s.map(function(e) {
					return e.value;
				});
			if (s._deep_query_node_)
				return s.value;
			return s;
		},
		paths: function(nodes) {
			if (nodes._deep_query_node_)
				return [nodes.path];
			return nodes.map(function(e) {
				return e.path;
			});
		},
		schemas: function(nodes) {
			if (nodes._deep_query_node_)
				return [nodes.schema];
			return nodes.map(function(e) {
				return e.schema;
			});
		},
		map: function(node, transformer) {
			if(!node)
				return transformer(node);
			if (node._deep_query_node_) {
				var r = transformer(node);
				if (r && (r.then || r.promise))
					return deep.when(r)
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
		},
		asyncUps:function(s, objects){
			return proto.getAll(objects)
			.done(function(objects){
				return nodes.ups(s, objects);
			});
		},
		ups:function(s, objects) {
			if(s._deep_query_node_)
				objects.forEach(function(object) {
					s.value = compiler.up(object, s.value);
					if(s.ancestor)
						s.ancestor.value[s.key] = s.value;
				});
			else if(s._deep_array_)
				s.forEach(function(result) {
					objects.forEach(function(object) {
						result.value = compiler.up(object, result.value);
						if(result.ancestor)
							result.ancestor.value[result.key] = result.value;
					});
				});
			else
				objects.forEach(function(object) {
					s = compiler.up(object, s);
				});
			return s;
		},
		asyncBottoms:function(s, objects){
			return proto.getAll(objects)
			.done(function(objects){
				return nodes.bottoms(s, objects);
			});
		},
		bottoms:function(s, objects) {
			if(s._deep_query_node_)
				objects.forEach(function(object) {
					s.value = compiler.bottom(object, s.value);
					if(s.ancestor)
						s.ancestor.value[s.key] = s.value;
				});
			else if(s._deep_array_)
				s.forEach(function(result) {
					objects.forEach(function(object) {
						result.value = compiler.bottom(object, result.value);
						if(result.ancestor)
							result.ancestor.value[result.key] = result.value;
					});
				});
			else
				objects.forEach(function(object) {
					s = compiler.bottom(object, s);
				});
			return s;
		}
	};

	/**
	 * create a DeepQuery entry that hold info of objet node (path, value, ancestor, etc)
	 * @method create
	 * @param  {[type]} key
	 * @param  {[type]} ancestor
	 * @return {[type]}
	 */
	nodes.create = function(key, ancestor) {
		var path = ancestor.path;
		if (!ancestor.key)
			path += key;
		else
			path += "/" + key;

		var schema = null;
		if (ancestor.schema)
			schema = utils.retrieveFullSchemaByPath(ancestor.schema, key, "/");
		//console.log("deep.nodes.create : "+path+" : schema : ",schema)
		return {
			_deep_query_node_: true,
			root: ancestor.root || ancestor,
			value: ancestor.value[key],
			path: path,
			paths: ancestor.paths.concat(key),
			key: key,
			ancestor: ancestor,
			schema: schema,
			depth: ancestor.depth + 1
			/*,
			toString:function(){
				return nodes.print(this);
			}*/
		};
	};

	nodes.clone = function(node) {
		//console.log("deep.nodes.create : "+path+" : schema : ",schema)
		var clone = utils.shallowCopy(node);
		if (clone.paths)
			clone.paths = clone.paths.slice();
		return clone;
	};

	/**
	 * create a root DeepQuery node
	 *
	 * @static
	 * @method root
	 * @param  {Object} obj
	 * @param  {Object} schema
	 * @return {Object} a DeepQuery root node
	 */
	nodes.root = function(obj, schema, options) {
		options = options || {};
		if (obj && obj._deep_undefined_)
			obj = undefined;
		var node = {
			_deep_query_node_: true,
			value: obj,
			path: "/",
			paths: [],
			uri: options.uri || null,
			key: null,
			ancestor: null,
			schema: schema,
			depth: 0
			/*,
			toString:function(){
				return nodes.print(this);
			}*/
		};
		//node.root = node;
		return node;
	};
	return nodes;
})