/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
 
if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(["require"], function (require){
return function(deep)
{
	var parser = require("rql/parser");
	deep.utils.parseRQL = parser.parseQuery;

	function filter(condition, not){
		// convert to boolean right now
		var filtr = function doFilter(property, second){
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
		filtr.condition = condition;
		return filtr;
	}

	function reducer(func){
		return function(property){
			if(property){
				return this.map(function(object){
					return retrieve(object, property);
				}).reduce(func);
			}else{
				return this.reduce(func);
			}
		};
	}

	deep.RQL = {};

	deep.RQL.Ops = {
		isPresent : function (path, items){
			var res = [];
			//console.log("is present : "+path)
			items.forEach(function (e){
			//	console.log("got items : test : " + path + " - object ",e);
				if(retrieve(e, path))
					res.push(e);
			});
			return res;
		},
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
			//console.log("match rql : ", value, regex," - ", value, " - ",new RegExp(regex).test());
			return new RegExp(regex).test(value);
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
			return utils.inArray(value, array);
		}),
		excludes: filter(function rqlExcludes(array, value){
			return !utils.inArray(value, array);
		}),
		or: function rqlOr(){
			var items = [];
			//TODO: remove duplicates and use condition property
			for(var i = 0; i< arguments.length; ++i){
				if(typeof arguments[i] == 'function')
					items = items.concat(arguments[i].call(this));
				else
					items = items.concat(isPresent(arguments[i], items));
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
			var res = this.map(function(object){
				var selected = {};
				for(var i = 0; i < argc; i++){
					var propertyName = args[i];

					var value = evaluateProperty(object, propertyName);
	               // console.log("rql select : ",propertyName, " - value : ", value, " - object : ", object);
					if(typeof value != "undefined"){
						selected[propertyName] = value;
					}
				}
				return selected;
			});
	        //console.log("rql select res : ",res);
	        return res;
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
				for(var i = 0; i < al; i++){
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
			a = retrieve(a);
			b = retrieve(b);
			return a + b;
		}),
		mean: function rqlMean(property){
			return layer.operators.sum.call(this, property)/this.length;
		},
		max: reducer(function rqlMax(a, b){
			a = retrieve(a);
			b = retrieve(b);
			return Math.max(a, b);
		}),
		min: reducer(function rqlMin(a, b){
			a = retrieve(a);
			b = retrieve(b);
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
				throw new deep.errors.RQL("More than one object found");
			return this[0];
		}
	};
	deep.rqlNodeToFunc = function(node, options)
	{
		if(typeof node === 'object')
		{
			var name = node.name;
			var args= node.args;
			if(node.forEach)
				return [ node.map(deep.rqlNodeToFunc) ];
			else
			{
				var b = args[0], path = null;
				if(args.length == 2)
				{
					path = b;
					b = args[1];
					if(options.objectPrefix)
						path = options.objectPrefix+"."+path;
				}
				var func = null;
				var isFilter = false;
				switch(name)
				{
					case "eq" : isFilter = true; func = function(a){ return deep.utils.valueByPath(a, path, ".")===b; }; break;
					case "ne" : isFilter = true; func = function(a){ return deep.utils.valueByPath(a, path, ".")!==b; }; break;
					case "le" : isFilter = true; func = function(a){ return deep.utils.valueByPath(a, path, ".")<=b; }; break;
					case "ge" : isFilter = true; func = function(a){ return deep.utils.valueByPath(a, path, ".")>=b; }; break;
					case "lt" : isFilter = true; func = function(a){ return deep.utils.valueByPath(a, path, ".")<b; }; break;
					case "gt" : isFilter = true; func = function(a){ return deep.utils.valueByPath(a, path, ".")>b; }; break;
					default :
						var ops = deep.RQL.Ops[name];
						if(!ops)
							throw deep.errors.Error(500, "no operator found in rql with : "+name);
						if(args && args.length > 0)
						{
							args = args.map(deep.rqlNodeToFunc);
							func =  function(){ return ops.apply(this, args); };
						}
						else
							func =  function(){ return ops.call(this); };
				}
				if(isFilter)
					return function(){ /*console.log("RQL OP Test : ", this); */return this.filter(func); };
				else
					return func;
			}
		}
		else
			return node;
	};

	var queryCache = {};

	deep.rqlToFunc = function(query, options){

		var evaluationFunc = queryCache[query];
		if(evaluationFunc)
			return evaluationFunc;
		options = options || {};
		var parsed = deep.utils.parseRQL(query);
		var func = deep.rqlNodeToFunc(parsed, options);
		queryCache[query] = func;
		return func;
	};

	deep.fromRQL = function(array, query, options)
	{
		return deep.rqlToFunc(query, options).call(array);
	};
	return deep.fromRQL;
};
});

















