/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */

if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "./utils", "./promise"], function(require, utils, Prom) {

	var logs = {
		slog: function(args, s, e) {
			if (args.length === 0)
				args.push("dp:success : ");
			var v = s;
			if (s && s._deep_query_node_)
				v = s.value;
			else if (v && v._deep_array_) {
				args.push("(" + v.length + " node(s)) : \n\n");
				var res = [],
					count = 0;
				v.forEach(function(e) {
					res.push(count++, ": ", e.value);
					if (count < v.length)
						res.push(",\n\n");
				});
				if (res.length)
					args = args.concat(res);
			}
			if (!v || !v._deep_array_)
				args.push(v);
			if (Prom.Promise.context.logger) {
				var logger = Prom.Promise.context.logger;
				if (logger._deep_ocm_)
					logger = logger();
				logger.log.apply(logger, args);
			} else if (console.log.apply)
				console.log.apply(console, args);
			else
				console.log(utils.argToArr(args));
			return s;
		},
		elog: function(args, s, e) {
			if (args.length === 0)
				args.unshift("dp:error");
			if (Prom.Promise.context.debug) {
				utils.dumpError(e, args);
				return e;
			} else if (e.report)
				args.push("(" + e.status + "): ", e.message, e.report);
			else
				args.push("(" + e.status + "): ", e.message);
			if (Prom.Promise.context.logger) {
				var logger = Prom.Promise.context.logger;
				if (logger._deep_ocm_)
					logger = logger();
				logger.error.apply(logger, arguments);
			} else if (console.error.apply)
				console.error.apply(console, arguments);
			else
				console.error(utils.argToArr(arguments));
			return e;
		},
		log: function() {
			if (Prom.Promise.context.logger) {
				var logger = Prom.Promise.context.logger;
				if (logger._deep_ocm_)
					logger = logger();
				logger.log.apply(logger, arguments);
			} else if (console.log.apply)
				console.log.apply(console, arguments);
			else
				console.log(utils.argToArr(arguments));
			return logs;
		},
		warn: function() {
			if (Prom.Promise.context.logger) {
				var logger = Prom.Promise.context.logger;
				if (logger._deep_ocm_)
					logger = logger();
				logger.warn.apply(logger, arguments);
			} else if (console.warn.apply)
				console.warn.apply(console, arguments);
			else
				console.warn(utils.argToArr(arguments));
			return logs;
		},
		error: function() {
			if (Prom.Promise.context.logger) {
				var logger = Prom.Promise.context.logger;
				if (logger._deep_ocm_)
					logger = logger();
				logger.error.apply(logger, arguments);
			} else if (console.error.apply)
				console.error.apply(console, arguments);
			else
				console.error(utils.argToArr(arguments));
			return logs;
		}
	};

	var Promise = Prom.Promise;
	// __________________________________________________ LOG
	/**
	 *
	 * log any provided arguments.
	 * If no arguments provided : will log current success or error state.
	 *
	 * transparent true
	 *
	 * @method  log
	 * @return {deep.Promise} this
	 * @chainable
	 */
	Promise.prototype.log = function() {
		var self = this;
		var args = Array.prototype.slice.call(arguments);
		var func = function(s, e) {
			if (e)
				return logs.elog(args, s, e);
			return logs.slog(args, s, e);
		};
		return self._enqueue(func);
	},
	// __________________________________________________ LOG
	/**
	 *
	 * log any chain errors
	 *
	 * @method  log
	 * @return {deep.Promise} this
	 * @chainable
	 */
	Promise.prototype.elog = function() {
		var self = this;
		var args = Array.prototype.slice.call(arguments);
		var func = function(s, e) {
			return logs.elog(args, s, e);
		};
		func._isFail_ = true;
		return self._enqueue(func);
	};
	/**
	 *
	 * log any chain errors
	 *
	 * @method  log
	 * @return {deep.Promise} this
	 * @chainable
	 */
	Promise.prototype.slog = function() {
		var self = this;
		var args = Array.prototype.slice.call(arguments);
		var func = function(s, e) {
			return logs.slog(args, s, e);
		};
		func._isDone_ = true;
		return self._enqueue(func);
	};

	//_____________________________________________________  ERROR RELATED

	utils.dumpError = function(err, args) {
		if (typeof err === 'object' && err !== null) {
			if(err.dumped)
				return;
			logs.warn("\n**** Error Dump ****");

			if (args) {
				if (args[0] === "dp:error")
					args.shift();
				if(args.length && args.forEach)
					logs.log((args.join) ? args.join(" - ") : args);
			}
			if (err.status)
					logs.log('\nStatus: ' + err.status);
				logs.error(err);
			if (err.requireModules)
				logs.log("Error from : ", err.requireModules);
			if (err.stack) {
				logs.log('\nStacktrace:');
				logs.log('====================');
				logs.log(err.stack);
			}
			if (err.report) {
				logs.log('\nReport:');
				logs.log('====================');
				logs.log(JSON.stringify(err.report, null, ' '));
				logs.log('============================================================');
			}
			logs.log("\n")
			err.dumped = true;
		} else
			logs.warn('dumpError :: argument is not an object : ', err);
	};
	utils.logItemsProperty = function(array, prop) {
		var r = [];
		array.forEach(function(a) {
			logs.log("deep.logItemsProperty : ", prop, a[prop]);
			r.push(a[prop]);
		});
		return r;
	};


	return logs;
});