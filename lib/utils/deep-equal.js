/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */

if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "../promise", "../utils", "../nodes/nodes", "../errors"], function(require, prom, utils, nodes, errors) {

	/**
	 * Test strict equality between two objects
	 * @param  {Object} a       [description]
	 * @param  {Object} b       [description]
	 * @param  {Bool} ordered [description]
	 * @return {Bool}         [description]
	 */
	utils.deepEqual = function deepEqual(a, b, ordered) {
		//console.log("deepEqual : ",JSON.stringify(a),JSON.stringify(b));
		if (ordered === undefined)
			ordered = true;
		var typeA = typeof a;
		if (typeA !== typeof b)
			return false;
		if (a && typeA === 'object') {
			if (!b)
				return false;

			if (a._deep_promise_) {
				if (b._deep_promise_)
					return true;
				return false;
			}
			var ok = true;
			var tmpA = [];
			var tmpB = [];

			if (typeof a.forEach === 'function') {
				if (typeof b.forEach !== 'function' || a.length !== b.length)
					return false;
				var count = 0;
				ok = ok && a.every(function(e) {
					return utils.deepEqual(e, b[count++]);
				});
				if (!ok)
					return false;
			} else {
				for (var i in b) {
					//console.log("deepEqual :b[i] : ",i);
					//if(!b.hasOwnProperty(i))
					//  continue;
					if (typeof a[i] === 'undefined')
						return false;
					ok = ok && utils.deepEqual(a[i], b[i]);
					if (!ok)
						return false;
					tmpB.push(i);
				}
				for (var i in a) {
					//console.log("deepEqual :a[i] : ",i);
					//if(!a.hasOwnProperty(i))
					//  continue;
					tmpA.push(i);
				}
			}
			if (tmpA.length !== tmpB.length)
				return false;
			//console.log("will try ordered : ", JSON.stringify(tmpB), JSON.stringify(tmpA))
			if (ordered)
				for (var j = 0; j < tmpB.length; ++j)
					if (tmpB[j] !== tmpA[j])
						return false;
		} else if (a !== b)
			return false;
		return true;
	};

	/**
	 * equal test strict equality on success value against provided object
	 * If equal, forward success (it's transparent).
	 * If not equal, inject 412 error with report
	 *
	 * @method  equal
	 * @param  {*} obj      the object to test
	 * @chainable
	 * @return {Promise*}     this. current chain handler.
	 */
	prom.Promise._up({ 
		equal : function(obj) {
			var self = this;
			var func = function(s, e) {
				var tmp = s;
				if (s && (s._deep_query_node_ || s._deep_array_))
					tmp = nodes.val(s);
				if (typeof obj === 'function') {
					//console.log("chains.Chain.done : ",s,e)
					var doTest = function(a) {
						return (a ? true : false) || errors.Assertion("assertion failed");
					};
					var a = obj.call(self, tmp);
					if (a && (a.then || a.promise))
						return promise.when(a)
							.done(doTest);
					return doTest(a);
				}
				//var toTest = deep.chain.val(self);
				var ok = utils.deepEqual(tmp, obj);
				var report = {
					equal: ok,
					value: tmp,
					needed: obj
				};
				if (ok)
					return tmp;
				else
					return errors.PreconditionFail("deep.equal failed ! ", report);
			};
			func._isDone_ = true;
			return self._enqueue(func);
		}
	});
});