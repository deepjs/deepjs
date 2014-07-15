/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * Chainable sheeter for js object/values sheets (deepjs related API)
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "./sheet", "./promise", "./compose"],
function(require, sheet, promise, composer){
	var Sheeter = new composer.Composer(sheet.sheet);	// create composer manager for namespace deep.sheet 
	Sheeter.add("deepLoad", "after", function(context, destructive) {
		return function(entry, options) {
			return deep.deepLoad(entry, context, destructive)
			.when(deep.Arguments([entry, options]));
		};
	});
	Sheeter.add("query", "after", function(q) {
		return function(entry, options) {
			return deep(entry).query(q)
			.done(function(s){
				return deep.Arguments([s,options]);
			});
		}
	});
	Sheeter.add("up", "after", function() {
		var args = arguments;
		return function(entry, options) {
			var d = deep(entry);
			return d.up.apply(d, args)
			.when(deep.Arguments([entry, options]));
		}
	});
	Sheeter.add("bottom", "after", function() {
		var args = arguments;
		return function(entry, options) {
			var d = deep(entry);
			return d.bottom.apply(d, args)
			.when(deep.Arguments([entry, options]));
		}
	});
	Sheeter.add("flatten", "after", function() {
		return function(entry, options) {
			return deep(entry).flatten()
			.when(deep.Arguments([entry, options]));
		}
	});
	Sheeter.add("sheet", "after", function() {
		var args = arguments;
		return function(entry, options) {
			var d = deep(entry);
			return d.sheet.apply(d, args)
			.when(deep.Arguments([entry, options]));
		}
	});
	Sheeter.add("transform", "after", function(fn) {
		return function(entry, options) {
			return deep(entry)
			.transform(fn)
			.when(deep.Arguments([entry, options]));
		}
	});
	Sheeter.add("interpret", "after", function(context) {
		return function(entry, options) {
			return deep(entry)
			.interpret(context, null, true)
			.when(deep.Arguments([entry, options]));
		}
	});
	return Sheeter;
});