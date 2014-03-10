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

define(["require", "./utils"],function(require, utils)
{
	/**
	 * the collider interface
	 * @namespace deep
	 * @chainable true
	 * @class collider
	 * @static
	 */

		var collider = {};

		var Collider = collider.Collider = function(fn){
			this._collision = fn;
			this._deep_collider_ = true;
			this._deep_compiler_ = true;
		};

		Collider.prototype = {
			wrapIn : function(fn){
				var coll = this._collision;
				return function(input){
					return fn(coll(input));
				};
			},
			clone : function (){
				//console.log("this on colliders clone ? ", this);
				return utils.copy(this, true);
			},
			up : function(obj){
				if(!obj._deep_collider_)
					return obj;
				this._collision = this.wrapIn(obj._collision);
				return this;
			},
			bottom : function(obj){
				if(!obj._deep_collider_)
					return this._collision(obj);
				this._collision = obj.wrapIn(this._collision);
				return this;
			}
		};

		Collider.add = function(name, fn){
			var handler = function(){
				var args = Array.prototype.slice.apply(arguments);
				var h = function(input){
					args.unshift(input);
					return fn.apply({}, args);
				};
				if(!this._deep_collider_)
					return new Collider(h);
				this._collision = this.wrapIn(h);
				return this;
			};
			collider[name] = Collider.prototype[name] = handler;
			return Collider;
		};

		/**
		 * replace
		 *
		 * @example 
		 * var a = {
		 * test:deep.collider.replace(12)
		 * };
		 * 
		 */
		Collider.add("replace", function(input, by){ return by; });


		/**
		 * replace
		 *
		 * @example 
		 * var a = {
		 * test:deep.collider.copyTo("my.path" ,myObject)
		 * };
		 * 
		 */
		Collider.add("copyTo", function(input, path, object){ 
			utils.setValueByPath(object, path, input);
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
		Collider.add("log", function(input, title){
			console.log("collider.log : ", title, ":", input);
			return input;
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
		Collider.add("validate", function(input, schema){
			var report = validate(input, schema);
			if(!report.valid)
				throw errors.PreconditionFail(report);
			return input;
		});


		/**
		 * array.insertAt
		 *
		 * @example 
		 * var a = {
		 * test:deep.collider["array.insertAt"]( what, index )
		 * };
		 * 
		 */
		Collider.add("array.insertAt", function(input, what, index){
			if(!(input instanceof Array))
				throw errors.Internal("colliders.array.insertAt couldn't be applied : target is not an array.");
			var args = [index, 0].concat(what);
			input.splice.apply(input, args);
			return input;
		});

		/**
		 * array.removeAt
		 *
		 * @example 
		 * var a = {
		 * test:deep.collider["array.removeAt"]( index )
		 * };
		 * 
		 */
		Collider.add("array.removeAt", function(input, index){
			if(!(input instanceof Array))
				throw errors.Internal("colliders.array.insertAt couldn't be applied : target is not an array.");
			input.splice(index);
			return input;
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
		Collider.add("transform", function(input, fn){
			return fn(input);
		});

		return collider;
});