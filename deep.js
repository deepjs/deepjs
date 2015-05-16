/**  @author Gilles Coomans <gilles.coomans@gmail.com> */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define([
		"deep-compiler/index",
		"deep-compiler/lib/classes",
		"deep-compiler/lib/restrictions",
		"deep-protocols/index",
		"./lib/cache",
		"./lib/promise",
		"deep-modes/index",
		"decompose/index",
		"./lib/nodes",
		"deep-nodes/lib/query",
		"deep-nodes/lib/rql",
		"deep-nodes/lib/traversal",
		"deep-nodes/lib/chained-api",
		"deep-ocm/index",
		"deep-flatten/index",
		"deep-sheets/index",
		"deep-utils/index",
		"deep-utils/lib/string",
		"deep-utils/lib/errors",
		"./lib/validator",
		"./lib/deepequal",
		"./lib/emitter",
		"./lib/logs",
		"deep-utils/lib/interpret"
	],
	function(
		compiler,
		Classes,
		restrictions,
		protocol,
		cache,
		promise,
		modes,
		decompose,
		nodes,
		Querier,
		rql,
		traversal,
		nodesChainedApi,
		ocm,
		flattener,
		sheeter,
		utils,
		stringUtils,
		errors,
		Validator,
		deepEqual,
		emitter,
		logger
	) {

		function copyTo(what, where) {
			for (var i in what)
				where[i] = what[i];
		}

		var deep = {
			Classes: Classes,
			compose: decompose,
			Querier: Querier,
			rql: rql,
			ocm: ocm,
			flatten: flattener.flatten,
			sheet: sheeter.sheet,
			utils: utils,
			cache: cache,
			Arguments: decompose.Arguments,
			errors: errors,
			query: Querier.query,
			isNode: (typeof process !== 'undefined' && process.versions && process.versions.node),
			globals: {}
		};

		utils.nodes = nodes;
		utils.deepEqual = deepEqual;

		copyTo(promise, deep);
		copyTo(compiler, deep);
		copyTo(restrictions, deep);
		copyTo(protocol, deep);
		copyTo(traversal, deep);
		copyTo(modes, deep);
		copyTo(stringUtils, utils);
		copyTo(emitter, deep);
		copyTo(logger, deep);

		delete deep.setModesIn;
		//___________________________________________________
		// deepjs cross module definitions
		//___________________________________________________


		deep.context = function(name, value) {
			if (!name)
				return deep.Promise.context;
			if (!value)
				return deep.Promise.context[name];
			return deep.Promise.context[name] = value;
		};
		deep.contextualise = function(arg) {
			return new deep.Promise().contextualise(arg).fromContext().resolve();
		};



		/**
		 * equal test strict equality on success value against provided object
		 * If equal, forward success (it's transparent).
		 * If not equal, inject 412 error with report
		 */
		nodes.equal = function(s, needed) {
			var tmp = s;
			if (tmp && (tmp._deep_query_node_ || tmp._deep_array_))
				tmp = nodes.val(s);
			if (deepEqual(tmp, needed))
				return s;
			return deep.errors.PreconditionFail("deep.equal failed ! ", {
				equal: false,
				value: tmp,
				needed: needed
			});
		};

		nodesChainedApi.equal = function(obj) {
			return this.done(function(s) {
				return nodes.equal(s, needed);
			});
		};

		deep.Promise._up({
			equal: nodesChainedApi.equal,
			modes: function(arg, arg2) {
				var self = this;
				return this.done(function(s, e) {
					if (!self._contextualised)
						deep.contextualisePromise(self);
					self._context.modes = self._context.modes || {};
					modes.setModesIn(self._context.modes, arg, arg2);
					return s;
				});
			}
		});

		deep.modes = function(arg, arg2) {
			return new deep.Promise().resolve(undefined).modes(arg, arg2);
		};

		// ____________________ SHEETS

		ocm.applySheet = deep.sheet;
		Classes.applySheet = deep.sheet;

		sheeter.methods = {
			up: function(catched, toApply, options) {
				return protocol.getAll(toApply)
					.done(function(objects) {
						return nodes.up.apply(nodes, [catched].concat(objects));
					});
			},
			bottom: function(catched, toApply, options) {
				return protocol.getAll(toApply)
					.done(function(objects) {
						return nodes.bottom.apply(nodes, [catched].concat(objects));
					});
			}
		};


		//______________________ VALIDATOR
		deep.Validator = Validator;
		deep.validate = Validator.validate;
		deep.partialValidation = Validator.partialValidation;

		return deep;
	});

