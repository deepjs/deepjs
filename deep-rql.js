/*
 * A deep oriented implementation of RQL for JavaScript arrays based on rql/js-array from Kris Zyp (https://github.com/persvr/rql).
 * For example:
 * require("deep/deep-rql").query("a=3", {}, [{a:1},{a:3}]) -> [{a:3}]

What's different from js-array ? It could handle schema properties and ancestor access when filtering

 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */

if(typeof define !== 'function'){
	var define = require('amdefine')(module);
}
/**
TODO : 
add distinct(testPropertyPath)
add merge()
add backgrounds()  :  do object extension with deep-extender + schema



add _ancestor (any ancestor)
add _brothers  (any brothers)

! TEST ALL operations !

*/ 
define(function defineJsonQuery(require){
	RQL_Global = {}

var layer = {};
var utils = require("./utils");
var retrieveFullSchemaByPath = utils.retrieveFullSchemaByPath;
var parser = require("rql/parser");
var parseQuery = parser.parseQuery;
var stringify = JSON.stringify || function(str){
	return '"' + str.replace(/"/g, "\\\"") + '"';
};

function getJSPrimitiveType(obj){
	if(obj && (obj instanceof Array || obj.push))
		return "array"
	return typeof obj;
}

layer.jsOperatorMap = {
	"eq" : "===",
	"ne" : "!==",
	"le" : "<=",
	"ge" : ">=",
	"lt" : "<",
	"gt" : ">"
};

var isPresent = RQL_Global.isPresent = function isPresent(path, items){
	var res = [];
	//console.log("is present : "+path)
	items.forEach(function (e){	
	//	console.log("got items : test : " + path + " - object ",e);
		if(retrieve(e, path))
			res.push(e);
	});
	return res;
}



var rewritePath = RQL_Global.rewritePath = function rewritePath(path){

	var parts = path || [];
	//console.log("rewrite path : " +path, " - prefix ? ",objectPrefix)
	if(typeof parts  === 'string')
		parts = parts.split(".");
	//console.log("retrieve final path : " +JSON.stringify(parts))
	//console.log(parts[0] != '_schema' && parts[0] != "_parent" && objectPrefix && objectPrefix != "")
	if(objectPrefix && parts[0] != '_schema' && parts[0] != "_parent")
		parts.unshift(objectPrefix);	
	//console.log("rewrited path : ",JSON.stringify(parts))
	return parts;
}
/*
retrieve schema property
*/
var retrieveSchemaProp = RQL_Global.retrieveSchemaProp = function retrieveSchemaProp(path, schema, parts, obj){
	//console.log("retrieveSchemaProp of : ",path, " - parts : ", parts, " - schema : ", schema)
	//return schema || {};
	if(parts[0] == "_schema")
		parts.shift();
	var tmp = schema;
	if(!schema)
		//tmp = retrieveFullSchemaByPath(schema, parts.join("."));
	//else 
	{
		if(parts.length == 1 && parts[0] == "type")
		{
			//console.log("no schema but need type : produce it : ",typeof obj)
			parts.shift();
			return getJSPrimitiveType(obj);
		}
		else if(parts.length == 1 && parts[0] == "depth")
		{
			//console.log("no schema but need type : produce it : ",typeof obj)
			parts.shift();
			return path.split("/").length;
		}
		else if(parts.length == 1 && parts[0] == "class")
		{
			//console.log("no schema but need type : produce it : ",typeof obj)
			parts.shift();
			return utils.getObjectClass(obj);
		}
	}
	if(parts.length == 0 || !tmp)
		return tmp || {};
	var propSchema = utils.retrieveValueByPath(tmp, parts.join("."));
	 if(!propSchema && parts.length == 1 && parts[0] == "type")
	 {
	 	parts.shift();
		return getJSPrimitiveType(obj);
	 }	
	 return propSchema;
}

var retrieveParent = RQL_Global.retrieveParent = function retrieveParent(obj, parts, count)
{
	var tmp = obj;
	//console.log("RETREIEVE PARENT : ", tmp.value, count)
	while(tmp.ancestor && count > 0)
	{
		tmp = tmp.ancestor;
		count--;
	}
	//tmp = tmp.value;
	if(count != 0)
		tmp = null;
	//console.log("retrieve parent got :", tmp)

	return tmp;
}
var dicoRetrieve = {};
var getRetrieveFunc = RQL_Global.getRetrieveFunc = function getRetrieveFunc(path)
{
	if(dicoRetrieve[path])
		return dicoRetrieve[path];
	//console.log("deep-rql : get retrieve func : ", path, parts)
	
	var func = "";
	var parts = rewritePath(path);
	if(parts.length == 0)
	{
		//func = "(function applyEvaluatedRetrieve(object){return object;})";
	//	console.log("function evaluation retrieve : ",func);
		return dicoRetrieve[path] = new Function("object", "return object;");
	}	
	
	if(parts[0] == '_parent')
	{
		var count = 0;
		while(parts.length > 0 && parts[0] == "_parent")
		{
			count++;
			parts.shift();
		}	

		func += "object = RQL_Global.retrieveParent(object, null, "+count+"); if(object == null) return null; ";
		//console.log("will get parent with : ", func)
		if(parts.length == 0)
		{
			func += "return object;";
			//console.log("function evaluation (with parent) : ",func);
			return dicoRetrieve[path] = new Function("object",func);
		}	
		if(objectPrefix && parts[0] != "_schema")
			parts.unshift(objectPrefix)
	}
	if(parts[0] == "_schema")
	{
		//console.log("RETRIEVE SCHEMA");
		parts.shift();
		func += "var res = RQL_Global.retrieveSchemaProp(object.path, object.schema, ['"+parts.join("']['")+"'], "+((objectPrefix)?("object['"+objectPrefix+"']"):"object")+"); return res;";
		//func += "console.log('result of retrieve schema prop : ',res);"
		//func  = "(function applyEvaluatedRetrieve(object){"+func+"})";
		//console.log("function evaluation (with direct schema) : "+func);
		var evaluated = new Function("object", func);
		dicoRetrieve[path] = evaluated;
		return evaluated; /*dicoRetrieve[path] = function applyEvaluatedRetrieve(object){
			evaluated(object, parts);
		}*/
	}
	func += "var fullPath = object.path;";
	//var currentPath = [tmp.path];
	var part = parts[0];
	var escaped = [];
	//var unescaped = [];
	var item = "object";
	var schemaEnd = false;
	var escapedJoined = "";
	for(var i = 0; parts.length > 0; i++)
	{
		part = parts.shift();
		escaped.push(part);
		escapedJoined = escaped.join("']['");
		if(part != "_schema")
			item +="&&object['" + escapedJoined + "']";
		else
		{
			func += "if("+item+") object = object['"+ escapedJoined + "']; else return null;" ;
			func += "return RQL_Global.retrieveSchemaProp(fullPath+'."+escaped.join(".")+"', object.schema, ['"+parts.join("']['")+"'], object);";
			schemaEnd = true;
			break;
		}
	}
	if(!schemaEnd)
		func += "if("+item+") return object['"+ escapedJoined + "']; else return null;";
	//console.log("function evaluation retrieve : ",func);
	var evaluated = new Function("object",func);
	return dicoRetrieve[path] = evaluated;
}
var retrieve = function retrieve(object, path)
{
	//console.log("retrieve : path : " ,path , " - ",object);
	var res = getRetrieveFunc(path)(object);
	//console.log("retrieve got : ", res)
	return res;
}
RQL_Global.retrieve = retrieve;

layer.instanceOfs = {
	"Array":{}
}


layer.operators = {
	sort: function rqlSort(){
		var terms = [];
		for(var i = 0; i < arguments.length; i++){
			var sortAttribute = arguments[i];
			var firstChar = sortAttribute.charAt(0);
			var term = {attribute: sortAttribute, ascending: true};
			if (firstChar == "-" || firstChar == "+") {
				if(firstChar == "-")
					term.ascending = false;
				term.attribute = term.attribute.substring(1);
			}
			terms.push(term);
		}
		this.sort(function(a, b){
			for (var term, i = 0; term = terms[i]; i++) {
				var ar = retrieve(a, term.attribute);
				var br = retrieve(b, term.attribute);
				if (ar != br)
					return term.ascending == ar > br ? 1 : -1;
			}
			return 0;
		});
		return this;
	},
	match: filter(function rqlMatch(value, regex){
		return new RegExp(regex).test(retrieve(value));
	}),
	"instanceOf": function rqlInstanceOf(value, values){
		//console.log("IN OP : query "+value+" in : ",values)
		var ok = false;
		var count = 0;
		for(var i in values)
		{
			if(layer.instanceOfs && layer.instanceOfs[i])
				ok = ok && layer.instanceOfs[i](value);
			else
				ok = false;
			if(!ok)
				break;
		}
		return ok;
	},
	"in": filter(function rqlIn(value, values){
		//console.log("IN OP : query "+value+" in : ",values)
		var ok = false;
		var count = 0;
		while(!ok && count < values.length)
			if(values[count++] == value)
				ok = true;
		return ok;
	}),
	out: filter(function rqlOut(value, values){
		var ok = true;
		var count = 0;
		while(ok && count < values.length)
			if(values[count++] == value)
				ok = false;
		return ok;
	}),
	contains: filter(function rqlContains(array, value){
		//console.log("rql : contains : ", array, value)
		if(typeof value == "function"){
			if(array instanceof Array)
				return array.some(function(v){
					var r = retrieve(value);
					if(r)
						return r.call([v]).length;
					return false;
				});
			else
				return false;
		}
		else{
			if(!(array instanceof Array ))
				return false;
			var ok = false;
			var count = 0;
			while(!ok && count < array.length)
				if(array[count++] == value)
					ok = true;
			return ok;
		}
	}),
	excludes: filter(function rqlExcludes(array, value){
		if(!(array instanceof Array ))
				return false;
		if(typeof value == "function"){
			return !array.some(function(v){
				var r = retrieve(value);
				if(r)
					return r.call([v]).length;
				return false;
			});
		}
		else{
			var ok = true;
			var count = 0;
			while(!ok && count < array.length)
				if(array[count++] == value)
					ok = false;
			return ok;
		}
	}),
	or: function rqlOr(){
		var items = [];
		//TODO: remove duplicates and use condition property
		for(var i = 0; i< arguments.length; ++i){
			if(typeof arguments[i] == 'function')
				items = items.concat(arguments[i].call(this));
			else
				items = items.concat(isPresent(arguments[i], items))

		}
		return items;
	},
	and: function rqlAnd(){
		var items = this;
	//	console.log("rqlAnd : ", arguments);
		// TODO: use condition property
		for(var i = 0; i< arguments.length; ++i){
			//console.log("and call args : "+i+ " - "+arguments[i]);
		//	console.log("and call args : items : ", items);
			if(typeof arguments[i] == 'function')
				items = arguments[i].call(items);
			else //if(typeof arguments[i] === 'string')
				items = isPresent(arguments[i], items);
		}
		return items;
	},
	select: function rqlSelect(){
		var args = arguments;
		var argc = arguments.length;
		return this.map(function(object){
			var selected = {};
			for(var i = 0; i < argc; i++){
				var propertyName = args[i];
				var value = evaluateProperty(object, propertyName);
				if(typeof value != "undefined"){
					selected[propertyName] = value;
				}
			}
			return selected;
		});
	},
	/* _______________________________________________ WARNING : NOT IMPLEMENTED WITH PREFIX*/
	unselect: function rqlUnselect(){
		var args = arguments;
		var argc = arguments.length;
		return this.map(function(object){
			var selected = {};
			for (var i in object)
			 if (object.hasOwnProperty(i)) {
				selected[i] = object[i];
			}
			for(var i = 0; i < argc; i++) {
				delete selected[args[i]];
			}
			return selected;
		});
	},
	values: function rqlValues(first){
		if(arguments.length == 1){
			return this.map(function(object){
				return retrieve(object, first) ;
			});
		}
		var args = arguments;
		var argc = arguments.length;
		return this.map(function(object){
			var realObject = retrieve(object);
			var selected = [];
			if (argc === 0) {
				for(var i in realObject) if (realObject.hasOwnProperty(i)) {
					selected.push(realObject[i]);
				}
			} else {
				for(var i = 0; i < argc; i++){
					var propertyName = args[i];
					selected.push(realObject[propertyName]);
				}
			}
			return selected;
		});
	},
	limit: function rqlLimit(limit, start, maxCount){
		var totalCount = this.length;
		start = start || 0;
		var sliced = this.slice(start, start + limit);
		if(maxCount){
			sliced.start = start;
			sliced.end = start + sliced.length - 1;
			sliced.totalCount = Math.min(totalCount, typeof maxCount === "number" ? maxCount : Infinity);
		}
		return sliced;
	},
	distinct: function rqlDistinct()
	{
		var primitives = {};
		var needCleaning = [];
		var newResults = this.filter(function(value){
			//console.log("distinct : value : ",value);

			value = retrieve(value);
			//console.log("distinct : value : ",value);
			if(value && typeof value == "object"){
				if(!value.__found__){
					value.__found__ = function(){};// get ignored by JSON serialization
					needCleaning.push(value);
					return true;
				}
				return false;
			}else{
				//console.log("found primitive : "+value + " - "+JSON.stringify(primitives))
				if(!primitives[value]){
					//console.log("primitive was not there")
					primitives[value] = true;
					return true;
				}
				return false;
			}
		});
		needCleaning.forEach(function(object){
			delete object.__found__;
		});
		return newResults;
	},
	recurse: function rqlRecurse(property){
		// TODO: this needs to use lazy-array
		var newResults = [];
		function recurse(value){
			if(value instanceof Array){
				value.forEach(recurse);
			}else{
				newResults.push(value);
				if(property){
					value = value[property];
					if(value && typeof value == "object"){
						recurse(value);
					}
				}else{
					for(var i in value){
						if(value[i] && typeof value[i] == "object"){
							recurse(value[i]);
						}
					}
				}
			}
		}
		recurse(retrieve(this));
		return newResults;
	},
	aggregate: function rqlAggregate(){
		var distinctives = [];
		var aggregates = [];
		for(var i = 0; i < arguments.length; i++){
			var arg = arguments[i];
			if(typeof arg === "function"){
				 aggregates.push(arg);
			}else{
				distinctives.push(arg);
			}
		}
		var distinctObjects = {};
		var dl = distinctives.length;
		this.forEach(function(object){
			object = retrieve(object);
			var key = "";
			for(var i = 0; i < dl;i++){
				key += '/' + object[distinctives[i]];
			}
			var arrayForKey = distinctObjects[key];
			if(!arrayForKey){
				arrayForKey = distinctObjects[key] = [];
			}
			arrayForKey.push(object);
		});
		var al = aggregates.length;
		var newResults = [];
		for(var key in distinctObjects){
			var arrayForKey = distinctObjects[key];
			var newObject = {};
			for(var i = 0; i < dl;i++){
				var property = distinctives[i];
				newObject[property] = arrayForKey[0][property];
			}
			for(var i = 0; i < al;i++){
				var aggregate = aggregates[i];
				newObject[i] = aggregate.call(arrayForKey);
			}
			newResults.push(newObject);
		}
		return newResults;
	},
	between: filter(function rqlBetween(value, range){
		value = retrieve(value);
		return value >= range[0] && value < range[1];
	}),
	sum: reducer(function rqlSum (a, b){
		var a= retrieve(a);
		var b = retrieve(b);
		return a + b;
	}),
	mean: function rqlMean(property){
		return layer.operators.sum.call(this, property)/this.length;
	},
	max: reducer(function rqlMax(a, b){
		var a= retrieve(a);
		var b = retrieve(b);
		return Math.max(a, b);
	}),
	min: reducer(function rqlMin(a, b){
		var a= retrieve(a);
		var b = retrieve(b);
		return Math.min(a, b);
	}),
	count: function rqlCount(){
		return this.length;
	},
	first: function rqlFirst(){
		return this[0];
	},
	last: function rqlLast(){
		return this[this.length-1];
	},
	random: function rqlRandom(){
		return this[Math.round(Math.random()*(this.length-1))];
	},
	one: function rqlOne(){
		if(this.length > 1)
			throw new TypeError("More than one object found");
		return this[0];
	}
};
layer.filter = filter;
function filter(condition, not){
	// convert to boolean right now
	var filter = function doFilter(property, second){
		if(typeof second == "undefined"){
			second = property;
			property = undefined;
		}
		var args = arguments;
		var filtered = [];
		for(var i = 0, length = this.length; i < length; i++){
			var item = this[i];
			if(condition(evaluateProperty(item, property), second)){
				filtered.push(item);
			}
		}
		return filtered;
	};
	filter.condition = condition;
	return filter;
};
function reducer(func){
	return function(property){
		if(property){
			return this.map(function(object){
				return retrieve(object, property);
			}).reduce(func);
		}else{
			return this.reduce(func);
		}
	}
}
layer.evaluateProperty = evaluateProperty;
function evaluateProperty(object, property){
	if(property instanceof Array){
		return retrieve(object, decodeURIComponent(property));
	}else if(typeof property == "undefined"){
		return retrieve(object);
	}else{
		return retrieve(object, decodeURIComponent(property));
	}
};
/*
var conditionEvaluator = layer.conditionEvaluator = function(condition){
	var jsOperator = layer.jsOperatorMap[term.name];
	if(jsOperator){
		js += "(function(item){return item." + term[0] + jsOperator + "parameters[" + (index -1) + "][1];});";
	}
	else{
		js += "operators['" + term.name + "']";
	}
	return eval(js);
};*/ 
layer.executeQuery = function executeQuery(query, options, target){
	return layer.query(query, options, target);
}
layer.query = query;
layer.missingOperator = function missingOperator(operator){
	throw new Error("Operator " + operator + " is not defined");
}
var targetCache = null;
var targetSchema = null;
var objectPrefix = null;
var queryCache = {};


function query(target, qry, options){
	var q = qry;
	//console.log("deep-rql : query : ", q, options, target);
	options = options || {};
	//queryCache = {};
	//dicoRetrieve = {};
	
	var evaluationFunc = queryCache[q];
	if(evaluationFunc)
		return target ? evaluationFunc(target) : evaluationFunc;
	
	try{
		var query = parseQuery(q, options.parameters);
	}catch(e){
		console.log("deep-rql : parse error : ", q)
		return e;
	}
	prefix = options.prefix || null;
	objectPrefix = prefix || null;
	targetSchema = options.schema || null;
	targetCache = options.cache || null;
	//console.log("query : "+JSON.stringify(query) + " - prefix : "+prefix);
	//console.log("target : "+JSON.stringify(target));

	//if(options.keepCache == false || !queryCache)
	function t(){}
	t.prototype = layer.operators;
	var operators = new t;
	var op = function op(name){
		//console.log("rqlOp: ", name, " - res : " , operators[name] || layer.missingOperator(name))
		return operators[name] || layer.missingOperator(name);
	}
	RQL_Global.op = op;
	// inherit from layer.operators
	for(var i in options.operators)
		operators[i] = options.operators[i];

	var parameters = options.parameters || [];
	var js = "";
	function queryToJS(value){
		if(value && typeof value === "object"){
			if(value instanceof Array){
				//console.log("__________________ QUERY TO JS : query object is array : "+JSON.stringify(value))
				return '[' + value.map(queryToJS) + ']';
			}else{
				//console.log("QUERY TO JS : query value : "+JSON.stringify(value))
				var jsOperator = layer.jsOperatorMap[value.name];
				if(jsOperator)
				{
					//console.log("__________________ GOT OPERTAOR : "+value.name + " - have prefix ? "+prefix)
					var path = value.args[0];
					var target = value.args[1];
					var item = "";
					if (typeof target === "undefined"){
						//console.log("Query to js : path is not provided : "+JSON.stringify(path))
						item = "item";
						target = path;
						if(objectPrefix)
							item += "."+objectPrefix;
					}
					else {
						//console.log("Query to js : path  : "+JSON.stringify(path))
						item = "val&&val";
					}
					var condition = item + jsOperator + queryToJS(target);
					//console.log("conditions : "+condition)
					if (typeof Array.prototype.filter === 'function') {
						return "(function applyNativeArrayFilter(){return this.filter(function(item){var val = RQL_Global.retrieve(item,'"+path+"'); return " + condition + "})})";
						//???return "this.filter(function(item){return " + condition + "})";
					} else {
						throw "error : array have no filter";
						//return "(function(){var filtered = []; for(var i = 0, length = this.length; i < length; i++){var item = this[i]; var val = retrieve(item,'"+path+"'); if(" + condition + "){filtered.push(item);}} return filtered;})";
					}
				}else{
					//console.log("NO JS OPERATOR : value : ", value.name)
					return "(function(){"
							//+"console.log('op ? : ', RQL_Global.op);"
							//+"console.log('this ? : ', this);"
							+"var opo = RQL_Global.op('" + value.name + "');"
							//+"console.log('typeof returned opo : ', typeof opo);"
							//+"return [];"
							+"return opo"
							+".call(this" +(value && value.args && value.args.length > 0 ? (", " + value.args.map(queryToJS).join(",")) : "") +")"
						+"})";
				}
			}
		}
		else
			return typeof value === "string" ? stringify(value) : value;
	}
	var evaluationString = "return " + queryToJS(query) + ".call(target);" ;
	//evaluationString = "(function(){ console.log('grrrrrrrrrrr ') }).call(target); return []";
	var	toEval = new Function("target", evaluationString);
	

	//console.log("EVALUATION STRING \n\n",toEval);
	//var toEval = eval(evaluationString);
	queryCache[q] = toEval;
		//console.log("op ? ", op('and'))
	try{
	//	console.log("typeof toEval : ", typeof toEval);
	//	console.log("typeof target : ", typeof target);
	//	console.log("instance target : ",  target instanceof Array);
		//return (function (){return op('and').call(this, "backgrounds")}).call(target);
		//if(q == "backgrounds")
		//	return target ? op('and').call(target, "backgrounds") : [];
		//return toEval;
		if(target)
			return toEval(target);
		return toEval;
	}
	catch(e)
	{
		console.log("WARNING : RQL throw : ",JSON.stringify(e));
		//console.log("op ? ", op('and'))
		throw e;
	}
}
return layer;
});
