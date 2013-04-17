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

	var Collider = function(){}
	Collider.prototype = {}
	return {
		Collider:Collider,
		wrap:function(wrapper, wrapped){
			var a = function(value, parent, key){
				return wrapper(wrapped(value, parent, key), parent, key);
			};
			a._deep_collider = true;
			return a;
		},
		copyTo:function(object, path){
			var a = function(value, parent, key){
				utils.setValueByPath(object, path, value);
				return value;
			};
			a._deep_collider = true;
			return a;
		},
		around:function(handler){
			handler._deep_collider = true;
			return handler;
		},
		replace:function(newValue){
			var a = function(value){
				return newValue;
			};
			a._deep_collider = true;
			return a;
		},
		log:function(){
			//console.log("add layer composition : log")
			var a =function(value){
				console.log("deep.collider : log : ",value);
				return value;
			};
			a._deep_collider = true;
			return  a;
		},
		validate:function(schema){
			var a = function(value){
				if(!validator.isValid(value, schema))
					throw new ValidationError(validator.report);
				return value;
			}
			a._deep_collider = true;
			return a;
		},
		remove:function(){
			var a = function(value, parent, key)
			{
				delete parent[key];
				return undefined;
			}
			a._deep_colliderRemove = true;
			return a;
		},
		assert:{
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
		array:{
			reverse:function(){
				return function(value){
					this._deep_collider = true;
					if(typeof value.push === 'function')
						return value.reverse();
					return value;
				}
			},
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