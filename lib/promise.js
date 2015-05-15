/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * based on [deep-promise](https://github.com/deepjs/deep-promise).
 * Wrap Promise classe in deep.Classes to make it extensible.
 */

if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "deep-promise/index", "deep-compiler/lib/classes"], function(require, promise, Classes) {
	var Promise = Classes(promise.Promise);
	for (var i in promise.Promise) // copy statics
		Promise[i] = promise.Promise[i];
	promise.Promise = Promise;
	return promise;
});