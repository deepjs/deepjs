/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */

if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "../utils/schema"], function(require, utils) {


	var Node = function(value, schema){
		this._deep_query_node_ = true;
	};
	Node.prototype = {
		toString: function(full) {
			var r = "[QueryNode : " + this.path + " : value : " + utils.stringify(this.value);
			if(full)
			{
				if(this.schema) 
					r += " - schema : " + utils.stringify(this.schema);
				r += " - depth : " + this.depth;
			}
			r += "]";
			return r;
		},
		set: function(value) {
			this.value = value;
			if (this.ancestor)
				this.ancestor.value[this.key] = value;
		}
	};

	var nodes = nodes || {};
	/**
	 * create a root DeepQuery node
	 *
	 * @static
	 * @method root
	 * @param  {Object} obj
	 * @param  {Object} schema
	 * @return {Object} a DeepQuery root node
	 */
	nodes.root = function(obj, schema) {
		if (obj && obj._deep_undefined_)
			obj = undefined;
		var node = new Node();
		node.value = obj;
		node.path = "/";
		node.paths = [];
		node.key = null;
		node.ancestor = null;
		node.schema = schema;
		node.depth = 0;
		node.root = null;
		return node;
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
		//console.log("deep.utils.nodes.create : "+path+" : schema : ",schema)
		var node = new Node();
		node.value = ancestor.value[key];
		node.path = path;
		node.paths = ancestor.paths.concat(key);
		node.key = key;
		node.ancestor = ancestor;
		node.schema = schema;
		node.depth = ancestor.depth + 1;
		node.root = ancestor.root || ancestor;
		return node;
	};

	return nodes;

});