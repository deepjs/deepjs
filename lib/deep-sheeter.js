/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * Chainable sheeter for js object/values sheets (deepjs related API)
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "./sheet", "./promise", "./compose", "./nodes", "./query", "./flatten", "./sheet", "./utils"],
function(require, sheet, promise, composer, nodes, querier, flattener, sheets, utils){
	var Sheeter = new composer.Composer(sheet.sheet);	// create composer manager for namespace deep.sheet 
	var Arguments = composer.compose.Arguments;
	Sheeter.add("deepLoad", "after", function(context, destructive) {
		return function(entry, options) {
			return nodes.deepLoad(entry, context, destructive)
			.when(Arguments([entry, options]));
		};
	});
	Sheeter.add("query", "after", function(q) {
		return function(entry, options) {
			return querier.query(entry, q);
		}
	});
	Sheeter.add("up", "after", function() {
		var args = arguments;
		return function(entry, options) {
			return nodes.asyncUps(entry, Array.prototype.slice.call(args))
			.when(Arguments([entry, options]));
		}
	});
	Sheeter.add("bottom", "after", function() {
		var args = arguments;
		return function(entry, options) {
			return nodes.asyncBottoms(entry, Array.prototype.slice.call(args))
			.when(Arguments([entry, options]));
		}
	});
	Sheeter.add("flatten", "after", function() {
		return function(entry, options) {
			return promise.when(flattener.flatten(entry))
			.when(Arguments([entry, options]));
		}
	});
	Sheeter.add("sheet", "after", function() {
		var args = Array.prototype.slice.call(arguments);
		return function(entry, options) {
			if(!entry)
				return;
			return nodes.sheet.call(nodes, entry, args)
			.when(Arguments([entry, options]));
		}
	});
	Sheeter.add("map", "after", function(fn) {
		return function(entry, options) {
			//console.log("sheeter transfo : ",entry);
			return promise.when(nodes.map(entry, fn))
			.when(Arguments([entry, options]));
		}
	});
	Sheeter.add("each", "after", function(fn) {
		return function(entry, options) {
			console.log("sheeter each : ",entry);
			nodes.each(entry, fn);
			return Arguments([entry, options]);
		}
	});
	Sheeter.add("interpret", "after", function(context) {
		return function(entry, options) {
			return promise.when(nodes.map(entry, function(node){
				if(node && node._deep_query_node_)
					return utils.interpret(node.value, context);
				return utils.interpret(node, context);
			}))
			.when(Arguments([entry, options]));
		}
	});
	return Sheeter;
});