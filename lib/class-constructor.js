/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
 
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "./utils/misc",], function(require, utils){
	var classes =  {
		Classes: function(){
			var closure = {
				constructors : null,
				compiled : false,
				args: Array.prototype.slice.call(arguments)
			};
			function Constructor(){
				if(!closure.compiled)
					closure.Constructor.compile();
				for(var i in this)
					if(this[i] && typeof this[i] === 'object' && !this[i]._deep_shared_)
						this[i] = utils.copy(this[i]);
				for(var i = 0, len = closure.constructors.length; i < len; ++i)
				{
					var r = closure.constructors[i].apply(this, arguments);
					/*if(r)
					{
						throw new Error("apply object from constructor : "+ JSON.stringify(r))
						compiler.aup(r, this);
					}*/
				}
			};
			Constructor.prototype = {};
			Constructor._deep_class_ = true;
			Constructor._deep_compiler_ = true;
			Constructor._link = function(cl){
				closure.links = closure.links || [];
				closure.links.push(cl);
			};
			Constructor._up = function() { // apply arguments (up) on inner-layer
				closure.compiled = false;
				closure.args = closure.args.concat(Array.prototype.slice.call(arguments));
				if(closure.links)
					closure.links.forEach(function(cl){
						cl.compiled = false;
					});
				return closure.Constructor;
			};
			Constructor._bottom = function() { // apply arguments (bottom) on inner-layer
				closure.compiled = false;
				closure.args = Array.prototype.slice.call(arguments).concat(closure.args);
				if(closure.links)
					closure.links.forEach(function(cl){
						cl.compiled = false;
					});
				return closure.Constructor;
			};
			Constructor._clone = function() {
				return classes.Classes.apply(classes, closure.args);
			};
			Constructor.compile = function(force){
				if(!force && closure.compiled)
					return;
				closure.constructors = [];
				var proto = classes.compile(closure);
				for(var i in proto)
					if(typeof proto[i] === 'function' || typeof closure.Constructor.prototype[i] === 'undefined') // update only functions and : datas that was not already present (to keep possibly local vars)
						closure.Constructor.prototype[i] = proto[i];
				closure.compiled = true;
			}
			closure.Constructor = Constructor;
			return Constructor;
		}
	};
	return classes;
});