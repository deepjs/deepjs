/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(function(require){
	var collider = require("deep/deep-collider");
	var compose = require("deep/deep-compose");
	var utils = {};
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
	}

	utils.copyArray = function(arr){
		if(!arr)
			return [];
		var res = [];
		arr.forEach(function(a){
			res.push(a);
		})
		return res;
	}

	utils.cloneFunction = function(fct)
	{
	    var clone = function() {
	        return fct.apply(this, arguments);
	    };
	    clone.prototype = fct.prototype;
	    for (property in fct) 
	        if (fct.hasOwnProperty(property)) 
	            clone[property] = utils.copy(fct[property]);
	    return clone;
	}

	utils.copy = function copy(obj){
		var res = null;
		if(obj instanceof Array)
		{
			res = [];
			obj.forEach(function(e){
				res.push(copy(e));
			})
		}
		else if(typeof obj === 'object')
		{
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
			res = utils.cloneFunction(obj);
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

	utils.setValueByPath = function setValueByPath(object, path, value, pathDelimiter)
	{
		var parts = path.split(pathDelimiter||".");
		if(pathDelimiter == "/" && parts[0] == "")
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
		var parts = path.split(pathDelimiter||".");
		if(pathDelimiter == "/" && parts[0] == "")
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
		var parts = path.split(pathDelimiter||".");
		if(pathDelimiter == "/" && parts[0] == "")
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
		var parts = path.split(pathDelimiter||".");
		if(pathDelimiter == "/" && parts[0] == "")
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
			map[val] = a;
		})
		arr2.forEach(function(a){
			var val = null;
			if(uniqueOn)
				val = utils.retrieveValueByPath(a,uniqueOn);
			else if(a.uri)
				val = a.uri;
			if(val == null || val == undefined)
				val = String(a);
			if(!map[val])
				arr.push(a);
		})
		return arr;
	}

	utils.inArray = function inArray(what, inArr)
	{
		//console.log("inArray : what : "+JSON.stringify(what) + " - in : "+JSON.stringify(inArr));
		if(!inArr)
			return false;
		var test = {};
		inArr.forEach(function(e){
			test[e] = true;
		})
		if(what.forEach)
		{	
			var okCount = 0;
			what.forEach(function(e){
				if(test[e])
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

	utils.stripFirstSlash = function(text)
	{
		if(text.substring(0,1) == "/")
			return text.substring(1);
		return text;
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

	var retrieveFullSchemaByPath = utils.retrieveFullSchemaByPath =  function retrieveFullSchemaByPath(schema, path, delimitter)
	{
		var parts = path.split(delimitter || ".");
		// console.log("retrieveSchemaByPath : ", path, schema);

		var tmp = schema;
		while(parts.length>1)
		{
			var part = parts.shift();
			if(!tmp.properties || !tmp.properties[part])
				return null;
			tmp = tmp.properties[part];
		}

		var lastPart = parts.shift();
		var res= [];
		if(tmp.properties && tmp.properties[lastPart])
			res.push(tmp.properties[lastPart]);
		//console.log("after test last part : ", res);
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
		
		var finalSchema = {};
		if(res.length > 1)
			res.forEach(function(e){
				finalSchema = utils.up(e, finalSchema);
			});
		else if(res.length == 1)
			finalSchema = res[0];
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
		if(src === null)
			return target;
		if(typeof target === 'undefined' || target === null)
		{
			target = utils.copy(src);
			if(parent && key)
				parent[key] = target;
			return target;
		}	
		//console.log("deepUp : objects not nulls.")
		var result= null;
		var srcType = utils.getJSPrimitiveType(src);
		var targetType = utils.getJSPrimitiveType(target);
		//console.log("deepUp : objects types : ", srcType, targetType);
		if (srcType === 'function')
		{	
			if (targetType === 'function')
			{
				if(src.decorator && src.decorator instanceof compose.Decorator)
				{
					//console.log("deepUp: src is decorator : ",src)
					result = compose.up(target, src);
				}	
				else if(src.collider && src.collider instanceof collider.Collider)
				{
					//console.log("deepUp: src is collider : ",src)
					if(target.collider && target.collider instanceof collider.Collider)
						result = collider.wrap(source,target);
					else
						result = source(target, parent, key);
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
					throw new Error("deep.compose need to be applied on function ! ");
				if(src.collider && src.collider instanceof collider.Collider)
					result = source(target, parent, key);
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
				for(var i in src)
				{
					if(i == "_deep_entry")
						continue;
					var sch = {};
					if(schema)
						sch = retrieveFullSchemaByPath(schema, i);
					target[i] = utils.up(src[i], target[i], sch, target, i);
				}
				return target;
				break;
			default : 
				return src;
		}
	}

	var bottom = function (src, target, schema, parent, key) 
	{
		// console.log("utils.bottom : objects ", src, target)

		if(src === null)
			return target;
		if(typeof target === 'undefined' || target === null)
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
				else if(target.collider && target.collider instanceof collider.Collider)
				{
					//console.log("utils.bottom: src is collider : ",src)
					if(target.collider && target.collider instanceof collider.Collider)
						result = collider.wrap(target, source);
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
				if(target.collider && target.collider instanceof collider.Collider)
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
				//console.log("array fusion bottom rsult : ", result, parent, key, parent[key])
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

	return utils;	
})
