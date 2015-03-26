/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
 
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "../utils"], function(require, utils){


	// ______________________________________ OBJECTS/ARRAY RELATED


	utils.removeInside = function(obj, toRemove) {
		if (!toRemove.forEach)
			toRemove = [toRemove];
		var tr = {}, item = null,
			key = null;
		for (var i = 0, len = toRemove.length; i < len; ++i) {
			item = toRemove[i];
			if (typeof item === 'object')
				key = item.id;
			else
				key = item;
			tr[key] = item;
		}
		if (obj.forEach) {
			for (var i = 0, len = obj.length; i < len; ++i) {
				item = obj[i];
				if (typeof item === 'object')
					key = item.id;
				else
					key = item;
				if (tr[key])
					obj.splice(i, 1);
			}
		} else {
			for (var i in obj) {
				item = obj[i];
				if (typeof item === 'object')
					key = item.id;
				else
					key = i;
				if (tr[key])
					delete obj[i];
			}
		}
		return obj;
	};

	


	//_________________________________________________________________ OBJECTS/ARRAY RELATED

	utils.isFunction = function(obj) {
	  return !!(obj && obj.constructor && obj.call && obj.apply);
	};


	/**
	 * clone a function and copy it's proto or vars.
	 * @method cloneFunction
	 * @static
	 * @param  {Function} fct  the function to copy
	 * @return {Function} the cloned function
	 */
	utils.cloneFunction = function(fct) {
		//console.log("cloneFunction : fct.decorator = ", fct.decorator)
		var clone = function() {
			return fct.apply(this, arguments);
		};
		clone.prototype = fct.prototype;
		for (var property in fct)
			if (fct.hasOwnProperty(property))
				clone[property] = utils.copy(fct[property]);
		return clone;
	};

	/**
	 * copy any object/value/array deeply. (e.g. any array will be copied AND also its items).
	 * Any function encountered will not be cloned (simply use same ref). (just deep decorators will be)
	 * @method copy
	 * @static
	 * @param  {Object|Primitive} obj
	 * @return {Object|Primitive} the copied value/object/array
	 */
	utils.copy = function copy(obj, noClone, excludeGrounds) {
		//console.log("utils.copy : ", obj, noClone, excludeGrounds)
		if (!obj)
			return obj;
		var res = null;
		if (!noClone && typeof obj._clone === 'function')
			return obj._clone();
		if (obj.forEach) {
			if (obj._deep_shared_)
				return obj;
			res = [];
			var len = obj.length;
			for (var i = 0; i < len; ++i) {
				var e = obj[i];
				if (typeof e === 'object')
					res.push(copy(e));
				else
					res.push(e);
			}
		} else if (typeof obj === 'object') {
			if (obj._deep_shared_)
				return obj;
			if (obj instanceof RegExp)
				return obj;
			if (obj instanceof Date)
				return new Date(obj.valueOf());
			res = {};
			for (var j in obj) {
				if(j == "_backgrounds" || j == "_foregrounds" || j == "_transformations")
					if(excludeGrounds)
						continue;
					else // clone ground's array and skip recursive call
					{
						res[j] = obj[j].slice();
						continue;
					}
				var v = obj[j];
				//if(obj.hasOwnProperty(j))
				if (typeof v === 'object')
					res[j] = copy(v);
				else
					res[j] = v;
			}
		} 
		else if (typeof obj === 'function')
		{
			if(obj._deep_composer_)
				res = utils.cloneFunction(obj);
			else
				res = obj; //utils.cloneFunction(obj);
		}
		else
			res = obj;
		return res;
	};

	utils.simpleCopy = utils.shallowCopy = function(obj) {
		if (obj && obj.forEach)
			return obj.slice();
		if (obj && typeof obj === 'object') {
			if (obj instanceof RegExp)
				return obj;
			if (obj instanceof Date)
				return new Date(obj.valueOf());
			var res = {};
			for (var i in obj) {
				//if(obj.hasOwnProperty(i))
				res[i] = obj[i];
			}
			return res;
		}
		return obj;
	};

	utils.getObjectClass = function(obj) {
		if (obj && obj.constructor && obj.constructor.toString) {
			var arr = obj.constructor.toString().match(/function\s*(\w+)/);
			if (arr && arr.length == 2)
				return arr[1];
		}
		return undefined;
	};

	utils.getJSPrimitiveType = function getJSPrimitiveType(obj) {
		if (obj && obj.forEach)
			return "array";
		return typeof obj;
	};
		
	return utils;
});