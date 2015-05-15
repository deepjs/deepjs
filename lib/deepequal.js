/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */

if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define([], function() {

	/**
	 * Test strict equality between two objects
	 * @param  {Object} a       [description]
	 * @param  {Object} b       [description]
	 * @param  {Bool} ordered [description]
	 * @return {Bool}         [description]
	 */
	var deepEqual = function(a, b, ordered) {
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
					return deepEqual(e, b[count++]);
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
					ok = ok && deepEqual(a[i], b[i]);
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
			if (ordered)
				for (var j = 0; j < tmpB.length; ++j)
					if (tmpB[j] !== tmpA[j])
						return false;
		} else if (a !== b)
			return false;
		return true;
	};

	return deepEqual;
});