/**
 * @module deep
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define([
    "require",
    "./lib/utils",
    "./lib/nodes",
    "./lib/query",
    "./lib/compose",
    "./lib/collider",
    "./lib/compiler",
    "./lib/emitter",
    "./lib/errors",
    "./lib/rql",
    "./lib/promise",
    "./lib/ocm",
    
    "./lib/sheet",
    "./lib/flatten",

    "./lib/protocol",
    "./lib/stores/store",
    "./lib/chains/deep",
    "./lib/chains/restful",
    "./lib/restrictions"
    /*"./lib/view",
    "./lib/schema",
    "./lib/stores/collection",
    "./lib/stores/object"*/
    ], function (require, utils) {
    
    if(typeof deep !== 'undefined')
    {
        console.log("***********************************************************************************");
        console.warn("You trying to load deepjs modules two times (maybe from two different node_modules)");
        console.warn("Will use previous loaded deep instance.");
        console.log("***********************************************************************************");
        return deep;
    }

    deep = function deepStart(obj, schema, options) {
        // console.log("CHAIN START : context : ", deep.context)
        options = options || {};
        var h = new deep.Chain(options._state || null, options), d;
        try {
            if (typeof obj === 'string')
                obj = deep.get(obj, options);
 
            if (typeof schema === 'string')
                schema = deep.get(schema, options);

            if(!schema && obj && (obj.then || obj.promise))
                d = deep.when(obj)
                .done(function (res) {
                    h._init(res);
                    h._start();
                });
            if(schema  && (schema.then || schema.promise))
                if(obj && (obj.then || obj.promise))
                    d = deep.all(obj, schema)
                    .done(function (res) {
                        h._init(res[0], res[1]);
                        h._start();
                    });
                else
                    d = deep.when(schema)
                    .done(function (res) {
                        h._init(null, res);
                        h._start();
                    });
            if(d)
                d.fail(function (error) {
                    h._start({success:null, error:error});
                });
            else
            {
                h._init(obj, schema);
                h._start();
            }
        } catch (error) {
            //console.log("internal chain start error : ", error);
            h._start({ success:null, error:error });
        }
        return h;
    };
    deep.utils = require("./lib/utils");

    deep.transformers = {};
    /**
     * rethrow any throw during chain execution.
     * @property rethrow
     * @static
     * @type {Boolean}
     */
    deep.rethrow = false;
    
    /**
     * are you on nodejs or not
     * @static
     * @property isNode
     * @type {Boolean}
     */
    deep.isNode = (typeof process !== 'undefined' && process.versions && process.versions.node);

    /**
     * a magic context that follow promise context and switch automaticaly
     * @static
     * @property interpret
     */
    deep.context = {};

    /**
     * where to place YOUR globals (deep does'nt have any globals)
     * @static
     * @property globals
     */
    deep.globals = {};

    /**
     * where to place YOUR globals headers to set on each store call (deep does'nt have any globals)
     * @static
     * @property globals
     */
    deep.globalHaders = {};

    deep.debug = true;

    deep.destructiveLoad = false;

    //require("./lib/utils")(deep);
    deep.errors = require("./lib/errors");
    deep.rql = require("./lib/rql");
    deep.collider = require("./lib/collider");

    deep.nodes = require("./lib/nodes");
    deep.deepLoad = function(entry, context, destructive, excludeFunctions){
        if(!entry._deep_query_node_)
            entry = deep.nodes.root(entry);
        return deep.nodes.deepLoad([entry])
    };
    /**
     * final namespace for deepjs/query
     * @static
     * @property Querier
     * @type {DeepQuery}
     */
    var Querier = deep.Querier = require("./lib/query");
    /**
     * perform a (synched) query query
     * @example
     *
     * deep.query({ hello:"world", test:1 }, "/*?=world"); // will return ["world"]
     *
     * @method query
     * @param {Object} object any object to query
     * @param {String} query the query
     * @static
     * @return {Array} the result aray
     */
    deep.query = Querier.query;

    deep.ui = {};
    deep.client = {};

    var compiler = require("./lib/compiler");
    deep.Shared = compiler.Shared;
    deep.compile = compiler.compile;
    deep.up = compiler.up;
    deep.bottom = compiler.bottom;

    deep.compose = require("./lib/compose");
    deep.Arguments = deep.compose.Arguments;

    var flat = require("./lib/flatten");
    deep.extendsChilds = flat.extendsChilds;
    deep.extendsBackgrounds = flat.extendsBackgrounds;
    utils.flatten = deep.flatten = flat.flatten;

    var proto = require("./lib/protocol");
    deep.protocol = proto.protocol;
    deep.protocols = proto.protocols;
    deep.get = proto.get;
    deep.getAll = proto.getAll;

    var ocm = require("./lib/ocm");
    deep.ocm = ocm;
    deep.Modes = ocm.Modes;
    deep.Roles = ocm.Roles;
    deep.modes = ocm.modes;
    deep.roles = ocm.roles;
    deep.getModes = ocm.getModes;

    var event = require("./lib/emitter");
    deep.Event = event.Event;
    deep.Emitter = event.Emitter;

    var sheets = require("./lib/sheet");
    for(var i in sheets)
        deep[i] = sheets[i];

    var promise = require("./lib/promise");
    for(var i in promise)
        deep[i] = promise[i];

    deep.Chain = require("./lib/chains/deep");

    var Store = require("./lib/stores/store");
    deep.Store = Store;
    deep.client = {};
    deep.store = {};
   // deep.store = Store.start;
    deep.rest = require("./lib/chains/restful").start;

    deep.delay = function(ms){
        return deep({}).delay(ms);
    }

    var restrictions = require("./lib/restrictions");
    for(var i in restrictions)
        deep[i] = restrictions[i];

    deep.store.Restrictions = deep.Restrictions;
    deep.store.AllowOnly = deep.AllowOnly;

    deep.Promise.API.deep = function(val, schema, options) {
        options = options || {};
        var h = new deep.Chain(this._state, options);
        var self = this;
        var func = function(s,e){
            //console.log("$$$$$$$$$$ chain.deep : ", self._context, deep.context);
            return deep(val || s, schema, options);
        };
        func._isDone_ = true;
        this._enqueue(h);
        h._enqueue(func);
        return h;
    };
    //_________________________________________________________________________________

    deep.coreUnits = deep.coreUnits || [];
    deep.coreUnits.push(
        "js::deepjs/units/equals",
        "js::deepjs/units/queries",
        "js::deepjs/units/collisions",
        "js::deepjs/units/colliders",
        "js::deepjs/units/compositions",
        "js::deepjs/units/flatten",
        "js::deepjs/units/promises",
        "js::deepjs/units/chain",
        "js::deepjs/units/replace",
        "js::deepjs/units/remove",
        "js::deepjs/units/interpret",
        "js::deepjs/units/relations",
        "js::deepjs/units/context",
        "js::deepjs/units/ocm",
        "js::deepjs/units/sheets",
        "js::deepjs/units/shared",
        "js::deepjs/units/parcours",
        "js::deepjs/units/deepload",
        "js::deepjs/units/utils",
        "js::deepjs/units/restrictions",
        "js::deepjs/units/custom-chain",
        "js::deepjs/units/views"
    );
    //_________________________________________________________________________________
    return deep;
});