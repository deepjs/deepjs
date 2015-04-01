/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * Chainable composer for deep.nodes related API.
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "../sheet", "../promise", "../compose", "./nodes", "./query", "../flatten", "../utils"],
function(require, sheet, promise, composer, nodes, querier, flattener, utils){
	composer.compose.nodes = composer.compose.nodes || {};
	var NodesComposer = new composer.Composer(composer.compose.nodes);	// create composer manager for namespace deep.sheet 
	var Args = composer.compose.Arguments;
	NodesComposer.add("deepLoad", "after", function(context, destructive, excludeFunctions) {
		return function(entry, options) {
			return nodes.deepLoad(entry, context, destructive, excludeFunctions)
			.when(Args([entry, options]));
		};
	});
	NodesComposer.add("query", "after", function(q) {
		return function(entry, options) {
			//console.log('node composer query : ', q, entry, options);
			return Args([querier.query(entry, q, { fullOutput:true }), options]);
		};
	});
	NodesComposer.add("up", "after", function() {
		var args = arguments;
		return function(entry, options) {
			// console.log('node composer up : ', args, entry, options);
			return nodes.asyncUps(entry, Array.prototype.slice.call(args))
			.when(Args([entry, options]));
		};
	});
	NodesComposer.add("bottom", "after", function() {
		var args = arguments;
		return function(entry, options) {
			return nodes.asyncBottoms(entry, Array.prototype.slice.call(args))
			.when(Args([entry, options]));
		};
	});
	NodesComposer.add("flatten", "after", function() {
		return function(entry, options) {
			return flattener.flatten(entry)
			.when(Args([entry, options]));
		};
	});
	NodesComposer.add("map", "after", function(fn) {
		return function(entry, options) {
			//console.log("sheeter transfo : ",entry);
			return promise.when(nodes.map(entry, fn))
			.when(Args([entry, options]));
		};
	});
	NodesComposer.add("each", "after", function(fn) {
		return function(entry, options) {
			// console.log("sheeter each : ",entry);
			return promise.when(nodes.each(entry, fn))
			.when(Args([entry, options]));
		};
	});
	NodesComposer.add("interpret", "after", function(context) {
		return function(entry, options) {
			return promise.when(nodes.map(entry, function(node){
				if(node && node._deep_query_node_)
					return utils.interpret(node.value, context);
				return utils.interpret(node, context);
			}))
			.when(Args([entry, options]));
		};
	});
	NodesComposer.add("sheet", "after", function() {
		var args = Array.prototype.slice.call(arguments);
		return function(entry, options) {
			if(!entry)
				return;
			return nodes.sheet.call(nodes, entry, args)
			.when(Args([entry, options]));
		};
	});

	return NodesComposer;
});