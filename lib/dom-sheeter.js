/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
 
if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(["require", "../deep", "./compose"], function(require, deep, composer){
	deep.domsheet = {};
	var DomSheeter = deep.DomSheeter = new composer.Composer(deep.domsheet);
	DomSheeter.add("click", "after", function(handler, args) {
		return function(entry, options) {
			var $ = deep.context.$;
			var self = this;
			$(entry).click(function(e){
				if(typeof handler === 'function')
					return handler.call(self, this, e);
				e.preventDefault();
				return self[handler].apply(self, args || []);
			});
		};
	});
	DomSheeter.add("each", "after", function(handler) {
		return function(entry, options) {
			var $ = deep.context.$,
				promises = [];
			var self = this;
			$(entry).each(function(){
				promises.push(handler.call(self, this));
			});
			return deep.all(promises)
			.done(function(){
				return deep.Arguments([entry, options]);
			})
		};
	});
	//____________________________________________________________________ STILL TO IMPLEMENT AND TEST
	DomSheeter.add("enhance", "after", function(context, destructive) {
		return function(entry, options) {
			var $ = deep.context.$,
				promises = [];

			$(entry).each(function(node){

			});
			return deep.all(promises)
			.done(function(){
				return deep.Arguments([entry, options]);
			});
		};
	});
	DomSheeter.add("control", "after", function() {
		var controllers = arguments;
		return function(entry, options) {
			var $ = deep.context.$,
				promises = [];

			$(entry).each(function(node){

			});
			return deep.all(promises)
			.done(function(){
				return deep.Arguments([entry, options]);
			});
		};
	});	
	DomSheeter.add("sheet", "after", function() {
		var controllers = arguments;
		return function(entry, options) {
			var $ = deep.context.$,
				promises = [];

			$(entry).each(function(node){

			});
			return deep.all(promises)
			.done(function(){
				return deep.Arguments([entry, options]);
			});
		};
	});
	return DomSheeter;
});