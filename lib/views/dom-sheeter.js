/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * Chainable sheeter for jquery/DOM sheets (views/DOM related API)
 */
 
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "../../deep", "../compose"], function(require, deep, composer){
	deep.domsheet = {};
	var DomSheeter = deep.DomSheeter = new composer.Composer(deep.domsheet);
	DomSheeter.add("click", "after", function(handler, args) {
		// console.log('csheeter click 1 : ', handler, args);
		return function(entry, context) {
			// console.log("sheeter.click : entry, context, handler, args : ", entry, context, handler, args)
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
		return function(entry, context) {
			var $ = deep.context.$,
				promises = [];
			var self = this;
			$(entry).each(function(){
				promises.push(handler.call(self, this));
			});
			return deep.all(promises)
			.when(deep.Arguments([entry, context]))
		};
	});
	DomSheeter.add("enhance", "after", function() {
		var argus = arguments;
		return function(entry, context) {
			var args = Array.prototype.slice.apply(argus), name = args.shift();
			var directive = deep.ui.directives[name];
			if(!directive)
				return deep.errors.UI("missing directive : " + name);
			var $ = deep.context.$,
				promises = [],
				self = this;
			args.unshift(this, context);
			$(entry).each(function(){
				args[0] = this;
				var r = directive.apply(self, args);
				if(r && r.then)
					promises.push(r);
			});
			if(promises.length)
				return deep.all(promises)
				.when(deep.Arguments([entry, context]));
		};
	});
	//____________________________________________________________________ STILL TO IMPLEMENT AND TEST
	DomSheeter.add("control", "after", function() {
		var controllers = arguments;
		return function(entry, context) {
			var $ = deep.context.$,
				promises = [];

			$(entry).each(function(node){

			});
			return deep.all(promises)
			.when(deep.Arguments([entry, context]));
		};
	});	
	DomSheeter.add("sheet", "after", function() {
		var controllers = arguments;
		return function(entry, context) {
			var $ = deep.context.$,
				promises = [];

			$(entry).each(function(node){

			});
			return deep.all(promises)
			.when(deep.Arguments([entry, context]));
		};
	});
	return DomSheeter;
});