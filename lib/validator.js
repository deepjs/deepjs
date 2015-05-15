/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * Adaptator pattern. Just there to make deep-schema optional and more modular.
 */

if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require"], function(require) {

	var Validator = null;

	return {
		set: function(Vali) {
			Validator = Vali;
		},
		validate: function(object, schema) {
			if (!Validator)
				throw new Error("no real schema validator setted. please set on using (deepjs/lib/validator).set");
			return Validator.validate(object, schema);
		},
		partialValidation: function(object, fields, schema) {
			if (!Validator)
				throw new Error("no real schema validator setted. please set on using (deepjs/lib/validator).set");
			return Validator.partialValidation(object, fields, schema);
		}
	}

});