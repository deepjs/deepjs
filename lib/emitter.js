/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * really small implemntation of Event/Emitter pattern.
 *
 * TODO : manage deep.context
 */

if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "./promise"], function(require, promise) {
	var event = {};
	event.Event = function(type, datas, context) {
		this.datas = datas || null;
		this.type = type;
	};
	event.Emitter = function() {
		var listeners = {};
		this.emit = function(type, datas, context) {
			var list = listeners[type],
				previousContext;
			if (!list)
				return;
			if (context) {
				previousContext = promise.Promise.context;
				if (previousContext && previousContext.suspend)
					previousContext.suspend();
				promise.Promise.context = context;
				if (context.resume)
					context.resume();
			}
			for (var i = 0, len = list.length; i < len; ++i)
				list[i](new event.Event(type, datas));
			if (context) {
				if (context.suspend)
					context.suspend();
				if (previousContext && previousContext.resume)
					previousContext.resume();
				promise.Promise.context = previousContext;
			}
		};
		this.on = function(type, callback) {
			listeners[type] = listeners[type] || [];
			callback._deep_listener_index_ = listeners[type].length;
			listeners[type].push(callback);
		};
		this.remove = function(type, callback) {
			var list = listeners[type];
			if (!list)
				return;
			list.splice(callback._deep_listener_index_, 1);
		};
	};
	return event;
});