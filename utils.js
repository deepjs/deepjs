/**
 *
 *	a bunch of utilities functions for deep
 * 
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * @module deep
 * @submodule utils
 */
if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(function(require){
	var collider = require("./deep-collider");
	var compose = require("./deep-compose");
	/**
	 * @class utils
	 * @namespace deep
	 */
	var utils = {};

	// _______________________________________ swig related

	/**
	 * swig related : produce swig-macro-import string
	 * @deprecated 
	 * @category swig
	 * @method getMacroImport
	 * @static
	 * @param  {ViewController} controller
	 * @param  {Array} macrosSet
	 * @return {String} the macro import string
	 */
	utils.getMacroImport = function(controller, macrosSet)
	{
		var renderedTemplate = "";
		if(controller.layer && controller.layer.templates)
		{    
			var macros = controller.layer.templates.macros;
			for (var i in macros)
			{
				if(!macros.hasOwnProperty(i) || (macrosSet && ! i in macrosSet))
					continue;
				var  m = macros[i];
				var prefix = "";
				var index = m.indexOf(":");
				if(index > -1)
				{    
					prefix = m.substring(0,index);
					m = m.substring(index+2);
				}
				renderedTemplate += "{% import '" + m + "' as "+i+" %}\n";
			}
		}
		return renderedTemplate;
	}

	// ______________________________________ STRINGS RELATED

	// TODO : need to be asynch and to retrieve values from stores : as app::language
	/**
	 * interpret a string with a context : means fetch in context and replace in string any variable-string-format (e.g. { my.property.in.my.context }) 
	 * founded in string
	 * @example
	 * 		var interpreted = deep.utils.interpret("hello { name }", { name:"john" });
	 *
	 * @example
	 * 		// equivalent of first example
	 * 		var interpreted = deep("hello { name }").interpret({ name:"john" }).val();
	 * 		
	 * @method interpret
	 * @category stringUtils
	 * @static
	 * @param  {String} string the string to interpret
	 * @param  {Object} context the context to inject
	 * @return {String} the interpreted string
	 */
	utils.interpret = function (string, context)
	{
		var count = string.indexOf('{');
		if(count == -1)
			return string;
		var parsed = string.substring(0,count);
		count++;
		var ln = string.length;
		while(count < ln)
		{
			var toAnalyse = "";
			while(count < ln && string[count] != '}')
			{
				if(string[count] != ' ')
					toAnalyse += string[count];
				count++;
			}
			if(string[count] == '}')
			{
				parsed += utils.retrieveValueByPath(context, toAnalyse, ".");
				count++;
			}
			while(count < ln && string[count] != '{')
				parsed += string[count++];
			if(string[count] == '{')
				count++;
		}
		return parsed;
	};


	utils.stripFirstSlash = function(text)
	{
		if(text.substring(0,1) == "/")
			return text.substring(1);
		return text;
	}

	utils.catchParenthesis = function(path)
	{
		if(path[0] != '(')
			return null;
		var count = 1;
		var catched = 1;
		var res = "";
		while(( path[ count ] != ')' || catched > 1) && count < path.length )
		{
			if( path[ count ] == '(' )
				catched++;
			if( path[ count ] == ')' )
				catched--;
			if(path[ count ] == ')' )
			{	
				if(catched > 1)
					res += path[ count++ ]
			}
			else
				res += path[ count++ ]
		}
		count++;
		return { value:res, rest:path.substring(count)};
	}

	function trim_words(theString, numWords, maxChar) {
	    expString = theString.split(/\s+/,numWords);
	    if(expString.length == 1)
	    {
			maxChar = maxChar || 10;
	    	if(expString[0].length > maxChar)
	    		return theString.substring(0,maxChar)
	    	return expString[0];
	    }
	    theNewString=expString.join(" ");
	    if(theNewString.length < theString.length && theNewString[theNewString.length-1] != ".")
			theNewString += "...";
	    return theNewString;
	}

	utils.trimWords = function(string, numWords, maxChar){
		var reg=new RegExp("<[^>]*>", "gi" );
		var desc = string.replace(reg, "");
		desc = trim_words(desc, numWords, maxChar);
		return desc;
	}

	//_________________________________________________________________ OBJECTS/ARRAY RELATED

	/**
	 * make a copy of provided array, but do not copy items. just reproduce an array with same items.
	 * @method copyArray
	 * @static
	 * @param  {Array} arr
	 * @return {Array} the array copy
	 */
	utils.copyArray = function(arr){
		if(!arr || arr.length === 0)
			return [];
		return arr.concat([]);
	};

	/**
	 * clone a function and copy it's proto or vars.
	 * @method cloneFunction
	 * @static
	 * @param  {Function} fct  the function to copy
	 * @return {Function} the cloned function
	 */
	utils.cloneFunction = function(fct)
	{
		//console.log("cloneFunction : fct.decorator = ", fct.decorator)
	    var clone = function() {
	        return fct.apply(this, arguments);
	    };
	    clone.prototype = fct.prototype;
	    for (property in fct) 
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
	utils.copy = function copy(obj){
		var res = null;
		if(obj instanceof Array)
		{
			res = [];
			obj.forEach(function(e){
				res.push(copy(e));
			})
		}
		else if(obj && typeof obj === 'object')
		{
			if(obj instanceof RegExp)
				return obj;
			if(obj instanceof Date)
				return new Date(obj.valueOf());
		
			res = {};
			for(var i in obj)
			{
				if(i == "_deep_entry")
					continue;
				if(obj.hasOwnProperty(i))
					res[i] = copy(obj[i]);
			}
		}
		else if(typeof obj === 'function')
		{
			if(obj.decorator instanceof compose.Decorator)
				res = compose.cloneStart(obj);
			else
				res = obj; //utils.cloneFunction(obj);
		}
		else
			res = obj;
		return res;
	}

	utils.getObjectClass = function(obj) {
	    if (obj && obj.constructor && obj.constructor.toString) {
	        var arr = obj.constructor.toString().match(/function\s*(\w+)/);
	        if (arr && arr.length == 2) 
	            return arr[1];
	    }
	    return undefined;
	}




	utils.setValueByPath = function setValueByPath(object, path, value, pathDelimiter)
	{
		if(path[0] == "/" || path.substring(0,1) == "./")
			pathDelimiter = "/";
		var parts = path.split(pathDelimiter||".");
		if(pathDelimiter == "/" && (parts[0] == "" || parts[0] == "."))
			parts.shift();
		var tmp = object;
		while(parts.length>1)
		{
			var part = parts.shift();
			if(!tmp[part])
				return null;
			tmp = tmp[part];
		}
		return tmp[parts.shift()] = value;
	}

	utils.retrieveValueByPath = function retrieveValueByPath(object, path, pathDelimiter)
	{
		if(path[0] == "/" || path.substring(0,1) == "./")
			pathDelimiter = "/";
		var parts = path.split(pathDelimiter||".");
		if(pathDelimiter == "/" && (parts[0] == "" || parts[0] == "."))
			parts.shift();
		var tmp = object;
		while(parts.length>1)
		{
			var part = parts.shift();
			if(!tmp[part])
				return null;
			tmp = tmp[part];
		}
		if(tmp)
			return tmp[parts.shift()];
		else return null;
	}

	utils.deletePropertyByPath = function deletePropertyByPath(object, path, pathDelimiter)
	{
		if(path[0] == "/" || path.substring(0,1) == "./")
			pathDelimiter = "/";
		var parts = path.split(pathDelimiter||".");
		if(pathDelimiter == "/" && (parts[0] == "" || parts[0] == "."))
			parts.shift();
		var tmp = object;
		while(parts.length>1)
		{
			var part = parts.shift();
			if(!tmp[part])
				return;
			tmp = tmp[part];
		}
		delete tmp[parts.shift()];
	}


	utils.retrieveSchemaByPath = function retrieveSchemaByPath(schema, path, pathDelimiter)
	{
		//console.log("retrieveSchemaByPath : ", schema, path);
		if(path[0] == "/" || path.substring(0,1) == "./")
			pathDelimiter = "/";
		var parts = path.split(pathDelimiter||".");
		if(pathDelimiter == "/" && (parts[0] == "" || parts[0] == "."))
			parts.shift();
		var tmp = schema;
		while(parts.length>1)
		{
			var part = parts.shift();
			if(!tmp.properties || !tmp.properties[part])
				return null;
			tmp = tmp.properties[part];
		}
		if(tmp.properties)
			return tmp.properties[parts.shift()];
		else
			return null;
	}
	/*
		Does not make a deep-copy if collision : just if collid : make unique
	*/
	utils.arrayUnique = function arrayUnique(arr1, uniqueOn){
		if(!arr1.forEach)
			return arr1;
		var map = {}
		var count = 0;
		var arr = [];
		arr1.forEach(function(a){
			var val = null;
			if(uniqueOn)
				val = utils.retrieveValueByPath(a,uniqueOn);
			else if(a.uri)
				val = a.uri;
			if(val == null || val == undefined)
				val = String(a);
			if(typeof map[val] === 'undefined')
			{
				map[val] = true;
				arr.push(a);
			}
		})
		return arr;
	}

	utils.arrayFusion = function arrayFusion(arr1, arr2, uniqueOn){
		var map = {}
		var count = 0;
		var arr = [];
		if(arr1 && arr1.length > 0)
			arr = arr.concat(arr1);
		arr.forEach(function(a){
			var val = null;
			if(uniqueOn)
				val = utils.retrieveValueByPath(a,uniqueOn);
			else if(a.uri)
				val = a.uri;
			if(val == null || val == undefined)
				val = String(a);
			map[val] = true;
		})
		arr2.forEach(function(a){
			var val = null;
			if(uniqueOn)
				val = utils.retrieveValueByPath(a,uniqueOn);
			else if(a.uri)
				val = a.uri;
			if(val == null || val == undefined)
				val = String(a);
			if(typeof map[val] === 'undefined')
				arr.push(a);
		})
		return arr;
	}

	utils.inArray = function inArray(what, inArr)
	{
		//console.log("inArray : what : "+JSON.stringify(what) + " - in : "+JSON.stringify(inArr));
		if(!inArr || !inArr instanceof Array)
			return false;
		var test = {};
		inArr.forEach(function(e){
			test[e] = true;
		})
		if(what.forEach)
		{	
			var okCount = 0;
			what.forEach(function(e){
				if(typeof test[e] !== 'undefined')
					okCount++;
			})
			if(okCount == what.length)
				return true;
			return false;
		}
		else if(test[what])
			return true
		return false;
	}

	utils.getJSPrimitiveType = function (obj)
	{
		if(obj instanceof Array)
			return "array"
		return typeof obj;
	}

	utils.deepEqual = function(a,b, ordered)
	{
		if(ordered == undefined)
			ordered = true;
		if(typeof a !== typeof b)
			return false;
		if(typeof a === 'object')
		{
			if(a == null && a !== b)
				return false;
			if(b == null && a !== b)
				return false;
			var ok = true;
			var tmpA = [];
			var tmpB = [];
			for(var i in b)
			{
				if(i == "_deep_entry")
					continue;
				if(!b.hasOwnProperty(i))
					continue;
				if(typeof a[i] === 'undefined')
					return false;
				ok = ok && utils.deepEqual(a[i], b[i]);
				if(!ok)
					return false;
				tmpB.push(i);
			}
			for(var i in a)
			{
				if(i == "_deep_entry")
					continue;
				if(!a.hasOwnProperty(i))
					continue;
				tmpA.push(i);
			}
			if(tmpA.length != tmpB.length)
				return false;
			if(ordered)
				for(var j = 0; j < tmpB.length; ++j)
					if(tmpB[j] != tmpA[j])
						return false;
		}
		else if(a !== b)
			return false;
		return true;
	}
	//var result = {};

	var retrieveFullSchemaByPath = utils.retrieveFullSchemaByPath =  function (schema, path, delimitter)
	{
		if(path[0] == "/" || path.substring(0,1) == "./")
			delimitter = "/";
		var parts = path.split(delimitter||".");
		if(delimitter == "/" && (parts[0] == "" || parts[0] == "."))
			parts.shift();
		 // console.log("retrieveSchemaByPath : ", parts, schema);
		var tmp = schema;
		while(parts.length>1)
		{
			var part = parts.shift();
			if(part.match(/^[0-9]*$/))
			{
				if(tmp.type == "array")
				{
					tmp = tmp.items || {};
					continue;
				}
			}
			if(!tmp.properties || !tmp.properties[part])
				return null;
			tmp = tmp.properties[part];
		}
		// console.log("after test last part -1 : ", tmp);

		var lastPart = parts.shift();
		var res= [];
		if(lastPart.match(/^[0-9]*$/))
		{
			if(tmp.type == "array")
			{
				tmp = tmp.items || {};
				res.push(tmp)
			}
			// TODO : gestion pattern items
		}
		else
		{
			if(tmp.properties && tmp.properties[lastPart])
				res.push(tmp.properties[lastPart]);
			// console.log("after test last part : ", res);
			if(tmp.patternProperties)
				for(var i in tmp.patternProperties)
					if(new RegExp(i).test(lastPart))
						res.push(tmp.patternProperties[i])

			 // console.log("after test last part pattern props : ", res);

			if(res.length ==0)
				if (tmp.additionalProperties == undefined || tmp.additionalProperties == false)
					return null;
				else
					return tmp.additionalProperties;
		}

		
		var finalSchema = {};
		if(res.length > 1)
			res.forEach(function(e){
				finalSchema = utils.up(e, finalSchema);
			});
		else if(res.length == 1)
			finalSchema = res[0];
		 // console.log("retrieveSchemaByPath : finally : ", path, finalSchema);

		return finalSchema;
	}

	var deepArrayFusion = utils.deepArrayFusion = function deepArrayFusion(arr1, arr2, schema)
	{
		var map = {}
		var count = 0;
		var arr = [];
		var itemsSchema = {};
		var mergeOn = null;
		if(schema)
		{
			if(schema.items)
				itemsSchema = schema.items;
			if(schema.collision && schema.collision.unique)
				mergeOn = (schema.collision.unique === true)?null:schema.collision.unique;
		}	

		if(!mergeOn)
			return arr1.concat(arr2);

		if(arr1 && arr1.length > 0)
			arr = arr.concat(arr1);
		arr.forEach(function(a){
			var val = null;
			if(mergeOn)
				val = utils.retrieveValueByPath(a,mergeOn);
			else if(a.uri)
				val = a.uri;
			else if(a.name)
				val = a.name;
			else if(a.id)
				val = a.id;
			if(val == null || val == undefined)
				val = String(a);
			map[val] = {ref:a, index:count++};
		})
		arr2.forEach(function(a){
			var val = null;
			if(mergeOn)
				val = utils.retrieveValueByPath(a,mergeOn);
			else if(a.uri)
				val = a.uri;
			else if(a.name)
				val = a.name;
			else if(a.id)
				val = a.id;
			if(val == null || val == undefined)
				val = String(a);
			if(!map[val])
				arr.push(a);
			else
				utils.up(map[val].ref, a, true, itemsSchema, arr, map[val].index);
		})
		return arr;
	}

	var up = function (src, target, schema, parent, key) 
	{
		if( typeof src === 'undefined' )
			return target;
		if(src === null)
		{
			if(parent && key)
				parent[key] = null;
			return null;
		}

		
		// console.log("deepUp : objects not nulls.")
		var result = null;
		var srcType = utils.getJSPrimitiveType(src);
		var targetType = utils.getJSPrimitiveType(target);
		//console.log("deepUp : objects types : ", srcType, targetType);
		if (srcType === 'function')
		{	
			if (targetType === 'function')
			{
				if(src.decorator && src.decorator instanceof compose.Decorator)
				{
					if(src.decorator.condition && typeof src.decorator.condition === 'function' && !src.decorator.condition())
						return target;
					//console.log("deepUp: src is decorator : ",src)
					result = compose.up(target, src);
				}	
				else if(src._deep_collider)
				{
					//console.log("deepUp: src is collider : ",src)
					if(target._deep_collider)
						result = collider.wrap(src,target);
					else
						result = src(target, parent, key);
				}
				else
				{
					//console.log("deepUp: src is simple function : ",src)
					result = src;
				}	
			}
			else
			{
				if(src.decorator && src.decorator instanceof compose.Decorator)
				{
					if(typeof target === 'undefined')
					{
						if(src.decorator.ifExists)
						{
							return target;
						}	
						else{
							//src.decorator.createIfNecessary = true;
							result = src;
						}
					}
					else
						throw new Error("deep.compose need to be applied on function ! ");
				}	
				else if(src._deep_collider)
					result = src(target, parent, key);
				else
					result = src;
			}
		}
		if(result)
		{
			//console.log("deepUp : objects functions collison gives : ", result);
			if(parent && key)
				parent[key] = result;
			return result;
		}
		if(typeof target === 'undefined' || target === null)
		{
			target = utils.copy(src);
			if(parent && key)
				parent[key] = target;
			return target;
		}	
		if(srcType !== targetType)
		{
			target = utils.copy(src);
			if(parent && key)
				parent[key] = target;
			return target;
		}
		switch(srcType)
		{
			case 'array' : 
				result = deepArrayFusion(target, src, schema);
				if(parent && key)
					parent[key] = result;
				//console.log("array fusion up rsult : ", JSON.stringify(result), parent, key, JSON.stringify(parent))
				return result;
				break;
			case 'object' :
				if(src instanceof RegExp)
				{
					if(parent && key)
						parent[key] = src;
					return src;
				}	
				if(src instanceof Date)
				{
					target = new Date(src.valueOf());
					if(parent && key)
						parent[key] = target;
					return target;
				}	
				
				for(var i in src)
				{
					if(i == "_deep_entry")
						continue;

					if(src[i] == null)
					{

						target[i] = null;
						continue;
					}

					if(src[i] && src[i]._deep_colliderRemove)
					{
						delete target[i];
						continue;
					}

					var sch = {};
					if(schema)
						sch = retrieveFullSchemaByPath(schema, i);
					target[i] = utils.up(src[i], target[i], sch, target, i);
				}
				return target;
				break;
			default : 
				if(parent && key)
					parent[key] = src;
				return src;
		}
	}

	var bottom = function (src, target, schema, parent, key) 
	{
		 // console.log("utils.bottom : objects ", src, target)

		if(src === null || typeof src === "undefined")
			return target;
		if(target == null)
			return target;
		if(typeof target === 'undefined')
		{
			target = utils.copy(src);
			if(parent && key)
				parent[key] = target;
			return target;
		}	
		//console.log("utils.bottom : objects not nulls.")
		var result= null;
		var srcType = utils.getJSPrimitiveType(src);
		var targetType = utils.getJSPrimitiveType(target);
		// console.log("utils.bottom : objects types : ", srcType, targetType);
		if ( targetType === 'function')
		{	
			if ( srcType === 'function')
			{
				if(target.decorator && target.decorator instanceof compose.Decorator)
				{
					// console.log("utils.bottom: target is decorator : ",target)
					result = compose.bottom(src, target); 

				}	

				else if(target._deep_collider)
				{
					//console.log("utils.bottom: src is collider : ",src)
					if(src._deep_collider)
						result = collider.wrap(target, src);
					else
						result = target(src, parent, key);
				}
				else
				{
					//console.log("utils.bottom: src is simple function : ",src)
					result = target;
				}	
			}
			else
			{
				if(target.decorator && target.decorator instanceof compose.Decorator)
					throw new Error("deep.compose need to be applied on function ! ");
				if(target._deep_collider)
					result = target(src, parent, key);
				else
					result = target;
			}
		}
		if(result)
		{
			// console.log("deep.bottom : objects functions collison gives : ", result);
			if(parent && key)
				parent[key] = result;
			return result;
		}
		if(srcType !== targetType)
		{
			return target;
		}
		switch(srcType)
		{
			case 'array' : 
				result = deepArrayFusion(src, target, schema);
				if(parent && key)
					parent[key] = result;
				console.log("array fusion bottom rsult : ", result, parent, key, parent[key])
				return result;
				break;
			case 'object' :
				// console.log("deep.bottom : apply objects together")
				var oldProps = {};
				for(var i in target)
				{
					if(i == "_deep_entry")
						continue;
					oldProps[i] = target[i];
					delete target[i];
				}	
				for(var i in src)
				{
					if(i == "_deep_entry")
						continue;
					target[i] = utils.copy(src[i]);
				}	

				for(var i in oldProps)
				{
					if(i == "_deep_entry")
						continue;
					if(oldProps[i] == null)
					{
						target[i] = null;
						continue;
					}
					if(oldProps[i] && oldProps[i]._deep_colliderRemove)
					{
						delete target[i];
						continue;
					}
					var sch = {};
					if(schema)
						sch = retrieveFullSchemaByPath(schema, i);
					target[i] = utils.up(oldProps[i], target[i], sch, target, i);
				}
				return target;
				break;
			default : 
				return target;
		}
	}

	var deepCopy = utils.deepCopy = function deepCopy(source, target, overwrite, schema, parent, key)
	{
		overwrite = (overwrite != null && overwrite != undefined)?overwrite:true;
	//	console.log("deep-copy : ",source, " in ", target, " - ow : ", overwrite, " - parent ", parent, " - key : ", key)
		if(overwrite)
			return utils.up(source, target, schema, parent, key);
		return utils.bottom(source, target, schema, parent, key);
	}
	utils.up = up;
	utils.bottom = bottom;

	//___________________________________________ RANGE RELATED

	utils.createRangeObject = function (start, end, total) {
		var res = {
			total:total,
			start:0,
			end:0,
			hasNext:false,
			hasPrevious:false,
			next:function (width) 
			{
				if(!this.hasNext)
					return this;
				this.start += width;
				this.end = this.start+(width-1);
				return  this.update(this.start, this.end);
			},
			previous:function (width) 
			{
				if(!this.hasPrevious)
					return this;
				this.start -= width;
				this.end = this.start+(width-1);
				return this.update(this.start, this.end);
			},
			update:function (start, end, total) 
			{
				this.total = total || this.total || 0;
				if(this.total == 0)
				{
					this.start = this.end = 0
					return this;
				}
				this.start = Math.max(Math.min(this.total-1,start), 0);
				this.end = Math.max(Math.min(end, this.total-1),0);
				this.hasNext = (this.end < (this.total-1));
				this.hasPrevious = (this.start > 0);
				//console.log("update range  : res : ",this);
				return this;
			}
		};
		res.update(start,end,total)
		return res;
	}

	//_________________________________________________ HTTP RELATED

	utils.parseJson = function (body) {
		var b = "";
		if(body.forEach)
			body.forEach(function (bd) {
				b += bd.toString();
			});
		else
			b = body.toString();
		var res = JSON.parse(b);
		if (typeof res === 'string')
			return JSON.parse(b);
		return b;
	}

	utils.parseBody = function (body, headers) 
	{
		if(typeof body === 'undefined' || body == null)
			return null;
		var contentType = headers["content-type"] || headers["Content-Type"] || "application/json";
		contentType = contentType.split(";")[0];
		switch(contentType)
		{
			case "application/json-rpc" : 
				return utils.parseJson(body);
				break;	

			case "application/json" : 
				return utils.parseJson(body);
				break;	

			case "application/javascript" :   // TODO : should be parsed by json-extended parser
				return utils.parseJson(body);
				break;	
			default :
				return body;
		}
	}

	return utils;	
})
