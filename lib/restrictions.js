/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */

if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "./errors", "./utils", "./compiler"], function(require, errors, utils, compiler) {
	"use strict";

	var forbidden = function(message) {
		return function(any, options) {
			return errors.Forbidden(message);
		};
	};

	var Disallow = function() {
		var restrictions = {};
		for (var i in arguments)
			restrictions[arguments[i]] = forbidden();
		return restrictions;
	};
	var AllowOnly = function() {
		return {
			inner: {},
			allowable: utils.argToArr.call(arguments),
			_deep_compiler_: true,
			_deep_allow_only_: true,
			_up: function() { // apply arguments (up) on inner-layer : so merge
				var res = this.inner;
				for (var i = 0, len = arguments.length; i < len; ++i) {
					var argi = arguments[i];
					if (argi._deep_allow_only_) {
						res = compiler.aup(argi.inner, res);
						this.allowable = compiler.aup(argi.allowable, this.allowable);
					} else
						res = compiler.aup(argi, res);
				}
				this.inner = res;
				return this;
			},
			_bottom: function() { // apply arguments (bottom) on this : so apply restrictions

				var res = this.inner,
					toKeep = null;
				for (var len = arguments.length - 1; len >= 0; --len) {
					var argi = arguments[len];
					if (argi._deep_allow_only_) {
						res = compiler.abottom(argi.inner, res);
						this.allowable = compiler.aup(argi.allowable, this.allowable);
					} else
						res = compiler.abottom(argi, res);
				}
				if (res._deep_restrictable_) {
					var toRemove = utils.removeInside(res._deep_restrictable_.slice(), this.allowable);
					for (var j = 0, lenj = toRemove.length; j < lenj; ++j)
						res[toRemove[j]] = forbidden();
				} else {
					if (!toKeep) {
						toKeep = {};
						for (var l = 0, lenl = this.allowable.length; l < lenl; ++l)
							toKeep[this.allowable[l]] = true;
					}
					//console.log("not restrictable res ", res, toKeep);
					for (var k in res)
						if (typeof res[k] === 'function' && !toKeep[k])
						{
							res[k] = forbidden();
						}
				}
				//console.log("RES : ", res);
				return res;
			}
		};
	};
	return {
		Disallow: Disallow,
		AllowOnly: AllowOnly,
		forbidden: forbidden
	};
});