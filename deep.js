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
	"./lib/nodes/query",
	"./lib/nodes/dq-protocol",
	"./lib/compose",
	"./lib/collider",
	"./lib/compiler",
	"./lib/classes",
	"./lib/utils/interpret",
	"./lib/emitter",
	"./lib/errors",
	"./lib/nodes/rql",
	"./lib/promise",
	"./lib/context",
	"./lib/nodes/nodes",
	"./lib/utils/logs",
	"./lib/nodes/deep-load",
	"./lib/utils/deep-equal",
	"./lib/ocm",
	"./lib/nodes/traversal",
	"./lib/flatten",
	"./lib/protocol",
	"./lib/sheet",
	"./lib/nodes/nodes-composer",
	"./lib/nodes/nodes-chain",
	"./lib/restrictions",
	"./lib/validator"
	//"./lib/schema"
], function(require, utils,  query, dq, composer, collider, compiler, classes, interpret, emitter, errors, rql,promise, context, nodes, logs,  deepLoader, deepEqual, ocm, traversal, flattener, protocol, sheets, NodesComposer, NodesChain, restrictions, Validator) {

	/*if (typeof deep !== 'undefined') {
		console.log("***********************************************************************************");
		console.warn("You trying to load deepjs modules two times (maybe from two differents node_modules (or bower) module)");
		console.warn("It could be voluntary. If not : you should think it twice. Protocols and context are local to deep instances (by examples).");
		console.log("***********************************************************************************");
	}*/

	var deep = {};

	deep.utils = utils;

	deep.transformers = {};

	deep.log = logs.log;
	deep.warn = logs.warn;
	deep.error = logs.error;
	deep.setLogger = logs.setMain;

	deep.nodes = NodesChain.start;
	deep.utils.nodes = nodes;

	/**
	 * are you on nodejs or not
	 * @static
	 * @property isNode
	 * @type {Boolean}
	 */
	deep.isNode = (typeof process !== 'undefined' && process.versions && process.versions.node);

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

	for (var i in compiler)
		deep[i] = compiler[i];
	for (var i in classes)
		deep[i] = classes[i];

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
	deep.modes = ocm.modes;
	deep.currentModes = ocm.currentModes;
	deep.matchModes = ocm.matchModes;

	deep.Event = emitter.Event;
	deep.Emitter = emitter.Emitter;

	for (var i in sheets)
		deep[i] = sheets[i];

	for (var i in promise)
		deep[i] = promise[i];

	deep.NodesChain = NodesChain;
	deep.delay = function(ms) {
		return deep.nodes({}).delay(ms);
	};

	for (var i in restrictions)
		deep[i] = restrictions[i];

	//_________________________________________________________________________________

	deep.contextualise = context.contextualise;
	deep.fromContext = context.fromContext;
	deep.context = context.context;

	deep.flatten = flattener.flatten;
	deep.extendsGrounds = flattener.extendsGrounds;

	/**
	 * the deep schema validator
	 * @static
	 * @property Validator
	 */
	deep.Validator = Validator;
	/**
	 * perform a schema validation
	 * @static
	 * @method validate
	 * @param object the object to validate
	 * @param schema the schema
	 * @return {deep.validate.Report} the validation report
	 */
	deep.validate = Validator.validate;
	/**
	 * perform a schema partial validation (only on certain field)
	 * @static
	 * @method partialValidation
	 * @param object the object to validate
	 * @param fields the array of properties paths to validate
	 * @param schema the schema
	 * @return {deep.validate.Report} the validation report
	 */
	deep.partialValidation = Validator.partialValidation;



	// deep chain's mode management
	deep.modes = function(name, modes) { // local roles (i.e. in chain's context)
		return deep.nodes({}).modes(name, modes);
	};

	deep.coreUnits = deep.coreUnits || [];
	deep.coreUnits.push(
		"req::deepjs/units/equals",
		"req::deepjs/units/queries",
		"req::deepjs/units/collisions",
		"req::deepjs/units/colliders",
		"req::deepjs/units/compositions",
		"req::deepjs/units/classes",
		"req::deepjs/units/protocols",
		"req::deepjs/units/flatten",
		"req::deepjs/units/promises",
		"req::deepjs/units/chain",
		"req::deepjs/units/replace",
		"req::deepjs/units/remove",
		"req::deepjs/units/interpret",
		//"req::deepjs/units/relations",
		"req::deepjs/units/context",
		"req::deepjs/units/ocm",
		"req::deepjs/units/sheets",
		"req::deepjs/units/shared",
		"req::deepjs/units/parcours",
		//"req::deepjs/units/deepload",
		"req::deepjs/units/utils",
		"req::deepjs/units/custom-chain"
	);
	
	//_________________________________________________________________________________
	return deep;
});