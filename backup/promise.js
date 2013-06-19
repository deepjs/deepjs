/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
/**
 * Wrapper of promises : jquery promise for browser side,  and promised-io on ssjs (tested on nodejs).
 */

if(typeof define !== 'function'){
	var define = require('amdefine')(module);
	var ioDeferred = require("promised-io").Deferred;
	var ioWhen = require("promised-io").whenPromise;
}
define(function(require){
	var exports = {

	} 
	var Deferred = exports.Deferred = function(){
		if(typeof window !== 'undefined')
			return $.Deferred();
		else 
			return new ioDeferred();
	};
	var when = exports.when = function(arg){
		if(typeof window !== 'undefined')
			return $.when(arg);
		return ioWhen(arg);
	}

	var promise = exports.promise = function(arg){
		if(typeof window !== 'undefined')
			return arg.promise();
		return arg.promise;
	}

	var all = exports.all = function(arr){
		if(arr.length == 0)
			return when([]);
		var def = Deferred();
		var count = arr.length;
		var c = 0, d = -1;
		var res = [];
		arr.forEach(function(a){
			var i = d +1;
			when(a).then(function(r){
				res[i] = r;
				c++;
				if(c == count)
					def.resolve(res);
			}, function(r){
				def.reject(r);
			})
			d++;
		})
		return promise(def);
	}
	return exports;
});