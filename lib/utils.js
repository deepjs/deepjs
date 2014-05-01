/**
 *
 *	a bunch of utilities functions for deep
 *
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * @module deep
 * @submodule utils
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(function(require){

	/**
	 * @class utils
	 * @namespace deep
	 */
	var utils = {};

	utils.rethrow = function (error) {
		//console.log("ksss")
		throw error;
	};
	utils.arrayInsert = function(array, index) {
		array.splice.apply(array, [index, 0].concat(
			Array.prototype.slice.call(arguments, 1)));
		return array;
	};
    utils.Hash = function(string){
        var hash = 0;
        if (string.length == 0) 
            return hash;
        for (i = 0; i < string.length; i++) {
            char = string.charCodeAt(i);
            hash = ((hash<<5)-hash)+char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    };
	// ______________________________________ STRINGS RELATED

	/**
	 * interpret a string with a context : means fetch in context and replace in string any variable-string-format (e.g. { my.property.in.my.context })
	 * founded in string
	 * @example
	 *		var interpreted = deep.utils.interpret("hello { name }", { name:"john" });
	 *
	 * @example
	 *		// equivalent of first example
	 *		var interpreted = deep("hello { name }").interpret({ name:"john" }).val();
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
			var terms = [];
			var cur = string[count];
			var toAnalyse = "";
			while(count < ln && cur != '}' && cur != '|')
			{
				if(cur == "+")
				{
					terms.push(toAnalyse);
					toAnalyse = "";
				}
				else if(cur == "'")
				{
					var end = string.indexOf("'", count+1);
					toAnalyse = string.substring(count, end);
					count = end;
				}
				else if(cur != ' ')
					toAnalyse += cur;
				cur = string[++count];
			}
			terms.push(toAnalyse);
			var isOr = (string[count] == '|');
			if(string[count] == '}' || isOr)
			{
				var val = null;
				for(var i = 0; i < terms.length; ++i)
				{
					toAnalyse = terms[i];
					if(toAnalyse[0] == "'")
					{
						if(i === 0)
							val = toAnalyse.substring(1);
						else
							val += toAnalyse.substring(1);
					}
					else
					{
						if(i === 0)
							val = utils.fromPath(context, toAnalyse, ".");
						else
							val += utils.fromPath(context, toAnalyse, ".");
						if(val && val.forEach)
							val = val.join(",");
					}
					if(!val)
						break;
				}
				if(val)
				{
					parsed += val;
					if(isOr)
						count = string.indexOf('}',count);
				}
				count++;
				if(!val && isOr)
					continue;
			}
			while(count < ln && string[count] != '{')
				parsed += string[count++];
			if(string[count] == '{')
				count++;
		}
		return parsed;
	};


	utils.removeInside = function(obj, toRemove){
		if(!toRemove.forEach)
			toRemove = [toRemove];
		var tr = {}, item = null, key = null;
		for(var i = 0, len = toRemove.length; i < len; ++i)
		{
			item = toRemove[i];
			if(typeof item === 'object')
				key = item.id;
			else
				key = item;
			tr[key] = item;
		}
		if(obj.forEach)
		{
			for(var i = 0, len = obj.length; i < len; ++i)
			{
				item = obj[i];
				if(typeof item === 'object')
					key = item.id;
				else
					key = item;
				if(tr[key])
					obj.splice(i,1);
			}
		}
		else
		{
			for(var i in obj)
			{
				item = obj[i];
				if(typeof item === 'object')
					key = item.id;
				else
					key = i;
				if(tr[key])
					delete obj[i];
			}
		}
		return obj;
	};

	var outputToString = function(){
		return "?"+utils.toQueryString(this);
	};

	var queryStringReg1 = /\+/g;
	utils.parseQueryString = function(q)
	{
		var query = q;
		if(q[0] == "?")
			q = q.substring(1);
		q = q.replace(queryStringReg1, ' ');
		var x = q.split('&'), i, name, t, value, entry, output = {};
		for (i=0, len = x.length; i<len; i++)
		{
			t = x[i].split('=', 2);
			if (t.length > 1)
				value = unescape(t[1]);
			else
				value = true;
			name = unescape(t[0]);
			utils.toPath(output,name,value,".", true);
		}
		//output.toString = outputToString;
		//console.log("query string : ", output, ""+output);
		return output;
	};

	utils.toQueryString = function(obj, prefix) {
		var str = [], env = null;
		if(obj.forEach)
			for(var i = 0, len = obj.length; i<len; ++i)
			{
				env = encodeURIComponent(obj[i]);
				str.push(encodeURIComponent(prefix) + ((env=="true")?"":("=" + env)));
			}
		else
			for(var p in obj)
			{
				if(p == 'toString')
					continue;
				var k = prefix ? prefix + "." + p : p, v = obj[p];
				if(typeof v == "object")
					str.push(utils.toQueryString(v, k));
				else
				{
					env = encodeURIComponent(v);
					str.push(encodeURIComponent(k) + ((env=="true")?"":("=" + env)));
				}
			}
		return str.join("&");
	};


	utils.stripFirstSlash = function(text)
	{
		if(text.substring(0,1) == "/")
			return text.substring(1);
		return text;
	};

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
					res += path[ count++ ];
			}
			else
				res += path[ count++ ];
		}
		count++;
		return { value:res, rest:path.substring(count)};
	};

	function trim_words(theString, numWords, maxChar)
	{
		expString = theString.split(/\s+/,numWords);
		if(expString.length == 1)
		{
			maxChar = maxChar || 10;
			if(expString[0].length > maxChar)
				return theString.substring(0,maxChar);
			return expString[0];
		}
		theNewString=expString.join(" ");
		if(theNewString.length < theString.length && theNewString[theNewString.length-1] != ".")
			theNewString += "...";
		return theNewString;
	}

	utils.trimWords = function(string, numWords, maxChar)
	{
		return trim_words(string.replace(/<[^>]*>/gi, ""), numWords, maxChar);
	};

	//_________________________________________________________________ OBJECTS/ARRAY RELATED



    utils.argToArr = Array.prototype.slice;
	/**
	 * make a copy of provided array, but do not copy items. just reproduce an array with same items.
	 * @method copyArray
	 * @static
	 * @param  {Array} arr
	 * @return {Array} the array copy
	 */
	utils.copyArray = function(arr){
		return arr.slice();
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
	utils.copy = function copy(obj, noClone)
	{
		if(!obj)
			return obj;
		var res = null;
		if(!noClone && typeof obj.clone === 'function')
			return obj.clone();
		if(obj.forEach)
		{
			if(obj._deep_shared_)
				return obj;
			res = [];
			var len = obj.length;
			for(var i = 0; i < len; ++i)
			{
				var e = obj[i];
				if(typeof e === 'object')
					res.push(copy(e));
				else
					res.push(e);
			}
		}
		else if(typeof obj === 'object')
		{
			if(obj instanceof RegExp)
				return obj;
			if(obj instanceof Date)
				return obj; //new Date(obj.valueOf());
			if(obj._deep_shared_)
				return obj;
			res = {};
			for(var j in obj)
			{
				var v = obj[j];
				//if(obj.hasOwnProperty(j))
					if(typeof v === 'object')
						res[j] = copy(v);
					else
						res[j] = v;
			}
		}
		else if(typeof obj === 'function')
			res = obj; //utils.cloneFunction(obj);
		else
			res = obj;
		return res;
	};

	utils.simpleCopy = utils.shallowCopy = function (obj)
	{
		if(obj instanceof Array)
			return obj.slice();
		if(obj && typeof obj === 'object')
		{
			if(obj instanceof RegExp)
				return obj;
			if(obj instanceof Date)
				return new Date(obj.valueOf());
			var res = {};
			for(var i in obj)
			{
				//if(obj.hasOwnProperty(i))
					res[i] = obj[i];
			}
			return res;
		}
		return obj;
	};

	utils.getObjectClass = function (obj) {
		if (obj && obj.constructor && obj.constructor.toString) {
			var arr = obj.constructor.toString().match(/function\s*(\w+)/);
			if (arr && arr.length == 2)
				return arr[1];
		}
		return undefined;
	};

	utils.setValueByPath = utils.toPath = function (object, path, value, pathDelimiter, keepOld)
	{
		if(path[0] == "/" || path.substring(0,1) == "./")
			pathDelimiter = "/";
		var parts = path.split(pathDelimiter||".");
		if(pathDelimiter == "/" && (parts[0] === "" || parts[0] == "."))
			parts.shift();
		var tmp = object;
		while(parts.length>1)
		{
			var part = parts.shift();
			if(!tmp[part])
				tmp[part] = {};
			tmp = tmp[part];
		}
		var last = parts.shift();
		if(keepOld && tmp[last])
		{
			if(!tmp[last].forEach)
				tmp[last] = [tmp[last]];
			tmp[last].push(value);
		}
		else
			tmp[last] = value;
		return value;
	};

	utils.fromPath = utils.valueByPath = utils.fromPath =function (object, path, pathDelimiter)
	{
		if(!path)
			return object;
		if(path[0] == "/" || path.substring(0,1) == "./")
			pathDelimiter = "/";
		var parts = path.split(pathDelimiter||".");
		if(pathDelimiter == "/" && (parts[0] === "" || parts[0] == "."))
			parts.shift();
		var tmp = object;
		//if(tmp && tmp._deep_query_node_)
		//	tmp = tmp.value;
		while(parts.length>1)
		{
			var part = parts.shift();
			if(!tmp[part])
				return undefined;
			tmp = tmp[part];
		}
		if(tmp)
			return tmp[parts.shift()];
		else return undefined;
	};

	utils.getValuesQueryBySchemaPath = function (object, schemaPath, pathDelimiter)
	{
		// /properties/adresses/items
		//    /addresses/[]
		
		if(path[0] == "/" || path.substring(0,1) == "./")
			pathDelimiter = "/";

		if(pathDelimiter == '/')
		{
			schemaPath = schemaPath.replace(/\/properties/,'');
			schemaPath = schemaPath.replace(/\/items/,'[]');
		}
		else
		{
			schemaPath = schemaPath.replace(/\./,'/');
			schemaPath = schemaPath.replace(/\/properties/,'');
			schemaPath = schemaPath.replace(/\/items/,'[]');
			schemapPath = '/'+schemaPath;
		}
		return schemaPath;
	};

	utils.deletePropertyByPath = function (object, path, pathDelimiter)
	{
		if(path[0] == "/" || path.substring(0,1) == "./")
			pathDelimiter = "/";
		var parts = path.split(pathDelimiter||".");
		if(pathDelimiter == "/" && (parts[0] === "" || parts[0] == "."))
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
	};

	utils.retrieveSchemaByPath = utils.schemaByValuePath = function retrieveSchemaByPath(schema, path, pathDelimiter)
	{
		//console.log("retrieveSchemaByPath : ", schema, path);
		if(path[0] == "/" || path.substring(0,1) == "./")
			pathDelimiter = "/";
		var parts = path.split(pathDelimiter||".");
		if(pathDelimiter == "/" && (parts[0] === "" || parts[0] == "."))
			parts.shift();
		var tmp = schema;
		while(parts.length>1)
		{
			var part = parts.shift();
			if(!tmp.properties || !tmp.properties[part])
				return undefined;
			tmp = tmp.properties[part];
		}
		if(tmp && tmp.properties)
			return tmp.properties[parts.shift()];
		else
			return undefined;
	};
	/*
		Does not make a deep-copy if collision : just if collid : make unique
	*/
	utils.arrayUnique = function arrayUnique(arr1, uniqueOn){
		if(!arr1.forEach)
			return arr1;
		var map = {};
		var count = 0;
		var arr = [];
		arr1.forEach(function(a){
			var val = null;
			if(uniqueOn)
				val = utils.fromPath(a,uniqueOn);
			else if(a.uri)
				val = a.uri;
			if(val === null || val === undefined)
				val = String(a);
			if(typeof map[val] === 'undefined')
			{
				map[val] = true;
				arr.push(a);
			}
		});
		return arr;
	};

	utils.arrayFusion = function arrayFusion(arr1, arr2, uniqueOn){
		var map = {};
		var count = 0;
		var arr = [];
		if(arr1 && arr1.length > 0)
			arr = arr.concat(arr1);
		arr.forEach(function(a){
			var val = null;
			if(uniqueOn)
				val = utils.fromPath(a,uniqueOn);
			else if(a.uri)
				val = a.uri;
			if(val === null || val === undefined)
				val = String(a);
			map[val] = true;
		});
		arr2.forEach(function(a){
			var val = null;
			if(uniqueOn)
				val = utils.fromPath(a,uniqueOn);
			else if(a.uri)
				val = a.uri;
			if(val === null || val === undefined)
				val = String(a);
			if(typeof map[val] === 'undefined')
				arr.push(a);
		});
		return arr;
	};

	utils.inArray = function inArray(what, inArr)
	{
		//console.log("inArray : what : "+JSON.stringify(what) + " - in : "+JSON.stringify(inArr));
		if(!inArr || !inArr instanceof Array)
			return false;
		var test = {};
		inArr.forEach(function(e){
			test[e] = true;
		});
		if(what.forEach)
		{
			var okCount = 0;
			what.forEach(function(e){
				if(typeof test[e] !== 'undefined')
					okCount++;
			});
			if(okCount == what.length)
				return true;
			return false;
		}
		else if(test[what])
			return true;
		return false;
	};

	utils.getJSPrimitiveType = function getJSPrimitiveType(obj)
	{
		if(obj instanceof Array)
			return "array";
		return typeof obj;
	};

	utils.deepEqual = function deepEqual(a,b, ordered)
	{
		//console.log("deepEqual : ",JSON.stringify(a),JSON.stringify(b));
		if(ordered === undefined)
			ordered = true;
		if(typeof a !== typeof b)
			return false;
		if(typeof a === 'object')
		{
			if(a === null && a !== b)
				return false;
			if(b === null && a !== b)
				return false;

			var ok = true;
			var tmpA = [];
			var tmpB = [];

			if(typeof a.forEach === 'function')
			{
				if(typeof b.forEach !== 'function' ||  a.length !== b.length)
					return false;
				var count = 0;
				ok = ok && a.every(function(e){
					return utils.deepEqual(e, b[count++]);
				});
				if(!ok)
					return false;
			}
			else
			{
				for(var i in b)
				{
					//console.log("deepEqual :b[i] : ",i);
					//if(!b.hasOwnProperty(i))
					  //  continue;
					if(typeof a[i] === 'undefined')
						return false;
					ok = ok && utils.deepEqual(a[i], b[i]);
					if(!ok)
						return false;
					tmpB.push(i);
				}
				for(var i in a)
				{
					//console.log("deepEqual :a[i] : ",i);
					//if(!a.hasOwnProperty(i))
					//  continue;
					tmpA.push(i);
				}
			}
			if(tmpA.length !== tmpB.length)
				return false;
			//console.log("will try ordered : ", JSON.stringify(tmpB), JSON.stringify(tmpA))
			if(ordered)
				for(var j = 0; j < tmpB.length; ++j)
					if(tmpB[j] !== tmpA[j])
						return false;
		}
		else if(a !== b)
			return false;
		return true;
	};

	var digit = /^[0-9]*$/;
	var retrieveFullSchemaByPath = utils.retrieveFullSchemaByPath =  function retrieveFullSchemaByPath(schema, path, delimitter)
	{
		//console.log("rerieve full schema by path : ", schema, path, delimitter)
		path = path+"";
		if(path == '/')
			return schema;
		if(path[0] == "/" || path.substring(0,1) == "./")
			delimitter = "/";
		var parts = path.split(delimitter||".");
		if(delimitter == "/" && (parts[0] === "" || parts[0] == "."))
			parts.shift();
		if(parts.length == 0)
			return schema;
		// console.log("retrieveSchemaByPath : ", parts, schema);
		var tmp = schema;
		while(parts.length>1 && tmp)
		{
			var part = parts.shift();
			if(part.match(digit))
			{
				if(tmp.type == "array")
				{
					tmp = tmp.items || null;
					continue;
				}
			}
			if(!tmp.properties || !tmp.properties[part])
				return null;
			tmp = tmp.properties[part];
		}
		if(!tmp)
			return null;
		//console.log("after test last part -1 : ", tmp);

		var lastPart = parts.shift();
		var res = [];
		if(lastPart.match(/^[0-9]*$/))
		{
			if(tmp.type == "array")
			{
				tmp = tmp.items || {};
				res.push(tmp);
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
						res.push(tmp.patternProperties[i]);

			// console.log("after test last part pattern props : ", res);

			if(res.length === 0)
				if (tmp.additionalProperties === undefined || tmp.additionalProperties === false)
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
		else
			return null;
		// console.log("retrieveSchemaByPath : finally : ", path, finalSchema);

		return finalSchema;
	};


	//___________________________________________ RANGE RELATED

	utils.createRangeObject = function (start, end, total, count, results, query) {
		var res = {
			_deep_range_:true,
			total:total,
			count:count,
			results:results,
			start:0,
			end:0,
			hasNext:false,
			hasPrevious:false,
			query:query || ""
		};
		function update (start, end, total)
		{
			this.total = total || this.total || 0;
			if(this.total === 0)
			{
				this.start = this.end = 0;
				return this;
			}
			this.start = start;// Math.max(Math.min(this.total-1,start), 0);
			this.end = end; //Math.max(Math.min(end, this.total-1),0);
			this.hasNext = (this.end < (this.total-1));
			this.hasPrevious = (this.start > 0);
			//console.log("update range  : res : ",this);
			return this;
		}
		update.call(res,start,end,total);
		return res;
	};

	//_________________________________________________ HTTP RELATED

	utils.parseJson = function (body) {
		//console.log("Parsing JSON body ", body);
		if(typeof body === 'string')
			return JSON.parse(body);
		else 
			return body;
	};

	utils.parseBody = function (body, headers)
	{

		if(typeof body === 'undefined' || body === null)
			return null;
		var res = body;
		if(res instanceof Array)
		{
			res = "";
			body.forEach(function(b){
				res += b.toString();
			});
		}
		body = res;

		var contentType = headers["content-type"] || headers["Content-Type"] || "application/json";

		contentType = contentType.split(";")[0];
		//console.log("deep.utils.parseBody : type : ", contentType, " - ", body)
		try{
		switch(contentType)
		{
			case "application/json-rpc" :
				return utils.parseJson(body);
			case "application/json" :
				return utils.parseJson(body);
			case "application/javascript" :   // TODO : should be parsed by json-extended parser
				return utils.parseJson(body);
			default :
				return body;
		}
		}
		catch(e){
			deep.utils.dumpError(e);
			return new Error("error while parsing body : "+e.toString());
		}
	};

	function parseUri (str)
	{
		var	o   = parseUri.options,
			m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
			uri = {},
			i   = 14;
		while (i--)
			uri[o.key[i]] = m[i] || "";
		uri[o.q.name] = {};
		uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
			if ($1) uri[o.q.name][$1] = $2;
		});
		return uri;
	}

	parseUri.options = {
		strictMode: true,
		key: ["href","protocol","host","userInfo","user","password","hostname","port","relative","pathname","directory","file","search","hash"],
		q:   {
			name:   "query",
			parser: /(?:^|&)([^&=]*)=?([^&]*)/g
		},
		parser: {
			strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
			loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
		}
	};

	utils.parseURL = function(url)
	{
		var obj = parseUri(url);
		if(obj.search)
			obj.search = "?"+obj.search;
		obj.path = obj.pathname+obj.search;
		return obj;
	};

	//_____________________________________________________  ERROR RELATED

	utils.dumpError  =function(err)
	{
		if (typeof err === 'object' && err !== null)
		{
			console.log("\n\n**************************** (deep) Error Dump : \n");
			if (err.status)
				console.log('\nStatus: ' + err.status);
			if (err.message)
				console.log('\nMessage: ' + err.message);
			//for(var i in err)
			console.log(err);
			if(err.requireModules)
				console.log("Error from : ", err.requireModules);
			if (err.stack)
			{
				console.log('\nStacktrace:');
				console.log('====================');
				console.log(err.stack);
			}
			if (err.report)
			{
				console.log('\nReport:');
				console.log('====================');
				console.log(JSON.stringify(err.report, null, ' '));
				console.log('============================================================');
			}
		}
		else
			console.warn('dumpError :: argument is not an object : ',err);
	};

	utils.logItemsProperty = function (array, prop) {
		var r = [];
		array.forEach(function (a) {
			console.log("deep.logItemsProperty : ",prop, a[prop]);
			r.push(a[prop]);
		});
		return r;
	};

	utils.decorateUpFrom = function(src, target, properties)
	{
		properties.forEach(function(prop){
			if(typeof src[prop] !== 'undefined')
				utils.up(src[prop], target[prop], null, target, prop);
		});
	};

	//_______________________________________________________ QUERY UTILS
	utils.remove = function(obj, what, schema){
		var removed = [];
		function finalise(r) {
			if (!r.ancestor)
				return;
			removed.push(r);
			if (r.ancestor.value instanceof Array)
				r.ancestor.value.splice(r.key, 1);
			else {
				delete r.ancestor.value[r.key];
			}
		}
		r = deep.query(obj, what, { resultType: "full", schema:schema });
		//console.log("deep.utils.remove : ", obj, what, r);
		if (!r)
			return r;
		if (r._deep_query_node_)
		{
			finalise(r);
			return removed.shift();
		}
		r.forEach(finalise);
		return removed;
	};

	utils.replace = function(target, what, by, schema){
		var replaced = [];
		function finalise(r) {
			if (!r.ancestor)
				return;
			r.ancestor.value[r.key] = r.value = by;
			replaced.push(r);
		}
		var r = deep.query(target, what, { resultType: "full", schema:schema });
		if (!r)
			return r;
		if (r._deep_query_node_)
		{
			finalise(r);
			return replaced.shift();
		}
		r.forEach(finalise);
		return replaced;
	};

	var setHierarchy = function addHierarchy(entry, cache, results)
	{
		if(entry.paths.length === 0)
		{
			results.push(entry);
			cache._deep_node_ = entry;
			entry.childs = [];
			entry.hierarch = null;
			return;
		}
		var len = entry.paths.length-1;
		var temp = cache;
		var last = cache._deep_node_ || null;
		for(var  i = 0; i < len; ++i)
		{
			var part = entry.paths[i];
			var tmp = temp[part];
			if(!tmp)
				temp[part] = tmp = {};
			if(tmp._deep_node_)
				last = tmp._deep_node_;
			temp = tmp;
		}
		var node = temp[entry.key] = { _deep_node_:entry };
		entry.hierarch = last;
		entry.childs = [];
		if(last)
			last.childs.push(entry);
		else
			results.push(entry);
	};

	utils.hierarchy = function hierarchy(root, test)
	{
		return utils.preorder(root, test, { hierarchy:true });
	};

	utils.preorder = function preorder(root, test, options)
	{
		options = options || {};
		var res = [],
			current = null,
			stack = null,
			hierarchyCache = options.hierarchy?{}:null;

		if(root._deep_stack_)
			stack = root.stack;
		else
		{
			if(!root._deep_query_node_)
				root = deep.nodes.root(root);
			stack = [root];
		}
		while(stack.length > 0)
		{
			current = stack.pop();
			//console.log("current : ", current);
			var v = current.value;
			if(!v)
				continue;
			if(test)
			{
				if(test.call(v))
					if(options.first)
					{
						if(options.returnStack)
							return { stack:stack, result:current, _deep_stack_:true };
						else
							return current;
					}
					else if(options.hierarchy)
						setHierarchy(current, hierarchyCache, res);
					else
						res.push(current);
			}
			else
				res.push(current);

			if(typeof v === 'function')
				continue;
			var r = [];
			var type = null;
			if(v.forEach)
			{
				var len = v.length;
				for(var i = 0; i < len; ++i)
				{
					var va = v[i];
					type = typeof va;
					if( (type !== 'object' && type !== 'function')|| (typeof jQuery !== 'undefined' && va instanceof jQuery)) // jQuery nodes contain cyclic value
						continue;
					r.unshift(deep.nodes.create(i, current)); //{ path:current.path+i+'/', value:va });
				}
			}
			else
				for(var j in v)
				{
					var vb = v[j];
					type = typeof vb;
					if( (type !== 'object' && type !== 'function') || (typeof jQuery !== 'undefined' && vb instanceof jQuery))
						continue;
					r.unshift(deep.nodes.create(j, current));
				}
			stack = stack.concat(r);
		}
		if(options.first && res.length === 0)
			return [];
		return res;
	};

	utils.inorder = function inorder(root, test, options)
	{
		options = options || {};
		var res = [],
			current = null,
			stack = null,
			hierarchyCache = options.hierarchy?{}:null;
		if(root._deep_stack_)
			stack = root.stack;
		else
		{
			if(!root._deep_query_node_)
				root = deep.nodes.root(root);
			stack = [root];
		}
		while(stack.length > 0)
		{
			current = stack.shift();
			var v = current.value;
			if(!v)
				continue;
			if(test)
			{
				if(test.call(v))
				{
					if(options.first)
					{
						if(options.returnStack)
							return { stack:stack, result:current, _deep_stack_:true };
						else
							return current;
					}
					else if(options.hierarchy)
						setHierarchy(current, hierarchyCache, res);
					else
						res.push(current);
				}
			}
			else
				res.push(current);
			var type = null;
			if(v.forEach)
			{
				var len = v.length;
				for(var i = 0; i < len; ++i)
				{
					var va = v[i];
					type = typeof va;
					if((type !== 'object' && type !== 'function') || (typeof jQuery !== 'undefined' && va instanceof jQuery))
						continue;
					stack.unshift(deep.nodes.create(i, current)); //{ path:current.path+i+'/', value:va });
					//stack.push({ path:current.path+i+'/', value:va });
				}
			}
			else
				for(var j in v)
				{
					var vb = v[j];
					type = typeof vb;
					if((type !== 'object' && type !== 'function') || (typeof jQuery !== 'undefined' && vb instanceof jQuery))
						continue;
					stack.unshift(deep.nodes.create(j, current));
					//stack.push({ path:current.path+j+'/', value:vb });
				}
		}
		if(options.first && res.length === 0)
			return null;
		return res;
	};

	//____________________________________________________________
	// inspired from Kris Zyp original rql array sort.
	utils.sort = function (array, attributes) {
		var terms = [];
		for (var i = 0; i < attributes.length; i++) {
			var sortAttribute = attributes[i];
			var firstChar = sortAttribute.charAt(0);
			var term = {
				attribute: sortAttribute,
				ascending: true
			};
			if (firstChar == "-" || firstChar == "+") {
				if (firstChar == "-")
					term.ascending = false;
				term.attribute = term.attribute.substring(1);
			}
			if (self._queried)
				term.attribute = "value" + ((term.attribute) ? ("." + term.attribute) : "");
			terms.push(term);
		}
		array.sort(function (a, b) {
			for (var term, i = 0; term = terms[i]; i++)
			{
				if (term.attribute === "") {
					if (a != b)
						return term.ascending == a > b ? 1 : -1;
					return;
				}
				if(a && a._deep_query_node_)
					a = a.value;
				if(b && b._deep_query_node_)
					b = b.value;
				var ar = utils.fromPath(a, term.attribute);
				var br = utils.fromPath(b, term.attribute);
				if (ar != br)
					return term.ascending == ar > br ? 1 : -1;
			}
			return 0;
		});
		return array;
	};


	return utils;
});





