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
    "./lib/errors",
    "./lib/stores/store",
    "./lib/ocm",
    "./lib/protocol",
    "./lib/sheet",
    "./lib/promise",
    "./lib/chain",
    "./lib/flatten",
    "./lib/compiler",
    "./lib/emitter",
    "./lib/rql",
    "./lib/stores/chain"
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
        var h = new deep.Chain(options);
        try {
            if (typeof obj === 'string')
                obj = deep.get(obj);
            if (typeof schema === 'string')
                schema = deep.get(schema);
            var doStart = function doStartChain(obj, schema)
            {
                var r = obj;
                if (obj && obj._deep_query_node_)
                {
                    r = obj.value;
                    h._nodes = [obj];
                }
                else
                    h._nodes = [deep.nodes.root(obj, schema, options)];

                if (r && r._deep_store_)
                    h.store(r)
                    .done(function(s){
                        this._nodes = [deep.nodes.root(s)];
                    });

                h._root = h._nodes[0];
                h._start({_success:r, _error:null});
            };
            var alls = null;
            if ((obj && (obj.then || obj.promise)) || (schema && (schema.then || schema.promise)))
                deep.all(obj, schema)
                .done(function (res) {
                    doStart(res[0], res[1]);
                })
                .fail(function (error) {
                    h._nodes = null;
                    h._start({_success:null, _error:error});
                });
            else
                doStart(obj, schema);
        } catch (error) {
            console.log("internal chain start error : ", error);
            h._nodes = [deep.nodes.root({}, schema, options)];
            h._start({ _success:null, _error:error });
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

    var chains = require("./lib/chain");
    deep.Chain = chains.Chain;
    deep.chain = chains.chain;

    var stores = require("./lib/stores/store");
    deep.Store = stores.Store;
    deep.store = stores.store;
    deep.client = {};

    require("./lib/stores/chain");

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
        "js::deepjs/units/range",
        "js::deepjs/units/relations",
        "js::deepjs/units/context",
        "js::deepjs/units/ocm",
        "js::deepjs/units/sheets",
        "js::deepjs/units/shared",
        "js::deepjs/units/parcours",
        "js::deepjs/units/deepload",
        "js::deepjs/units/utils",
        "js::deepjs/units/restrictions"
    );
    //_________________________________________________________________________________
    return deep;
});