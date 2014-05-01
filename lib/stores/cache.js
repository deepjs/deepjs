/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */

if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}

define(["require", "../../deep"], function (require, deep) {

	var storeSheet = {
		"dq.up::./get":deep.compose.around(function(old){
			return function(id, opt)
			{
				opt = opt || {};
				deep.utils.decorateUpFrom(this, opt, ["cache","cachePath"]);
				if(opt.cache !== false)
				{
					opt.cacheName = opt.cacheName || (opt.cachePath+id);
					//console.log("check cache : ", id, opt);
					if(deep.mediaCache.cache[opt.cacheName])
						return deep.mediaCache.cache[opt.cacheName];
				}
				var res = old.call(this, id, opt);
				if(opt.cache !== false)
					deep.mediaCache.manage(res, opt.cacheName);
				return res;
			};
		}),
		"dq.up::./[post,put,patch]":deep.compose.around(function(old){
			return function(object, opt)
			{
				opt = opt || {};
				deep.utils.decorateUpFrom(this, opt, ["cache","cachePath"]);
				opt.id = opt.id || object.id;
				if(!opt.id)
					return deep.errors.Post("node.fs store need id on post/put/patch : ", object);
				opt.cacheName = opt.cacheName || (opt.cachePath+opt.id);
				var res = old.call(this, object, opt);
				if(opt.cache !== false)
					deep.mediaCache.manage(res, opt.cacheName);
				return res;
			};
		}),
		"dq.up::./del":deep.compose.around(function(old){
			return function(id, opt)
			{
				opt = opt || {};
				deep.utils.decorateUpFrom(this, opt, ["cache","cachePath"]);
				opt.cacheName = opt.cacheName || (opt.cachePath+id);
				deep.mediaCache.remove(opt.cacheName);
				return old.call(this, id, opt);
			};
		})
	};


	deep.mediaCache = {
		sheets:{
			store:storeSheet
		},
		cache:{},
		reloadablesUriDico : {},
		//reloadablesRegExpDico : [ /^(json::)/gi /* ,/(\.json)$/gi */ ],
		clearCache:function ()
		{
			this.cache = {};
		},
		remove:function (uri) {
			delete this.cache[uri];
		},
		manage:function (response, uri) {
			this.cache[uri] = response;
			return response;
		}
	};

});


