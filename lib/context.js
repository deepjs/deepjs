/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * magical context that follow promises scopes
 */

if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "./promise", "./utils", "./logs"], function(require, prom, utils, logs) {
	var Promise = prom.Promise;
	Promise.context = {
		rethrow: false,
		debug: true
	};
	Promise.contextualise = function() {
		// shallow copy all context
		Promise.context = utils.shallowCopy(Promise.context);

		// shallowcopy context's protocols (if any)
		if (Promise.context.protocols)
			Promise.context.protocols = utils.shallowCopy(Promise.context.protocols);

		// hard copy modes
		if (Promise.context.modes)
			Promise.context.modes = utils.copy(Promise.context.modes);

		return Promise.context;
	};

	/**
	 * set key/value in current Promise.context
	 *
	 * @chainable
	 * @method context
	 * @param  {String} key
	 * @param  {*} value
	 * @return {deep.Chain} this
	 */
	Promise.prototype.toContext = function(key, val) {
		var self = this;
		var func = function(s, e) {
			if (!key)
				return errors.Internal(".toContext need key/val couple.");
			val = (typeof val === 'undefined') ? s : val;
			self._context[key] = val;
			return val;
		};
		func._isDone_ = true;
		return self._enqueue(func);
	};
	/**
	 * shallow copy current Promise.context
	 *
	 * @chainable
	 * @method contextualise
	 * @return {deep.Chain} this
	 */
	Promise.prototype.contextualise = function(arg) {
		var self = this;
		var func = function(s, e) {
			self._context = Promise.contextualise();
			if(arg)
				for(var i in arg)
					self._context[i] = arg[i];
			return s;
		};
		func._isDone_ = true;
		return self._enqueue(func);
	};
	/**
	 * read key/value in current Promise.context
	 *
	 * @chainable
	 * @method context
	 * @param  {String} key
	 * @param  {*} value
	 * @return {deep.Chain} this
	 */
	Promise.prototype.fromContext = function(key) {
		var self = this;
		var create = function(s, e) {
			if (!key)
				return self._context;
			var out = self._context[key];
			return (typeof out === 'undefined') ? promise.Undefined : out;
		};
		create._isDone_ = true;
		return self._enqueue(create);
	};
	/**
	 * log current Promise.context. If key is provided : log only this property.
	 *
	 * @chainable
	 * @method logContext
	 * @param  {String} key (optional)
	 * @return {deep.Chain} this
	 */
	Promise.prototype.clog = function(key) {
		var self = this;
		var func = function chainLogHandle(s, e) {
			if (key)
				logs.log("deep.chain.context." + key + " : ", self._context[key]);
			else
				logs.log("deep.chain.context : ", self._context);
		};
		return self._enqueue(func);
	};
	
	return {
		context:function(name, value) {
			if (!name)
				return Promise.context;
			if (!value)
				return Promise.context[name];
			return Promise.context[name] = value;
		},
		contextualise : function(arg) {
			return new Promise().contextualise(arg).resolve(deep.context());
		},
		fromContext : function(key) {
			return new Promise().resolve(Promise.context[key]);
		}
	};
});