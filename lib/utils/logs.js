/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */

if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "../utils", "../promise"], function(require, utils, Prom) {

	var logger = {};
	var defaultLogger = {
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
			if (console.log.apply)
				console.log.apply(console, args);
			else
				console.log(args);
			return s;
		},
		elog: function(args, s, e) {
			if (args.length === 0)
				args.unshift("dp:error");
			/*if (Prom.Promise.context.debug) {
				utils.dumpError(e, args);
				return e;
			} else*/ if (e.report)
				args.push("(" + e.status + "): ", e.message, e.report);
			else
				args.push("(" + e.status + "): ", e.message);
			if (console.error.apply)
				console.error.apply(console, args);
			else
				console.error(args);
			return e;
		},
		log: function() {
			if (console.log.apply)
				console.log.apply(console, arguments);
			else
				console.log(utils.argToArr.call(arguments));
			return this;
		},
		warn: function() {
			if (console.warn.apply)
				console.warn.apply(console, arguments);
			else
				console.warn(utils.argToArr.call(arguments));
			return this;
		},
		error: function() {
			if (console.error.apply)
				console.error.apply(console, arguments);
			else
				console.error(utils.argToArr.call(arguments));
			return this;
		}
	};

	var Promise = Prom.Promise;
	Promise._up({
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
		log : function() {
			var self = this;
			var args = Array.prototype.slice.call(arguments);
			var func = function(s, e) {
				if (e)
					logger.elog(args, s, e);
				else
					logger.slog(args, s, e);
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
		elog : function() {
			var self = this;
			var args = Array.prototype.slice.call(arguments);
			var func = function(s, e) {
				logger.elog(args, s, e);
			};
			func._isFail_ = true;
			return self._enqueue(func);
		},
		/**
		 *
		 * log any chain errors
		 *
		 * @method  log
		 * @return {deep.Promise} this
		 * @chainable
		 */
		slog : function() {
			var self = this;
			var args = Array.prototype.slice.call(arguments);
			var func = function(s, e) {
				logger.slog(args, s, e);
			};
			func._isDone_ = true;
			return self._enqueue(func);
		}
	});

	//_____________________________________________________  ERROR RELATED

	utils.dumpError = function(err, args) {
		var logger = getLogger();
		if (typeof err === 'object' && err !== null) {
			if(err.dumped)
				return;
			logger.warn("\n**** Error Dump ****");

			if (args) {
				if (args[0] === "dp:error")
					args.shift();
				if(args.length && args.forEach)
					logger.log((args.join) ? args.join(" - ") : args);
			}
			if (err.status)
				logger.log('\nStatus: ' + err.status);
				logger.error(err);
			if (err.requireModules)
				logger.log("Error from : ", err.requireModules);
			if (err.stack) {
				logger.log('\nStacktrace:');
				logger.log('====================');
				logger.log(err.stack);
			}
			if (err.report) {
				logger.log('\nReport:');
				logger.log('====================');
				logger.log(JSON.stringify(err.report, null, ' '));
				logger.log('============================================================');
			}
			logger.log("\n")
			err.dumped = true;
		} else
			logger.warn('dumpError :: argument is not an object : ', err);
	};
	utils.logItemsProperty = function(array, prop) {
		var r = [];
		array.forEach(function(a) {
			getLogger().log("deep.logItemsProperty : ", prop, a[prop]);
			r.push(a[prop]);
		});
		return r;
	};

	var closure = {};
	var getLogger = function(){
		var lgr = (Promise.context?Prom.Promise.context.logger:null) || closure.globalLogger || defaultLogger;
		if (lgr._deep_ocm_)
			lgr = lgr();
		return lgr;
	};

	logger.setMain = function(lgr){
		closure.globalLogger = lgr;
		return loger;
	};
	logger.slog = function(){
		var lgr = getLogger();
		lgr.slog.apply(lgr, arguments);
		return this;
	};
	logger.elog = function(){
		var lgr = getLogger();
		lgr.elog.apply(lgr, arguments);
		return this;
	};
	logger.log = function(){
		var lgr = getLogger();
		lgr.log.apply(lgr, arguments);
		return this;
	};
	logger.warn = function(){
		var lgr = getLogger();
		lgr.warn.apply(lgr, arguments);
		return this;
	};
	logger.error = function(){
		var lgr = getLogger();
		lgr.error.apply(lgr, arguments);
		return this;
	};
	return logger;
});