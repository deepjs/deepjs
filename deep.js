/**
 * @module deep
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * TODO : adding events on : 
 * 		modes : changed
 * 		
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
	"./lib/deep-sheeter",
	"./lib/flatten",
	// "./lib/flatten-stack",
	"./lib/protocol",
	"./lib/deep-chain",
	"./lib/restrictions",
	"./lib/traversal"
	//"./lib/schema"
	//"./lib/view"
	//"./lib/stores/collection"
], function(require, utils, nodes, query, composer, collider, compiler, emitter, errors, rql, promise, ocm, sheets, Sheeter, flattener, protocol, deepChain, restrictions, traversal) {

	if (typeof deep !== 'undefined') {
		console.log("***********************************************************************************");
		console.warn("You trying to load deepjs modules two times (maybe from two differents node_modules module)");
		console.warn("Will use previously loaded deep instance.");
		console.log("***********************************************************************************");
		return deep;
	}

	deep = function(obj, schema, options) {
		// console.log("CHAIN START : context : ", deep.context)
		options = options || {};
		var h = new deep.Chain(options._state || null, options),
			d;
		try {
			if (typeof obj === 'string')
				obj = deep.get(obj, options);

			if (typeof schema === 'string')
				schema = deep.get(schema, options);

			if (!schema && obj && (obj.then || obj.promise))
				d = deep.when(obj)
					.done(function(res) {
						h._init(res);
						h.resolve();
					});
			if (schema && (schema.then || schema.promise))
				if (obj && (obj.then || obj.promise))
					d = deep.all([obj, schema])
						.done(function(res) {
							h._init(res[0], res[1]);
							h.resolve();
						});
				else
					d = deep.when(schema)
						.done(function(res) {
							h._init(null, res);
							h.resolve();
						});
			if (d)
				d.fail(function(error) {
					h.reject(error);
				});
			else {
				h._init(obj, schema);
				h.resolve();
			}
		} catch (error) {
			//console.log("internal chain start error : ", error);
			h.reject(error);
		}
		return h;
	};

	deep.log = function() {
		if (deep.context.logger) {
			var logger = deep.context.logger;
			if (logger._deep_ocm_)
				logger = logger();
			logger.log.apply(logger, arguments);
		} else if (console.log.apply)
			console.log.apply(console, arguments);
		else
			console.log(deep.utils.argToArr(arguments));
	};
	deep.warn = function() {
		if (deep.context.logger) {
			var logger = deep.context.logger;
			if (logger._deep_ocm_)
				logger = logger();
			logger.warn.apply(logger, arguments);
		} else if (console.warn.apply)
			console.warn.apply(console, arguments);
		else
			console.warn(deep.utils.argToArr(arguments));
	};
	deep.error = function() {
		if (deep.context.logger) {
			var logger = deep.context.logger;
			if (logger._deep_ocm_)
				logger = logger();
			logger.error.apply(logger, arguments);
		} else if (console.error.apply)
			console.error.apply(console, arguments);
		else
			console.error(deep.utils.argToArr(arguments));
	};

	deep.utils = utils;

	deep.transformers = {};

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
	deep.context = {
		rethrow: false,
		debug: true
	};

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

	//require("./lib/utils")(deep);
	deep.errors = errors;
	deep.rql = rql;
	deep.collider = collider;
	for (var i in traversal)
		deep[i] = traversal[i];


	deep.nodes = nodes;
	deep.deepLoad = function(entry, context, destructive, excludeFunctions) {
		if (!entry._deep_query_node_ && !entry._deep_array_)
			entry = deep.nodes.root(entry);
		if(entry._deep_array_)
			return deep.nodes.deepLoad(entry)
		return deep.nodes.deepLoad([entry])
	};
	/**
	 * final namespace for deepjs/query
	 * @static
	 * @property Querier
	 * @type {DeepQuery}
	 */
	var Querier = deep.Querier = query;
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

	for (var i in compiler)
		deep[i] = compiler[i];

	deep.compose = composer.compose;
	deep.Composition = composer.Composition;
	deep.Composer = composer.Composer;
	deep.compose.Classes = deep.Classes;		// for backward compatibility
	deep.compose.ClassFactory = deep.ClassFactory;	// for backward compatibility
	deep.Arguments = deep.compose.Arguments;

	//deep.extendsChilds = flatten.extendsChilds;
	//deep.extendsBackgrounds = flatten.extendsBackgrounds;
	//utils.flatten = deep.flatten = flatten.flatten;

	deep.protocol = protocol.protocol;
	deep.protocols = protocol.protocols;
	deep.get = protocol.get;
	deep.getAll = protocol.getAll;

	deep.ocm = ocm;
	deep.Modes = ocm.Modes;
	deep.Roles = ocm.Roles;
	deep.modes = ocm.modes;
	deep.roles = ocm.roles;
	deep.getModes = ocm.getModes;

	deep.Event = emitter.Event;
	deep.Emitter = emitter.Emitter;

	for (var i in sheets)
		deep[i] = sheets[i];

	for (var i in promise)
		deep[i] = promise[i];

	deep.Chain = deepChain;


	deep.Sheeter = Sheeter;

	deep.delay = function(ms) {
		return deep({}).delay(ms);
	}

	for (var i in restrictions)
		deep[i] = restrictions[i];


	//_________________________________________________________________________________

	deep.contextualise = function() {
		return new Promise().contextualise().resolve();
	}
	deep.fromContext = function(key) {
		return new Promise().resolve(deep.context[key]);
	}

	/**
	 * contextualised loop on a callback
	 *
	 *
	 * @example 
	 * 	deep.loop(function(s){ console.log("hello success : ", s); return s+1; }, 50, 10, 1).done(function(s){ console.log("end of loop : ", s); });
	 *
	 * @example
	 * 	// to finish loop :
	 *
	 * 	deep.loop(function(s){ console.log("hello success : ", s); if(s >10) this.finish(); return s+1; }, 50, null, 1).done(function(s){ console.log("end of loop : ", s); });
	 * 
	 * @param  {Function} callBack     the callback that need to be called several times. receive promise success as single argument.
	 * @param  {Number} interval     	interval between call
	 * @param  {Number} maxIteration 	
	 * @param  {*} input        		First promise success
	 * @return {Promise}              a promise that could handle end of loop.
	 */
	deep.loop = function(callBack, interval, maxIteration, input){
		var iteration = 0, finished = false;
		var iterate = function(s){
			if(finished)
				return s;
			if(maxIteration)
			{
				iteration++;
				if(maxIteration < iteration)
					return s;
			}
			this.done(callBack).delay(interval).done(iterate);
			return s;
		}
		var p = new deep.Promise().resolve(input).done(iterate);
		p.finish = function(){
			finished = true;
		};
		return p;
	};

	deep.flatten = flattener.flatten;

	deep.coreUnits = deep.coreUnits || [];
	deep.coreUnits.push(
		"js::deepjs/units/equals",
		"js::deepjs/units/queries",
		"js::deepjs/units/collisions",
		"js::deepjs/units/colliders",
		"js::deepjs/units/compositions",
		"js::deepjs/units/protocols",
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
		"js::deepjs/units/custom-chain"
	);
	//_________________________________________________________________________________
	return deep;
});