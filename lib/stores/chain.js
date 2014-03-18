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

define(["require", "./store", "../utils", "../errors", "../chain", "../promise"], function(require, str, utils, errors, chains, prom) {

    var addInChain = chains.chain.addInChain;
    //______________________________________________________________________ CHAIN DECORATION
    chains.Chain.add("store", function(store) {
        var self = this;
        var func = function(s, e) {
            self._store = store;
            return  str.store.prepare(store);
        };
        str.Store.extendsChain(self);
        func._isDone_ = true;
        addInChain.call(self, func);
        return this;
    });

    var createWithBody = function(verb) {
        return function(object, options) {
            var self = this;
            var func = function(s, e) {
                return prom.when(str.store.prepare(self._store))
                    .done(function(store) {
                        //console.log("Chain post : ", object);
                        var method = store[verb];
                        if (!method)
                            return errors.Store("provided store doesn't have " + verb + ". aborting POST !");
                        if (method._deep_ocm_)
                            method = method();
                        return method.call(store, object || chains.chain.val(self), options);
                    })
                    .done(function(success) {
                        self._nodes = [utils.createRootNode(success)];
                    });
            };
            func._isDone_ = true;
            addInChain.call(this, func);
            return self;
        };
    };
    var chainWithBody = {
        post: createWithBody("post"),
        put: createWithBody("put"),
        patch: createWithBody("patch")
    };
    str.Store.extendsChain = function(handler) {
        handler.range = function(arg1, arg2, query, options) {
            var self = this;
            var func = function(s, e) {
                return prom.when(str.store.prepare(self._store))
                    .done(function(store) {
                        var method = store.range;
                        if (!method)
                            return errors.Store("provided store doesn't have RANGE. aborting RANGE !");
                        if (method._deep_ocm_)
                            method = method();
                        return method.call(store, arg1, arg2, query, options);
                    })
                    .done(function(success) {
                        if (success._deep_range_)
                            self._nodes = [utils.createRootNode(success.results)];
                        else
                            self._nodes = [utils.createRootNode(success)];
                    });
            };
            func._isDone_ = true;
            //self.range = chains.chain.prototype.range;
            addInChain.call(self, func);
            return self;
        };
        handler.get = function(id, options) {
            var self = this;
            if (id == "?" || !id)
                id = "";
            var func = function(s, e) {
                return prom.when(str.store.prepare(self._store))
                    .done(function(store) {
                        var method = store.get;
                        if (!method)
                            return errors.Store("provided store doesn't have GET. aborting GET !");
                        if (method._deep_ocm_)
                            method = method();
                        if (id[0] == "*")
                            id = id.substring(1);
                        return method.call(store, id, options);
                    })
                    .done(function(success) {
                        //console.log("Deep store chain Get success : ", success);
                        if (success && success._deep_range_)
                            self._nodes = [utils.createRootNode(success.results, null, {
                                uri: id
                            })];
                        else
                            self._nodes = [utils.createRootNode(success, null, {
                                uri: id
                            })];
                    });
            };
            func._isDone_ = true;
            addInChain.call(self, func);
            //self.range = chains.chain.prototype.range;
            return self;
        };
        handler.post = chainWithBody.post;
        handler.put = chainWithBody.put;
        handler.patch = chainWithBody.patch;
        handler.del = function(id, options) {
            var self = this;
            var func = function(s, e) {
                return prom.when(str.store.prepare(self._store))
                    .done(function(store) {
                        var method = store.del;
                        if (!method)
                            return errors.Store("provided store doesn't have DEL. aborting DELETE !");
                        var val = chains.chain.val(self);
                        if (method._deep_ocm_)
                            method = method();
                        return method.call(store, id || val.id, options);
                    })
                    .done(function(success) {
                        self._nodes = [utils.createRootNode(success)];
                    });
            };
            func._isDone_ = true;
            //self.range = chains.chain.prototype.range;
            addInChain.call(self, func);
            return self;
        };
        handler.rpc = function(method, body, uri, options) {
            var self = this;
            var func = function(s, e) {
                return prom.when(str.store.prepare(self._store))
                    .done(function(store) {
                        var action = store.rpc;
                        if (!action)
                            return errors.Store("provided store doesn't have RPC. aborting RPC !");
                        if (action._deep_ocm_)
                            action = action();
                        return action.call(store, method, body, uri, options);
                    })
                    .done(function(success) {
                        self._nodes = [utils.createRootNode(success)];
                    });
            };
            func._isDone_ = true;
            //self.range = chains.chain.prototype.range;
            addInChain.call(self, func);
            return self;
        };
        handler.flush = function(method, body, uri, options) {
            var self = this;
            var func = function(s, e) {
                return prom.when(str.store.prepare(self._store))
                    .done(function(store) {
                        var action = store.flush;
                        if (!action)
                            return errors.Store("provided store doesn't have flush. aborting !");
                        if (action._deep_ocm_)
                            action = action();
                        return action.call(store);
                    });
            };
            func._isDone_ = true;
            //self.range = chains.chain.prototype.range;
            addInChain.call(self, func);
            return self;
        };
        handler.bulk = function(arr, uri, options) {
            var self = this;
            var func = function(s, e) {
                return prom.when(str.store.prepare(self._store))
                    .done(function(store) {
                        var method = store.bulk;
                        if (!method)
                            return errors.Store("provided store doesn't have BULK. aborting BULK !");
                        if (method._deep_ocm_)
                            method = method();
                        return method.call(store, arr, uri, options);
                    })
                    .done(function(success) {
                        self._nodes = [utils.createRootNode(success)];
                    });
            };
            func._isDone_ = true;
            //self.range = chains.chain.prototype.range;
            addInChain.call(self, func);
            return self;
        };
        return handler;
    };
});