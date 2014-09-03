/**
 * layer-data-composition : inspired by Compose, it offer a set of tools that permit to merge values when layer's are collided.
 *
 * As Compose merge two functions by wrapping them by appropriate Compose method (after, before, around),
 * layer-compose do the same by fireing a paticular merger when values are collided.
 *
 * If you know photoshop : it's an equivalent of the fusion modes between two layers (or pixel).
 *
 *
 * @module deep
 * @submodule deep-collider
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
/*
 * TODO : implement almost every operations, few are done. Will be made on-need.
 *
 *
 * - add asynch collision (up, bottom) mode
 *
 * - ifCollision : don't keep collider if no collision
 * - dontKeep : do not keep collider (it will only be used to fire something as a test)
 */

define(["require", "./utils", "./utils/query", "./compiler", "./errors"], function(require, utils, queryUtils, compiler, errors) {
	/**
	 * the collider interface
	 * @namespace deep
	 * @chainable true
	 * @class collider
	 * @static
	 */

	var collider = {};

	var Collider = collider.Collider = function(fn) {
		this._collision = fn;
		this._deep_collider_ = true;
		this._deep_compiler_ = true;
	};

	Collider.prototype = {
		_wrapIn: function(fn) {
			var coll = this._collision;
			return function(input) {
				return fn(coll(input));
			};
		},
		/*_wrapIn: function(fn) {
			var coll = this._collision;
			return function(input) {
				if(input && input.then)
					return deep.when(input).done(coll).done(fn);
				var r = coll(input);
				if(r && r.then)
					return deep.when(r).done(fn);
				return fn(r);
			};
		},*/
		_clone: function() {
			//console.log("this on colliders clone ? ", this);
			return utils.copy(this, true);
		},
		_up: function(obj) {
			if (!obj._deep_collider_)
				return obj;
			this._collision = this._wrapIn(obj._collision);
			return this;
		},
		_bottom: function(obj) {
			if (!obj._deep_collider_)
				return this._collision(obj);
			this._collision = obj._wrapIn(this._collision);
			return this;
		}
	};

	/**
	 * Add new collider method
	 * @param {String}   name the method name
	 * @param {Function} fn   the method
	 */
	Collider.add = function(name, fn) {
		var handler = function() {
			var args = Array.prototype.slice.apply(arguments);
			var h = function(input) {
				args.unshift(input);
				return fn.apply({}, args);
			};
			if (!this._deep_collider_)
				return new Collider(h);
			this._collision = this._wrapIn(h);
			return this;
		};
		collider[name] = Collider.prototype[name] = handler;
		return Collider;
	};

	/**
	 * bottom
	 *
	 * @example
	 * var a = {
	 * test:deep.collider.bottom({})
	 * };
	 *
	 */
	Collider.add("bottom", function() {
		var len = arguments.length - 1, base = arguments[0];
		for (; len > 0; --len)
			base = compiler.abottom(arguments[len], base);
		return base;
	});
		/**
	 * up
	 *
	 * @example
	 * var a = {
	 * test:deep.collider.up({})
	 * };
	 *
	 */
	Collider.add("up", function() {
		var len = arguments.length, base = arguments[0];
		for (var count = 1; count < len; ++count)
			base = compiler.aup(arguments[count], base);
		return base;
	});
		/**
	 * replace
	 *
	 * @example
	 * var a = {
	 * test:deep.collider.replace(12)
	 * };
	 *
	 */
	Collider.add("replace", function(input, by, query) {
		if(query)
		{
			utils.replace(input, query, by);
			return input;
		}
		return by;
	});
	/**
	 * remove
	 *
	 * @example
	 * var a = {
	 * 	test:deep.collider.remove("./myKey")
	 * };
	 *
	 */
	Collider.add("remove", function(input, query) {
		// console.log("Collider.remove : ", input, query);
		if(!query)
			return { _deep_remover_:true };
		utils.remove(input, query);
		return input;
	});


	/**
	 * log
	 *
	 * @example
	 * var a = {
	 * 	test:deep.collider.log("my title")
	 * };
	 *
	 */
	Collider.add("log", function(input, title) {
		deep.log("collider.log : ", title, ":", input);
		return input;
	});
		/**
	 * upperCase
	 *
	 * @example
	 * var a = {
	 * test:deep.collider.up({})
	 * };
	 *
	 */
	Collider.add("changeCase", function(input, strcase) {
		switch(strcase)
		{
			case "lower" :  return input.toLowerCase();
			case "upper" :  return input.toUpperCase();
			case "title" :  return utils.titleCase(input);
			case "camel" :  return utils.camelCase(input);
			default : return input;
		}
	});

	/**
	 * validate
	 *
	 * @example
	 * var a = {
	 * test:deep.collider.validate( mySchema )
	 * };
	 *
	 */
	Collider.add("validate", function(input, schema) {
		var report = deep.validate(input, schema);
		if (!report.valid)
			throw errors.PreconditionFail(report);
		return input;
	});

	/**
	 * equal
	 *
	 * @example
	 * var a = {
	 * test:deep.collider.equal( neededValue )
	 * };
	 *
	 */
	Collider.add("equal", function(input, needed) {
		var ok = utils.deepEqual(input, needed);
		if (!ok)
			throw errors.PreconditionFail({ valid:false, value:input, needed:needed });
		return input;
	});

	/**
	 * array.insertAt
	 *
	 * @example
	 * var a = {
	 * test:deep.collider.insertAt( what, index )
	 * };
	 *
	 */
	Collider.add("insertAt", function(input, what, index) {
		if (!Array.isArray(input))
			throw errors.Internal("colliders.insertAt couldn't be applied : target is not an array.");
		var args = [index, 0].concat(what);
		input.splice.apply(input, args);
		return input;
	});

	/**
	 * array.removeAt
	 *
	 * @example
	 * var a = {
	 * test:deep.collider.removeAt( index )
	 * };
	 *
	 */
	Collider.add("removeAt", function(input, index, howMuch) {
		if (!Array.isArray(input))
			throw errors.Internal("collider.removeAt couldn't be applied : target is not an array.");
		if(!howMuch && howMuch !== 0)
			howMuch = 1;
		input.splice(index, howMuch);
		return input;
	});

	/**
	 * array.push
	 *
	 * @example
	 * var a = {
	 * 	test:deep.collider.push( value )
	 * };
	 *
	 */
	Collider.add("push", function(input, value) {
		if (!Array.isArray(input))
			throw errors.Internal("collider.push couldn't be applied : target is not an array.");
		input.push(value);
		return input;
	});

	/**
	 * array.unshift
	 *
	 * @example
	 * var a = {
	 * 	test:deep.collider.unshift( value )
	 * };
	 *
	 */
	Collider.add("unshift", function(input, value) {
		if (!Array.isArray(input))
			throw errors.Internal("collider.push couldn't be applied : target is not an array.");
		input.unshift(value);
		return input;
	});


	/**
	 * map
	 *
	 * @example
	 * var a = {
	 * 	test:deep.collider.map( function(value){  return value.toUpperCase() } )
	 * };
	 *
	 */
	Collider.add("map", function(input, callback) {
		if (!Array.isArray(input))
			return callback(input);
		return input.map(callback);
	});

	/**
	 * transform
	 *
	 * @example
	 * var a = {
	 * test:deep.collider.transform( function(input){ return input+2; } )
	 * };
	 *
	 */
	Collider.add("transform", function(input, fn) {
		return fn(input);
	});

	return collider;
});