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

define(["require", "../utils", "../errors", "../promise", "../compiler"], function(require, utils, errors, prom) {

    var stores = {};
    //deep.extensions = [];
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
    stores.store = function(store) {
        //console.log("Store(name) : ", name)
        return deep(store || {})
        .done(function(){
            if(!this._store)
                this.store(store);
        })
        .done(function(s) {
            //console.log("store init trough chain : ", handler.provider);
            this._nodes = [deep.utils.createRootNode(s)];
        });
    };

    stores.store.prepare = function(store)
    {
        var p = null;
        if(typeof store === 'string')
            p = deep.when(deep.protocol(store));
        else
            p = deep.when(store);
        return p.done(function(st){
            if(!st)
                return deep.errors.Store("no store found with : ",store);
            if(st._deep_ocm_)
                return st.flatten()
                .done(function(st){
                    return st();
                });
            return st;
        })
        .done(function(st){
            if(st.init)
                return st.init();
        });
    }

    /**
     * Empty class : Just there to get instanceof working (be warning with iframe issue in that cases).
     * @class Store
     * @constructor
     */
    var Store = stores.Store = function(protocol) {
        //console.log("Store : protocol : ", protocol);
        if (protocol && typeof protocol === 'object')
            utils.up(protocol, this);
        else
            this.protocol = protocol || this.protocol;

        if (this.protocol)
            deep.protocol(this.protocol, this);
        this._deep_store_ = true;
    };

    stores.Store.forbidden = function(message) {
        return function(any, options) {
            return prom.when(errors.Forbidden(message));
        };
    };
    stores.store.Restrictions = function() {
        var restrictions = {};
        for (var i in arguments)
            restrictions[arguments[i]] = Store.forbidden();
        return restrictions;
    };
    stores.store.AllowOnly = function() {
        var restrictions = {
            get: Store.forbidden(),
            range: Store.forbidden(),
            post: Store.forbidden(),
            put: Store.forbidden(),
            patch: Store.forbidden(),
            del: Store.forbidden(),
            rpc: Store.forbidden(),
            bulk: Store.forbidden()
        };
        for (var i in arguments)
            delete restrictions[arguments[i]];
        return restrictions;
    };

    stores.store.filterPrivate = function(method) {
        return function(result) {
            //console.log("private check : ", this, result);
            if (!this.schema)
                return result;
            var schema = this.schema;
            if (schema._deep_ocm_)
                schema = schema(method);
            var res = utils.remove(result, ".//!?_schema.private=true", this.schema);
            return result;
        };
    };

    return stores;
});