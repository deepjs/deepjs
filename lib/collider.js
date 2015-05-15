/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */

if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}

define(["require", "../deep", "deep-compiler/lib/collider"], function(require, deep, collider) {
	deep.collider = collider;
	/**
	 * replace
	 *
	 * @example
	 * var a = {
	 * test:deep.collider.replace(12)
	 * };
	 *
	 */
	collider.Collider.add("replace", function(input, by, query) {
		if (query) {
			deep.Querier.replace(input, query, by);
			return input;
		}
		return by;
	});

	collider.Collider.add("remove", function(input, query) {
		// console.log("Collider.remove : ", input, query);
		if (!query)
			return {
				_deep_remover_: true
			};
		deep.Querier.remove(input, query);
		return input;
	});

	collider.Collider.add("log", function(input, title) {
		deep.log("collider.log : ", title, ":", input);
		return input;
	});

	collider.Collider.add("validate", function(input, schema) {
		var report = deep.validate(input, schema);
		if (!report.valid)
			throw errors.PreconditionFail(report);
		return input;
	});

	collider.Collider.add("equal", function(input, needed) {
		var ok = deep.utils.deepEqual(input, needed);
		if (!ok)
			throw errors.PreconditionFail({
				valid: false,
				value: input,
				needed: needed
			});
		return input;
	});

	return collider;
});