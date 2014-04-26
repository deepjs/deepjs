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

define(["require", "../utils", "../errors", "../promise", "../compiler"], function(require, utils, errors, prom)
{
    utils.parseRestPath = function(path, parser)
    {
        if(path == '/')
            return {};
        if(parser)
        {
            var opt = parser.match(path);
            if(parser._deep_route_)
                opt = opt.output;
            return opt;
        }
        var options = {},
            splitted = path.split("/");
        if(path[0] === "/")
            splitted.shift();
        if(path[path.length-1]=="/")
            splitted.pop();
        if(splitted[0][0] == "?")
            options.query = path;
        else
        { 
            options.id = splitted.shift();
            if(splitted.length)
                options.path = "/"+splitted.join("/");
        }
        return options;
    };
    var stores = {};

    stores.manageRestPath = function(arg, options){
        if(!arg || arg == '/')
            return deep.Arguments([arg, options]);
        return deep.Arguments([deep.utils.parseRestPath(arg, this.route), options]);
    };

    stores.managePathOptions = function(arg, options)
    {
        if(!options || options == '/')
            return deep.Arguments([arg, {}]);
        var str = null;
        if(typeof options !== 'string')
            str = options.path;
        else{
            str = options;
            options = {};
        }
        if(str)
        {
            var opt = deep.utils.parseRestPath(str, this.route);
            deep.utils.up(opt, options);
        }
        return deep.Arguments([arg, options]);
    };

    var argToArr = Array.prototype.slice;
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
            this._state.nodes = [deep.nodes.root(s)];
        });
    };

    stores.store.prepare = function(store)
    {
        if(typeof store === 'string')
            store = deep.protocol(store);
        if(!store)
            return errors.Store("no store found with : ",store);
        //console.log("PREPARE CONTEXT --------> ", deep.context.modes, store._deep_ocm_);
        if(store._deep_ocm_)
            return store.flatten()
            .done(function(store){
                store = store();
                //console.log("Store prepare OCM flattened : ", deep.context.modes, store);
                if(store.init)
                    return store.init() || store;
                return store;
            });
        if(store.init)
            return store.init() || store;
        return store;
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
        _deep_restrictable_:["get","range","post","put","patch","del","rpc","bulk"]
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
        return {
            inner:{},
            allowable:argToArr.call(arguments),
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
                    var toRemove = deep.utils.removeInside(res._deep_restrictable_.slice(), this.allowable);
                    for(var j = 0, lenj = toRemove.length; j < lenj; ++j)
                        res[toRemove[j]] = Store.forbidden();
                }
                else
                {
                    if(!toKeep)
                    {
                        toKeep = {};
                        for(var l = 0, lenl = this.allowable.length; l < lenl; ++l)
                            toKeep[this.allowable[l]] = true;
                    }
                    for(var k in res)
                        if(typeof res[k] === 'function' && !toKeep[k])
                            res[k] = Store.forbidden();
                }
                return res;
            }
        };
    };



    return stores;
});


