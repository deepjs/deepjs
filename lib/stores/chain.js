/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 *
 * TODO : 
 *     - files extensions matching optimisation
 *     - add optimised mode that do not return deep chain handle for any HTTP verb (to be used when stores are used from within a chain)
 *     - check range object usage in chain
 *
 *
 *
 * - CLONE STORES : reset and initialised = false
 */

if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}

define(["require"], function (require) {

	return function(deep){
	//______________________________________________________________________ CHAIN DECORATION
	deep.Chain.addHandle("store", function (name) {
		var self = this;
		var func = function (s, e) {
			//console.log("deep.Chain.store : ", name);
			if (typeof name === 'string') {
				self._storeName = name;
				self._store = null;
			} else {
				self._storeName = name.name;
				self._store = name;
			}
			//deep.chain.position(self, self._storeName);
		};
		deep.Store.extendsChain(self);
		func._isDone_ = true;
		deep.chain.addInChain.apply(self, [func]);
		return this;
	});

	var createWithBody = function(verb){
		return  function (object, options) {
			var self = this;
			var func = function (s, e) {
				return deep.when(deep.protocol.parse(self._store || self._storeName))
				.done(function(storeHandler){
					//console.log("Chain post : ", object);
					var store = storeHandler.provider, method = store[verb];
					if (!method)
						return deep.errors.Store("provided store doesn't have "+verb+". aborting POST !");
					if(method._deep_ocm_)
						method = method();
					return method.call(store, object || deep.chain.val(self), options);
				})
				.done(function (success) {
					self._nodes = [deep.utils.createRootNode(success)];
				});
			};
			func._isDone_ = true;
			deep.chain.addInChain.apply(this, [func]);
			return self;
		};
	};
	var chainWithBody = {
		post:createWithBody("post"),
		put:createWithBody("put"),
		patch:createWithBody("patch")
	};
	deep.Store.extendsChain = function (handler) {
		handler.range = function (arg1, arg2, query, options) {
			var self = this;
			var func = function (s, e) {
				return deep.when(deep.protocol.parse(self._store || self._storeName))
				.done(function(storeHandler){
					var store = storeHandler.provider, method = store.range;
					if (!method)
						return deep.errors.Store("provided store doesn't have RANGE. aborting RANGE !");
					if(method._deep_ocm_)
						method = method();
					return method.call(store, arg1, arg2, query, options);
				})
				.done(function (success) {
					if(success._deep_range_)
						self._nodes = [deep.utils.createRootNode(success.results)];
					else
						self._nodes = [deep.utils.createRootNode(success)];
				});
			};
			func._isDone_ = true;
			//self.range = deep.Chain.prototype.range;
			deep.chain.addInChain.apply(this, [func]);
			return self;
		};
		handler.get = function (id, options) {
			var self = this;
			if (id == "?" || !id)
				id = "";
			var func = function (s, e)
			{
				return deep.when(deep.protocol.parse(self._store || self._storeName))
				.done(function(storeHandler){
					var store = storeHandler.provider;
					var method = store.get;
					if (!method)
						return deep.errors.Store("provided store doesn't have GET. aborting GET !");
					if(method._deep_ocm_)
						method = method();
					if(id[0] == "*")
						id = id.substring(1);
					return method.call(store, id, options);
				})
				.done(function (success) {
					//console.log("Deep store chain Get success : ", success);
					if(success && success._deep_range_)
						self._nodes = [deep.utils.createRootNode(success.results, null, { uri: id })];
					else
						self._nodes = [deep.utils.createRootNode(success, null, { uri: id })];
				});
			};
			func._isDone_ = true;
			deep.chain.addInChain.apply(this, [func]);
			//self.range = deep.Chain.prototype.range;
			return self;
		};
		handler.post = chainWithBody.post;
		handler.put = chainWithBody.put;
		handler.patch = chainWithBody.patch;
		handler.del = function (id, options) {
			var self = this;
			var func = function (s, e) {
				return deep.when(deep.protocol.parse(self._store || self._storeName))
				.done(function(storeHandler){
					var store = storeHandler.provider, method = store.del;
					if (!method)
						return deep.errors.Store("provided store doesn't have DEL. aborting DELETE !");
					var val = deep.chain.val(self);
					if(method._deep_ocm_)
						method = method();
					return method.call(store, id || val.id, options);
				})
				.done(function (success) {
					self._nodes = [deep.utils.createRootNode(success)];
				});
			};
			func._isDone_ = true;
			//self.range = deep.Chain.prototype.range;
			deep.chain.addInChain.apply(this, [func]);
			return self;
		};
		handler.rpc = function (method, body, uri, options) {
			var self = this;
			var func = function (s, e) {
				return deep.when(deep.protocol.parse(self._store || self._storeName))
				.done(function (storeHandler) {
					var store = storeHandler.provider, action = store.rpc;
					if (!action)
						return deep.errors.Store("provided store doesn't have RPC. aborting RPC !");
					if(action._deep_ocm_)
						action = action();
					return action.call(store, method, body, uri, options);
				})
				.done(function (success) {
					self._nodes = [deep.utils.createRootNode(success)];
				});
			};
			func._isDone_ = true;
			//self.range = deep.Chain.prototype.range;
			deep.chain.addInChain.apply(this, [func]);
			return self;
		};
		handler.flush = function (method, body, uri, options) {
			var self = this;
			var func = function (s, e) {
				return deep.when(deep.protocol.parse(self._store || self._storeName))
				.done(function (storeHandler) {
					var store = storeHandler.provider, action = store.flush;
					if (!action)
						return deep.errors.Store("provided store doesn't have flush. aborting !");
					if(action._deep_ocm_)
						action = action();
					return action.call(store);
				});
			};
			func._isDone_ = true;
			//self.range = deep.Chain.prototype.range;
			deep.chain.addInChain.call(this, func);
			return self;
		};
		handler.bulk = function (arr, uri, options) {
			var self = this;
			var func = function (s, e) {
				return deep.when(deep.protocol.parse(self._store || self._storeName))
				.done(function(storeHandler){
					var store = storeHandler.provider, method = store.bulk;
					if (!method)
						return deep.errors.Store("provided store doesn't have BULK. aborting BULK !");
					if(method._deep_ocm_)
						method = method();
					return method.call(store, arr, uri, options);
				})
				.done(function (success) {
					self._nodes = [deep.utils.createRootNode(success)];
				});
			};
			func._isDone_ = true;
			//self.range = deep.Chain.prototype.range;
			deep.chain.addInChain.apply(this, [func]);
			return self;
		};
		return handler;
	};
}
});




