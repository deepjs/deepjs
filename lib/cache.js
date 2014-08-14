/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */

if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "../deep"], function (require, deep) {
	var cache = {};
	return {
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
			var space = cache[namespace] = cache[namespace] || {};
			if(typeof life !== 'number')
				life = null;
			space[uri] = { response:response, stamp:(life?(Date.now().valueOf()+life):null) };
			return response;
		},
		get:function(namespace, uri) {
			var space = cache[namespace];
			if(!space)
				return undefined;
			val = space[uri];
			if(!val)
				return val;
			if(val.stamp && Date.now().valueOf() > val.stamp)
			{
				delete space[uri];
				return undefined;
			}
			return val.response;
		}
	};
});


