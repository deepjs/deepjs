/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
 
if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(["require"], function deepEmitterDefine(require)
{
	return function(deep)
	{
		var Event  = deep.Event = function(type){
			this.type = type;
		};
		var Emitter = deep.Emitter = function(){
			var listeners = {};
			this.emit = function(event){
				var list = listeners[event];
				if(!list)
					return;
				for(var i = 0, len = list.length; i < len; ++i)
					list[i](new Event(event));
			};
			this.on = function(event, callback){
				listeners[event] = listeners[event] || [];
				callback._deep_listener_index_ = listeners[event].length;
				listeners[event].push(callback);
			};
			this.remove = function(event, callback){
				var list = listeners[event];
				if(!list)
					return;
				list.splice(callback._deep_listener_index_,1);
			};
		};
		return Emitter;
	};
});