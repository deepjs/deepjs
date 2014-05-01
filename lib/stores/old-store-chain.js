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

define(["require", "./store", "../utils", "../errors", "../chains/deep", "../promise", "../nodes"], 
function(require, Store, utils, errors, chains, prom, nodes) {


    /**
     * start chain setted with a certain store
     * @example
     *
     * Store("json").get("/campaign/").log();
     
     *  ...
     *  Store("campaign").get("?").log()
     *
     *
     * @class Store
     * @constructor
     */
    Store.start = function(store) {
        //console.log("Store(name) : ", name)
        return deep(store || {})
        .done(function(s){
            if(!this._storeDef)
                this.rest(s);
        })
        .done(function(s) {
            //console.log("store init trough chain : ", handler.provider);
            this._state.nodes = [deep.nodes.root(s)];
        });
    };
    //______________________________________________________________________ CHAIN DECORATION
    chains.Chain.add("store", function(store) {
        var self = this;
        var func = function(s, e) {
            if(store._deep_request_)
                self._storeDef = store.handler.provider;
            else if(store._deep_protocol_handler_)
                self._storeDef = store.provider;
            else
                self._storeDef = store;
            return  deep
            .when(deep.protocol.prepare(self._storeDef))
            .done(function(st){
                self._store = st;
            });
        };
        Store.extendsChain(self);
        func._isDone_ = true;
        return self._enqueue(func);
    });

    var createWithBody = function(verb) {
        return function(object, options) {
            var self = this;
            var func = function(s, e) {
                var doIt = function(store) {
                    self._store = store;
                    var method = store[verb];
                    if (!method)
                        return errors.MethodNotAllowed("provided store doesn't have " + verb + ". aborting POST !");
                    if (method._deep_ocm_)
                        method = method();
                    return deep.when(method.call(store, object || chains.chain.val(self), options))
                    .done(function(success) {
                        self._state.nodes = [nodes.root(success)];
                    });
                };
                if(self._storeDef && !self._store)
                    return prom.when(deep.protocol.prepare(self._storeDef)).done(doIt);
                return doIt(self._store);
            };
            func._isDone_ = true;
            return self._enqueue(func);
        };
    };
    var chainWithBody = {
        post: createWithBody("post"),
        put: createWithBody("put"),
        patch: createWithBody("patch")
    };
    Store.extendsChain = function(handler) {
        handler.range = function(arg1, arg2, query, options) {
            var self = this;
            var func = function(s, e) {
                var doIt = function(store) {
                    self._store = store;
                    var method = store.range;
                    if (!method)
                        return errors.MethodNotAllowed("provided store doesn't have RANGE. aborting RANGE !");
                    if (method._deep_ocm_)
                        method = method();
                    return deep.when(method.call(store, arg1, arg2, query, options))
                    .done(function(success) {
                        if (success._deep_range_)
                            self._state.nodes = [nodes.root(success.results)];
                        else
                            self._state.nodes = [nodes.root(success)];
                    });
                };
                if(self._storeDef && !self._store)
                    return prom.when(deep.protocol.prepare(self._storeDef)).done(doIt);
                return doIt(self._store);
            };
            func._isDone_ = true;
            return self._enqueue(func);
        };
        handler.get = function(id, options) {
            var self = this;
            if (id == "?" || !id)
                id = "";
            var func = function(s, e) {
                var doIt = function(store){
                    self._store = store;
                    var method = store.get;
                    if (!method)
                        return errors.MethodNotAllowed("provided store doesn't have GET. aborting GET !");
                    if (method._deep_ocm_)
                        method = method();
                    if (id[0] == "*")
                        id = id.substring(1);
                    return deep.when(method.call(store, id, options))
                    .done(function(success) {
                        //console.log("Deep store chain Get success : ", success);
                        if (success && success._deep_range_)
                            self._state.nodes = [nodes.root(success.results, null, {
                                uri: id
                            })];
                        else
                            self._state.nodes = [nodes.root(success, null, {
                                uri: id
                            })];
                    });
                };
                if(self._storeDef && !self._store)
                    return prom.when(deep.protocol.prepare(self._storeDef)).done(doIt);
                return doIt(self._store);
            };
            func._isDone_ = true;
            return self._enqueue(func);
        };
        handler.post = chainWithBody.post;
        handler.put = chainWithBody.put;
        handler.patch = chainWithBody.patch;
        handler.del = function(id, options) {
            var self = this;
            var func = function(s, e) {
                var doIt = function(store){
                    self._store = store;
                    var method = store.del;
                    if (!method)
                        return errors.MethodNotAllowed("provided store doesn't have DEL. aborting DELETE !");
                    var val = chains.chain.val(self);
                    if (method._deep_ocm_)
                        method = method();
                    return deep.when(method.call(store, id || val.id, options))
                    .done(function(success) {
                        self._state.nodes = [nodes.root(success)];
                    });
                };
                if(self._storeDef && !self._store)
                    return prom.when(deep.protocol.prepare(self._storeDef)).done(doIt);
                return doIt(self._store);
            };
            func._isDone_ = true;
            return self._enqueue(func);
        };
        handler.rpc = function(method, args, uri, options) {
            var self = this;
            var func = function(s, e) {
                var doIt = function(store){
                    self._store = store;
                    var action = store.rpc;
                    if (!action)
                        return errors.MethodNotAllowed("provided store doesn't have RPC. aborting RPC !");
                    if (action._deep_ocm_)
                        action = action();
                    return deep.when(action.call(store, method, args, uri, options))
                    .done(function(success) {
                        self._state.nodes = [ nodes.root(success) ];
                    });
                };
                if(self._storeDef && !self._store)
                    return prom.when(deep.protocol.prepare(self._storeDef)).done(doIt);
                return doIt(self._store);
            };
            func._isDone_ = true;
            return self._enqueue(func);
        };
        handler.flush = function(method, body, uri, options) {
            var self = this;
            var func = function(s, e) {
                var doIt = function(store){
                    self._store = store;
                    var action = store.flush;
                    if (!action)
                        return errors.MethodNotAllowed("provided store doesn't have flush. aborting !");
                    if (action._deep_ocm_)
                        action = action();
                    return action.call(store);
                };
                if(self._storeDef && !self._store)
                    return prom.when(deep.protocol.prepare(self._storeDef)).done(doIt);
                return doIt(self._store);
            };
            func._isDone_ = true;
            return self._enqueue(func);
        };
        handler.bulk = function(arr, uri, options) {
            var self = this;
            var func = function(s, e) {
                var doIt = function(store){
                    self._store = store;
                    var method = store.bulk;
                    if (!method)
                        return errors.MethodNotAllowed("provided store doesn't have BULK. aborting BULK !");
                    if (method._deep_ocm_)
                        method = method();
                    return deep.when(method.call(store, arr, uri, options))
                    .done(function(success) {
                        self._state.nodes = [nodes.root(success)];
                    });
                };
                if(self._storeDef && !self._store)
                    return prom.when(deep.protocol.prepare(self._storeDef)).done(doIt);
                return doIt(self._store);
            };
            func._isDone_ = true;
            return self._enqueue(func);
        };
        handler.count = function(callback) {
            var self = this;
            var func = function(s, e) {
                var doIt = function(store){
                    self._store = store;
                    var method = store.count;
                    if (!method)
                        return errors.MethodNotAllowed("provided store doesn't have COUNT. aborting !");
                    if (method._deep_ocm_)
                        method = method();
                    return deep.when(method.call(store))
                    .done(callback);
                };
                if(self._storeDef && !self._store)
                    return prom.when(deep.protocol.prepare(self._storeDef)).done(doIt);
                return doIt(self._store);
            };
            func._isDone_ = true;
            return self._enqueue(func);
        };
        deep.utils.up({
            roles:deep.compose.after(function(){
                var self = this;
                var func = function(s, e) {              
                    self._store = null;
                };
                func._isDone_ = true;
                return self._enqueue(func);
            }),
            modes:deep.compose.after(function(){
                var self = this;
                var func = function(s, e) {                    
                    self._store = null;
                };
                func._isDone_ = true;
                return self._enqueue(func);
            })
        }, handler);
        return handler;
    };
});