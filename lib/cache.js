/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */

if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "../deep"], function (require, deep) {
	var cache = {};
	return deep.cache = {
		clear:function (namespace) {
			if(namespace)
				delete cache[namespace];
			else
				cache = {};
		},
		remove:function (namespace, uri) {
			if(cache[namespace])
				delete cache[namespace][uri];
		},
		add:function (response, namespace, uri, life) {
			// console.log("cache.add = ", response, namespace, uri, life);
			var space = cache[namespace] = cache[namespace] || {};
			space[uri] = { response:response, stamp:(life?(Date.now().valueOf()+life):null) };
			return response;
		},
		get:function(namespace, uri) {
			var space = cache[namespace];
			if(!space)
				return;
			var val = space[uri];
			if(!val)
				return val;
			if(val.stamp && Date.now().valueOf() > val.stamp)
			{
				delete space[uri];
				return;
			}
			return val.response;
		}
	};
});


