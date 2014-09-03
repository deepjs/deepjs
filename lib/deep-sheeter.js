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
			args.push(entry);
			return sheets.sheet.apply({}, args)
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
	//_________________________________________________________________
	Sheeter.add("interpret", "after", function(context) {
		return function(entry, options) {
			entry.value = utils.interpret(entry.value, context);
			if(entry.ancestor)
				entry.ancestor.value[entry.key] = entry.value;
			return Arguments([entry, options]);
		}
	});
	return Sheeter;
});