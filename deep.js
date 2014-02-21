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
    "./lib/query",
    "./lib/compose",
    "./lib/collider",
    "./lib/errors",
    "./lib/stores/stores",
    "./lib/ocm",
    //"./lib/stores/collection-store",
    //"./lib/stores/object-store",
    "./lib/protocol",
    "./lib/sheet",
    "./lib/promise",
    "./lib/chain",
    "./lib/flatten",
    //"./lib/selector",
    //"./lib/treatment",
    //"./lib/unit",
    "./lib/compiler",
    "./lib/emitter",
    //"./lib/clients/client-store",
    "./lib/rql",
    //"./lib/schema"
    ], function (require) {
    
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
                    h._nodes = [deep.utils.createRootNode(obj, schema, options)];

                if (obj && obj._deep_store_)
                {
                    h.store(obj);
                    deep.Store.extendsChain(h);
                }

                h._root = h._nodes[0];
                h._start(r, null);
            };
            var alls = null;
            if ((obj && (obj.then || obj.promise)) || (schema && (schema.then || schema.promise)))
                deep.all(obj, schema)
                .done(function (res) {
                    doStart(res[0], res[1]);
                })
                .fail(function (error) {
                    h._nodes = null;
                    h._start(null, error);
                });
            else
                doStart(obj, schema);
        } catch (error) {
            console.log("internal chain start error : ", error);
            h._nodes = [deep.utils.createRootNode({}, schema, options)];
            h._start(null, error);
        }
        return h;
    };

    /**
     * rethrow any throw during chain execution.
     * @property rethrow
     * @static
     * @type {Boolean}
     */
    deep.rethrow = false;
    
    deep.metaSchema = {};

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

    require("./lib/utils")(deep);
    require("./lib/errors")(deep);
    require("./lib/promise")(deep);
    require("./lib/compiler")(deep);
    require("./lib/compose")(deep);
    require("./lib/collider")(deep);



    /**
     * final namespace for deepjs/query
     * @static
     * @property Querier
     * @type {DeepQuery}
     */
    var Querier = deep.Querier = require("./lib/query")(deep);
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

    require("./lib/chain")(deep);
    require("./lib/flatten")(deep);
    require("./lib/protocol")(deep);
    require("./lib/sheet")(deep);
    require("./lib/ocm")(deep);
    require("./lib/stores/stores")(deep);
    //require("./lib/stores/collection-store")(deep);
    //require("./lib/stores/object-store")(deep);
    //require("./lib/clients/client-store")(deep);
    require("./lib/rql")(deep);
    require("./lib/emitter")(deep);
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
        "js::deepjs/units/deepload"
    );
    //_________________________________________________________________________________
    return deep;
});