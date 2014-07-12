/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * Chainable sheeter for js object/values sheets
 */
 
if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(["require", "./sheet", "./promise", "./compose"], function(require, sheet, promise, composer){
	var Sheeter = new composer.Composer(sheet.sheet);
	Sheeter.add("deepLoad", "after", function(context, destructive) {
		return function(entry, options) {
			return deep.when(deep.deepLoad(entry, context, destructive))
			.done(function(){
				return deep.Arguments([entry, options]);
			});
		};
	});
	Sheeter.add("up", "after", function() {
		var args = arguments;
		return function(entry, options) {
			var d = deep(entry);
			return d.up.apply(d, args)
			.done(function(){
				return deep.Arguments([entry, options]);
			});
		}
	});
	Sheeter.add("bottom", "after", function() {
		var args = arguments;
		return function(entry, options) {
			var d = deep(entry);
			return d.bottom.apply(d, args)
			.done(function(){
				return deep.Arguments([entry, options]);
			});
		}
	});
	Sheeter.add("flatten", "after", function() {
		return function(entry, options) {
			return deep(entry).flatten()
			.done(function(){
				return deep.Arguments([entry, options]);
			});
		}
	});
	Sheeter.add("sheet", "after", function() {
		var args = arguments;
		return function(entry, options) {
			var d = deep(entry);
			return d.sheet.apply(d, args)
			.done(function(){
				return deep.Arguments([entry, options]);
			});
		}
	});
	Sheeter.add("transform", "after", function(fn) {
		return function(entry, options) {
			return deep(entry)
			.transform(fn)
			.done(function(){
				return deep.Arguments([entry, options]);
			});
		}
	});
	Sheeter.add("interpret", "after", function(context) {
		return function(entry, options) {
			return deep(entry)
			.interpret(context, null, true)
			.done(function(){
				return deep.Arguments([entry, options]);
			});
		}
	});
	return Sheeter;
});