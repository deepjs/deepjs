/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */

if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "deep-nodes/index", "deep-utils/lib/interpret", "deep-compiler/index", "deep-nodes/lib/query", "./promise"], function(require, nodes, utils, compiler, Querier, promise) {
	//_____________________ NODES

	nodes.interpret = function(node, context, destructive) {
		return nodes[destructive ? "transform" : "map"](node, function(node) {
			if (!node)
				return node;
			return utils.interpret(node._deep_query_node_ ? node.value : node, context);
		});
	};

	nodes.up = function() {
		var args = Array.prototype.slice.call(arguments);
		return nodes.transform(args[0], function(node) {
			if (!node)
				return node;
			if (node._deep_query_node_) {
				args[0] = node.value;
				return compiler.up.apply(compiler, args);
			}
			return compiler.up.apply(compiler, args);
		});
	};

	nodes.bottom = function() {
		var args = Array.prototype.slice.call(arguments);
		var node = args.shift();
		args.push(node);
		return nodes.transform(node, function(node) {
			if (!node)
				return node;
			if (node._deep_query_node_) {
				args[args.length - 1] = node.value;
				return compiler.bottom.apply(compiler, args);
			}
			args[args.length - 1] = node;
			return compiler.bottom.apply(compiler, args);
		});
	};
	nodes.transform = function(node, callback) {
		if (!node)
			return callback(node);
		if (node.forEach) {
			var promises = [];
			node.forEach(function(n, index) {
				var p = promise.when(callback(n))
					.done(function(value) {
						if (n._deep_query_node_)
							n.set(value);
						else
							node[index] = value;
					});
				promises.push(p);
			});
			return promise.all(promises).when(node);
		}
		/*else if (node.value && node.value.forEach) {
			for (var i = 0, len = node.value.length; i < len; ++i)
				node.value[i] = callback(node.value[i]);
		}*/

		return promise.when(callback(node))
			.done(function(value) {
				if (node._deep_query_node_)
					return node.set(value);
				return value;
			});
	};


	return nodes;
});