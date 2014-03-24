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

    var argToArr = Array.prototype.slice;
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
            if(!this._storeDef)
                this.store(store);
        })
        .done(function(s) {
            //console.log("store init trough chain : ", handler.provider);
            this._nodes = [deep.nodes.root(s)];
        });
    };

    stores.store.prepare = function(store)
    {
        var str = store;
        if(typeof store === 'string')
            str = deep.protocol(store);
        if(!str)
            return errors.Store("no store found with : ",store);
        if(str._deep_ocm_)
            return str.flatten()
            .done(function(st){
                st = st();
                if(st.init)
                    return st.init() || st;
            });
        if(str.init)
            return str.init() || str;
        return str;
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

    Store.prototype = {
        _deep_restrictable_:["get","rang","post","put","patch","del","rpc","bulk"]
    };

    stores.Store.forbidden = function(message) {
        return function(any, options) {
            return errors.Forbidden(message);
        };
    };
    stores.store.Restrictions = function() {
        var restrictions = {};
        for (var i in arguments)
            restrictions[arguments[i]] = Store.forbidden();
        return restrictions;
    };
    stores.store.AllowOnly = function() {
        var allowable = argToArr.call(arguments);
        var restrictions = {
            inner:{},
            allowable:allowable,
            _deep_compiler_ : true,
            _deep_allow_only_ : true,
            up : function() {                 // apply arguments (up) on inner-layer : so merge
                // console.log("allow only up : ", arguments);
                var res = this.inner;
                for (var i = 0, len = arguments.length; i < len; ++i)
                {
                    var argi = arguments[i];
                    if(argi._deep_allow_only_)
                    {
                        res = utils.up(argi.inner, res);
                        this.allowable = utils.up(argi.allowable, this.allowable);
                    }    
                    else
                        res = utils.up(argi, res);
                }
                this.inner = res;
                return this;
            },
            bottom : function() {             // apply arguments (bottom) on this : so apply restrictions

                // console.log("allow only bottom : ", arguments);
                var res = this.inner, toKeep = null;
                for (var len = arguments.length-1; len >= 0; --len)
                {
                    var argi = arguments[len];
                    if(argi._deep_allow_only_)
                    {
                        res = utils.bottom(argi.inner, res);
                        this.allowable = utils.up(argi.allowable, this.allowable);
                    }    
                    else
                        res = utils.bottom(argi, res);
                }
                if(res._deep_restrictable_)
                {
                    var toRemove = deep.utils.removeInside(res._deep_restrictable_.slice(), allowable);
                    for(var j = 0, lenj = toRemove.length; j < lenj; ++j)
                        res[toRemove[j]] = Store.forbidden();
                }
                else
                {
                    if(!toKeep)
                    {
                        toKeep = {};
                        for(var l = 0, lenl = allowable.length; l < lenl; ++l)
                            toKeep[allowable[l]] = true;
                    }
                    for(var k in res)
                        if(!toKeep[k])
                            res[k] = Store.forbidden();
                }
                // console.log("allow only bottom : res :  ", res);
                return res;
            }
        };
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


