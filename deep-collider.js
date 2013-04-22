/**
 *
 *
 *
 * layer-data-composition : inspired by Compose, it offer a large set of tools that permit to manipulate values 
 * from within the object used as layer when applied together. 
 * As Compose merge two prototype by wrapping collided functions by appropriate Compose method (after, before, around),
 * layer-compose do the same by applying a function when values are collided with that function.
 *
 * If you know photoshop : it's an equivalent of the fusion modes between two layers (or part of two layers). 
 *
 * 
 * @module deep
 * @submodule deep-collider
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if(typeof define !== 'function')
	var define = require('amdefine')(module);

/*

 * TODO : implement almost every operations, few are done. Will be made on-need.

Remarque : 
Almost totaly unusable for now... ;)
But you could do it for us...;)

 */

define(function(require)
{
	/**
	 * the collider interface
	 * @namespace deep
	 * @class collider
	 * @static
	 */

	return {
		/**
		 * wrap wrapped function with wrapper function. wrapped will receive ollided value as argument.
		 * @method wrap
	 	 * @static
		 * @param  {Function} wrapper
		 * @param  {Function} wrapped
		 * @return {Function} the wrapper
		 */
		wrap:function(wrapper, wrapped){
			var a = function(value, parent, key){
				return wrapper(wrapped(value, parent, key), parent, key);
			};
			a._deep_collider = true;
			return a;
		},
		/**
		 * copy collided value somewhere
		 * @method copyTo
	 	 * @static
		 * @param  {Object} object where copy value
		 * @param  {String} path a dot delimitted path in object where copy value
		 * @return {Function} the collider
		 */
		copyTo:function(object, path){
			var a = function(value, parent, key){
				utils.setValueByPath(object, path, value);
				return value;
			};
			a._deep_collider = true;
			return a;
		},
		/**
		 * simply wrap collided value by wrapper function
		 * @method around
	 	 * @static
		 * @param  {Function} wrapper
		 * @return {Function} the collider
		 */
		around:function(wrapper){
			var a = function (value, parent, key) {
				return wrapper(value);
			}
			a._deep_collider = true;
			return a;
		},
		/**
		 * replace collided value by new one
		 * @method replace
	 	 * @static
		 * @param  {Object} newValue the value to assign
		 * @return {Function} the collider
		 */
		replace:function(newValue){
			var a = function(value, parent, key){
				parent[key] = newValue;
				return newValue;
			};
			a._deep_collider = true;
			return a;
		},

		/**
		 * log collided value
		 * @method log
	 	 * @static
		 * @return {Function} the collider
		 */
		log:function(){
			//console.log("add layer composition : log")
			var a =function(value){
				console.log("deep.collider : log : ",value);
				return value;
			};
			a._deep_collider = true;
			return  a;
		},
		/**
		 * validate collided value with provided schema.
		 * throw an error with report if not valid.
		 * @method validate
	 	 * @static
		 * @param  {Object} schema
		 * @return {Function} the collider
		 */
		validate:function(schema){
			var a = function(value){
				var report = validator.validate(value, schema);
				if(!report.valid)
					throw new Error(report);
				return value;
			}
			a._deep_collider = true;
			return a;
		},
		/**
		 * remove collided value
	 	 * @static
		 * @method remove
		 * @return {Function} the collider
		 */
		remove:function(){
			var a = function(value, parent, key)
			{
				delete parent[key];
				return undefined;
			}
			a._deep_colliderRemove = true;
			return a;
		},
		/**
		 * @for collider
		 * @class deep.collider.assert
		 */
		assert:{
			/**
			 * assert is true on collided value. 
			 * @method isTrue
	 		 * @static
			 * @return {Function} the collider
			 */
			isTrue:function(){
				return function(value){
					console.assert(value === true);
					return value;
				}
				a._deep_collider = true;
				return a;
			},
			isFalse:function(){
				var a = function(value){
					console.assert(value === false);
					return value;
				}
				a._deep_collider = true;
				return a;
			},
			/**
			 * test equality (deep-equal) with collided value
			 * @param  {Object} equalTo the object to test
	 		 * @static
			 * @return {Function} te collider
			 */
			equal:function(equalTo){
				var a = function(value){
					return value == equalTo;
				}
				a._deep_collider = true;
				return a;
			},
			notEqual:function(notEqualTo){
				var a = function(value){
					return value != notEqualTo;
				}
				a._deep_collider = true;
				return a;
			},
			isNumber:function(){
				var a = function(value){
					return !isNaN(value) && isFinite(value);
				}
				a._deep_collider = true;
				return a;
			}
		},
		/**
		 * @for collider
		 * @class deep.collider.array
		 */
		array:{
			/**
			 * reverse collided array
		 	* @method reverse
		 	* @static
			 * @return {Function} the collider
			 */
			reverse:function(){
				var a = function(value){
					if(typeof value.reverse === 'function')
						return value.reverse();
					return value;
				}
				a._deep_collider = true;
				return a;
			},
			/**
			 * remove value in array
		 	* @static
		 	 * @method remove
			 * @return {Function} the collider
			 */
			remove:function(what){
				var a = function(value, parent, key){
					if(value && value.forEach)
						for(var i = 0; i < value.length; i++)
						{
							if(value[i] == what)
							{
								value = value.slice(i,i+1);
								break;
							}
						}
					parent[key] = value;
				}
				a._deep_collider = true;
				return a;
			}
		},
		string:{
		},
		number:{
		},
		/**
		 * @for collider
		 * @class deep.collider.object
		 */
		object:{
			merge:function merge(newObject, overwrite, schema){
				var a = function(oldObject){
					return deepCopy(newObject, oldObject, overwrite, schema);
				}
				a._deep_collider = true;
				return  a;
			},
			replace:function(newObject){
				var a = function(){
					return newObject;
				}
				a._deep_collider = true;
				return  a;
			},
			appendProperty:function(propertyName, propertyValue){
				var a = function(value, parent, key)
				{
					value[propertyName] = propertyValue;
					return value;
				}
				a._deep_collider = true;
				return a;
			}
		},
		"boolean":{
		},
		"func":{
			
		}
	}
	
});