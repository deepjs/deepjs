/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * Sheet to be applied on any store that allow caching of items.
 * TODO : add and use cache timeout property
 */
 
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "../../deep", "../cache"], function(require, deep, cache){
	return  {
		_deep_sheet_:true,
		"dq.up::./get":deep.compose.around(function(old){
			return function(id, opt)
			{
				opt = opt || {};
				// catch "cache" and "cachePath" from current store but keep those in opt if any.
				deep.utils.decorateBottomFrom(this, opt, ["cache","cachePath"]);
				if(!opt.cache)
					return old.call(this, id, opt);
				// forward cacheName in options
				opt.cacheName = opt.cacheName || id;
				var r = cache.get(opt.cachePath, opt.cacheName);
				if(r)
					return r;
				return cache.add(old.call(this, id, opt), opt.cachePath, opt.cacheName, opt.cache);
			};
		}),
		"dq.up::./[post,put,patch]":deep.compose.around(function(old){
			return function(object, opt)
			{
				opt = opt || {};
				// catch "cache" and "cachePath" from current store but keep those in opt if any.
				deep.utils.decorateBottomFrom(this, opt, ["cache","cachePath"]);
				if(!opt.cache)
					return old.call(this, object, opt);
				opt.id = opt.id || object.id;
				if(!opt.id)
					return deep.errors.Post("node.fs store need id on post/put/patch : ", object);
				// forward cacheName in options
				opt.cacheName = opt.cacheName || opt.id;
				return cache.add(old.call(this, object, opt), opt.cachePath, opt.cacheName, opt.cache);
			};
		}),
		"dq.up::./del":deep.compose.around(function(old){
			return function(id, opt)
			{
				opt = opt || {};
				// catch "cache" and "cachePath" from current store but keep those in opt if any.
				deep.utils.decorateBottomFrom(this, opt, ["cache","cachePath"]);
				if(!opt.cache)
					return old.call(this, id, opt);
				opt.cacheName = opt.cacheName || id;
				cache.remove(opt.cachePath, opt.cacheName);
				return old.call(this, id, opt);
			};
		})
		// TODO : same thing for range
	};

});