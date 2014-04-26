/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * @module deep
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "./promise", "./utils", "./protocol", "./query"], function(require, prom, utils, protoc, querier){

	var nodes = {
		stringify: function (nodes, options) {
			options = options || {};
			var res = "";
			handler._state.nodes.forEach(function(e) {
				if (options.pretty)
					res += JSON.stringify(e.value, null, ' ') + "\n";
				else
					res += JSON.stringify(e.value) + "\n";
			});
			return res;
		},
		values: function (nodes) {
			var res = [];
			nodes.forEach(function(e) {
				res.push(e.value);
			});
			return res;
		},
		paths: function (nodes) {
			var res = [];
			nodes.forEach(function(e) {
				res.push(e.paths);
			});
			return res;
		},
		schemas: function(nodes) {
			var res = [];
			nodes.forEach(function(e) {
				res.push(e.schema);
			});
			return res;
		},
		transform:function(node, transformer)
		{
			var r = transformer(node);
			if(r && (r.then || r.promise))
				return deep.when(r)
				.done(function(r){
					node.value = r;
				    if (node.ancestor)
						node.ancestor.value[node.key] = node.value;
				})
			node.value = r;
		    if (node.ancestor)
				node.ancestor.value[node.key] = node.value;
			return r;
		}
	};


	nodes.applyTransformers = function(object, schema)
	{
		if(!object._deep_query_node_)
			object = nodes.root(object, schema);
		//console.log("apply Transfor on : ", object);
		var query = ".//?_schema.transformers";
		deep.query( object, query, { resultType:"full", schema:schema } )
		.forEach(function(node){
			for(var i = 0, len = node.schema.transformers.length; i < len; ++i)
				deep.nodes.transform(node, node.schema.transformers[i]);
		});
	};

	nodes.transformNodes = function transformNodes(nodes, transformer) {
		var results = [];
		nodes.forEach(function(e) {
			results.push(transformer(e));
		});
		return prom.all(results)
			.done(function(res) {
				var count = 0;
				nodes.forEach(function(n) {
					n.value = res[count++];
					if (n.ancestor)
						n.ancestor.value[n.key] = n.value;
				});
			});
	};
/**
	 * create a DeepQuery entry that hold info of objet node (path, value, ancestor, etc)
	 * @method create
	 * @param  {[type]} key
	 * @param  {[type]} ancestor
	 * @return {[type]}
	 */
	nodes.create = function createNode(key, ancestor)
	{
		var path = ancestor.path;
		if(!ancestor.key)
			path += key;
		else
			path += "/"+key;

		var schema = null;
		if(ancestor.schema)
			schema = utils.retrieveFullSchemaByPath(ancestor.schema, key, "/");
		//console.log("deep.nodes.create : "+path+" : schema : ",schema)
		return {
			_deep_query_node_:true,
			root:ancestor.root,
			value:ancestor.value[key],
			path:path,
			paths:ancestor.paths.concat(key),
			key:key,
			ancestor:ancestor,
			schema:schema,
			depth:ancestor.depth+1
		};
	};

	nodes.clone = function (node)
	{
		//console.log("deep.nodes.create : "+path+" : schema : ",schema)
		var clone = utils.simpleCopy(node);
		if(clone.paths)
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
	nodes.root = function (obj, schema, options) {
		options = options || {};
		if(obj && obj._deep_undefined_)
			obj = undefined;
		var node =  {
			_deep_query_node_:true,
			value:obj,
			path:"/",
			paths:[],
			uri:options.uri || null,
			key:null,
			ancestor:null,
			schema:schema,
			depth:0
		};
		node.root = node;
		return node;
	};

	nodes.deepLoad = function(entries, context, destructive, excludeFunctions) {
		var doDeepLoad = function(toLoad) {
			var value = toLoad.value;
			if(value && value._deep_ocm_)
				value = value();
			var type = typeof value;
			if (type === 'string') {
				if (context)
					value = utils.interpret(value, context);
				var s  = protoc.get(value, {entry: toLoad});
				if(s && s.then)
					return prom.when(s)
					.then(function(s){
						if(s && s._deep_ocm_)
							return s();
					});
				if(s && s._deep_ocm_)
					return s();
				return s;
			} else if (type === 'function') {
				var d = null;
				if (toLoad.ancestor)
					d = value.call(toLoad.ancestor.value, context);
				else
					d = value(context);
				if(d && d.then)
					return prom.when(d)
					.done(function(s){
						if(s && s._deep_ocm_)
							return s();
					});
				return d;
			} else
				return value;
		};
		var toloads = [], res = [];
		for(var i = 0, len = entries.length; i < len; ++i)
		{
			var entry = entries[i];
			var value = entry.value, toLoads;
			if(value._deep_ocm_)
				value = value();
			if (!destructive) {
				entry = utils.simpleCopy(entry);
				entry.value = utils.copy(value);
			}
			else 
				entry.value = value;
			res.push(entry);
			if (typeof value === 'object') {
				var query = (excludeFunctions)?".//!?_type=string":".//!?or(_type=string,_type=function)";
				toloads.push.apply(toloads, querier.query(entry, query, {
					resultType: "full"
				}));
			}
			else
				toloads.push(entry);
		}
		return nodes.transformNodes(toloads, doDeepLoad)
		.done(function(){
			return nodes.values(res);
		})
	};

	return nodes;
})