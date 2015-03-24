/**
 * A deep oriented implementation of RQL for JavaScript arrays based on rql/js-array from Kris Zyp (https://github.com/persvr/rql).
 *	What's different from js-array ? It could handle schema properties, and node's type and/or depth when filtering.
 *	It handle also dotted notation for properties path.
 *	Schema, type, and depth need _deep_query_node_ to work. for this, use it through deep's chains.
 * @module deep
 * @submodule deep-rql
 * @example
 * rql([{a:{b:3}},{a:3}], "a.b=3") -> [{a:{b:3}]
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "../utils", "rql/parser", "../errors"], function(require, utils, parser, errors) {
	"use strict";
	var rqlParser = parser.parseQuery;
	utils.parseRQL = function(input) {
		try {
			var r = rqlParser(input);
			r.toString = function() {
				return input;
			};
			return r;
		} catch (e) {
			return null;
		}
	};
	var queryCache = {};

	errors.RQL = function(msg, report, fileName, lineNum) {
		if (typeof msg === 'object')
			report = msg;
		if (!msg)
			msg = "RQLError";
		return errors.Error(500, msg, report, fileName, lineNum);
	};

	var rql = function(array, query) {
		if (query[0] == "?")
			query = query.substring(1);
		if (queryCache[query])
			return queryCache[query].call(array);
		return rql.compile(query).call(array);
	};

	rql.compile = function(query) {
		var parsed = utils.parseRQL(query);
		var func = rqlNodeToFunc(parsed);
		queryCache[query] = func;
		return func;
	};

	rql.ops = {
		isPresent: function(path, items) {
			var res = [];
			var len = items.length;
			for (var i = 0; i < len; ++i)
				if (retrieve(items[i], path))
					res.push(items[i]);
			return res;
		},
		sort: function rqlSort() {
			var terms = [];
			for (var i = 0; i < arguments.length; i++) {
				var sortAttribute = arguments[i];
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
				terms.push(term);
			}
			this.sort(function(a, b) {
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
		match: filter(function rqlMatch(value, regex) {
			return new RegExp(regex).test(value);
		}),
		"in": filter(function rqlIn(value, values) {
			var ok = false;
			var count = 0;
			while (!ok && count < values.length)
				if (values[count++] == value)
					ok = true;
			return ok;
		}),
		out: filter(function rqlOut(value, values) {
			var ok = true;
			var count = 0;
			while (ok && count < values.length)
				if (values[count++] == value)
					ok = false;
			return ok;
		}),
		contains: filter(function rqlContains(array, value) {
			return utils.inArray(value, array);
		}),
		excludes: filter(function rqlExcludes(array, value) {
			return !utils.inArray(value, array);
		}),
		or: function rqlOr() {
			var items = [];
			//TODO: remove duplicates and use condition property
			for (var i = 0; i < arguments.length; ++i) {
				var a = arguments[i];
				if (typeof a == 'function')
					items = items.concat(a.call(this));
				else
					items = items.concat(rql.ops.isPresent(a, items));
			}
			return items;
		},
		and: function rqlAnd() {
			var items = this;
			for (var i = 0; i < arguments.length; ++i) {
				var a = arguments[i];
				if (typeof a == 'function')
					items = a.call(items);
				else
					items = rql.ops.isPresent(a, items);
			}
			return items;
		},
		select: function rqlSelect() {
			var args = arguments;
			var argc = arguments.length;
			var res = this.map(function(object) {
				var selected = {};
				for (var i = 0; i < argc; i++) {
					var propertyName = args[i];
					var value = evaluateProperty(object, propertyName);
					if (typeof value != "undefined")
						selected[propertyName] = value;
				}
				return selected;
			});
			return res;
		},
		/* _______________________________________________ WARNING : NOT IMPLEMENTED WITH PREFIX*/
		unselect: function rqlUnselect() {
			var args = arguments;
			var argc = arguments.length;
			return this.map(function(object) {
				var selected = {};
				for (var i in object)
					if (object.hasOwnProperty(i))
						selected[i] = object[i];
				for (var i = 0; i < argc; i++)
					delete selected[args[i]];
				return selected;
			});
		},
		values: function rqlValues(first) {
			if (arguments.length == 1)
				return this.map(function(object) {
					return retrieve(object, first);
				});
			var args = arguments;
			var argc = arguments.length;
			return this.map(function(object) {
				var realObject = retrieve(object);
				var selected = [];
				if (argc === 0) {
					for (var i in realObject)
						if (realObject.hasOwnProperty(i))
							selected.push(realObject[i]);
				} else
					for (var i = 0; i < argc; i++) {
						var propertyName = args[i];
						selected.push(realObject[propertyName]);
					}
				return selected;
			});
		},
		limit: function rqlLimit(limit, start, maxCount) {
			var totalCount = this.length;
			start = start || 0;
			var sliced = this.slice(start, start + limit);
			if (maxCount) {
				sliced.start = start;
				sliced.end = start + sliced.length - 1;
				sliced.totalCount = Math.min(totalCount, typeof maxCount === "number" ? maxCount : Infinity);
			}
			return sliced;
		},
		distinct: function rqlDistinct() {
			var primitives = {};
			var needCleaning = [];
			var newResults = this.filter(function(value) {
				value = retrieve(value);
				if (value && typeof value == "object") {
					if (!value.__found__) {
						value.__found__ = function() {}; // get ignored by JSON serialization
						needCleaning.push(value);
						return true;
					}
					return false;
				}
				if (!primitives[value]) {
					primitives[value] = true;
					return true;
				}
				return false;
			});
			needCleaning.forEach(function(object) {
				delete object.__found__;
			});
			return newResults;
		},
		recurse: function rqlRecurse(property) {
			// TODO: this needs to use lazy-array
			var newResults = [];

			function recurse(value) {
				if (value.forEach)
					value.forEach(recurse);
				else {
					newResults.push(value);
					if (property) {
						value = value[property];
						if (value && typeof value == "object")
							recurse(value);
					} else
						for (var i in value)
							if (value[i] && typeof value[i] == "object")
								recurse(value[i]);
				}
			}
			recurse(retrieve(this));
			return newResults;
		},
		aggregate: function rqlAggregate() {
			var distinctives = [];
			var aggregates = [];
			for (var i = 0; i < arguments.length; i++) {
				var arg = arguments[i];
				if (typeof arg === "function")
					aggregates.push(arg);
				else
					distinctives.push(arg);
			}
			var distinctObjects = {};
			var dl = distinctives.length;
			this.forEach(function(object) {
				object = retrieve(object);
				var key = "";
				for (var i = 0; i < dl; i++)
					key += '/' + object[distinctives[i]];
				var arrayForKey = distinctObjects[key];
				if (!arrayForKey)
					arrayForKey = distinctObjects[key] = [];
				arrayForKey.push(object);
			});
			var al = aggregates.length;
			var newResults = [];
			for (var key in distinctObjects) {
				var arrayForKey = distinctObjects[key];
				var newObject = {};
				for (var i = 0; i < dl; i++) {
					var property = distinctives[i];
					newObject[property] = arrayForKey[0][property];
				}
				for (var i = 0; i < al; i++) {
					var aggregate = aggregates[i];
					newObject[i] = aggregate.call(arrayForKey);
				}
				newResults.push(newObject);
			}
			return newResults;
		},
		between: filter(function rqlBetween(value, range) {
			value = retrieve(value);
			return value >= range[0] && value < range[1];
		}),
		sum: reducer(function rqlSum(a, b) {
			a = retrieve(a);
			b = retrieve(b);
			return a + b;
		}),
		mean: function rqlMean(property) {
			return rql.ops.sum.call(this, property) / this.length;
		},
		max: reducer(function rqlMax(a, b) {
			a = retrieve(a);
			b = retrieve(b);
			return Math.max(a, b);
		}),
		min: reducer(function rqlMin(a, b) {
			a = retrieve(a);
			b = retrieve(b);
			return Math.min(a, b);
		}),
		count: function rqlCount() {
			return this.length;
		},
		first: function rqlFirst() {
			return this[0];
		},
		last: function rqlLast() {
			return this[this.length - 1];
		},
		random: function rqlRandom() {
			return this[Math.round(Math.random() * (this.length - 1))];
		},
		one: function rqlOne() {
			if (this.length > 1)
				throw new errors.RQL("More than one object found");
			return this[0];
		}
	};

	function rqlNodeToFunc(node) {
		if (typeof node === 'object') {
			var name = node.name;
			var args = node.args;
			if (node.forEach)
				return node.map(rqlNodeToFunc);
			else {
				var b = args[0],
					path = null;
				if (args.length == 2) {
					path = b;
					b = args[1];
				}
				var func = null;
				var isFilter = false;
				switch (name) {
					case "eq":
						isFilter = true;
						func = function eq(a) {
							return (retrieve(a, path) || undefined) === b;
						};
						break;
					case "ne":
						isFilter = true;
						func = function ne(a) {
							return (retrieve(a, path) || undefined) !== b;
						};
						break;
					case "le":
						isFilter = true;
						func = function le(a) {
							return (retrieve(a, path) || undefined) <= b;
						};
						break;
					case "ge":
						isFilter = true;
						func = function ge(a) {
							return (retrieve(a, path) || undefined) >= b;
						};
						break;
					case "lt":
						isFilter = true;
						func = function lt(a) {
							return (retrieve(a, path) || undefined) < b;
						};
						break;
					case "gt":
						isFilter = true;
						func = function gt(a) {
							return (retrieve(a, path) || undefined) > b;
						};
						break;
					default:
						var ops = rql.ops[name];
						if (!ops)
							throw errors.RQL("no operator found in rql with : " + name);
						if (args && args.length > 0) {
							args = args.map(rqlNodeToFunc);
							func = function() {
								return ops.apply(this, args);
							};
						} else
							func = function() {
								return ops.call(this);
							};
				}
				if (isFilter)
					return function() {
						var r = this.filter(func);
						return r;
					};
				else
					return func;
			}
		} else
			return node;
	}

	function retrieve(obj, path) {
		if (!path) {
			if (obj._deep_query_node_)
				return obj.value;
			return obj;
		}
		var splitted = path.split(".");
		var tmp = obj;
		switch (splitted[0]) {
			case '_schema':
				if (obj._deep_query_node_) {
					splitted.shift();
					tmp = obj.schema;
				} else
					return undefined;
				break;
			case '_depth':
				if (obj._deep_query_node_)
					return obj.depth;
				return undefined;
			case '_type':
				if (obj._deep_query_node_)
					return utils.getJSPrimitiveType(obj.value);
				return utils.getJSPrimitiveType(obj);
			default:
				if (obj._deep_query_node_)
					tmp = tmp.value;
		}
		if (!tmp)
			return tmp;
		var len = splitted.length,
			needtype = false;
		if (splitted[len - 1] == "_type") {
			len--;
			needtype = true;
			splitted.pop();
		}
		if (len < 5) {
			var res;
			switch (len) {
				case 1:
					res = tmp[splitted[0]];
					break;
				case 2:
					res = tmp[splitted[0]] && tmp[splitted[0]][splitted[1]];
					break;
				case 3:
					res = tmp[splitted[0]] && tmp[splitted[0]][splitted[1]] && tmp[splitted[0]][splitted[1]][splitted[2]];
					break;
				case 4:
					res = tmp[splitted[0]] && tmp[splitted[0]][splitted[1]] && tmp[splitted[0]][splitted[1]][splitted[2]] && tmp[splitted[0]][splitted[1]][splitted[2]][splitted[3]];
					break;
			}
			if (typeof res !== 'undefined' && needtype)
				return utils.getJSPrimitiveType(res);
			return res;
		}
		tmp = tmp[splitted[0]] && tmp[splitted[0]][splitted[1]] && tmp[splitted[0]][splitted[1]][splitted[2]] && tmp[splitted[0]][splitted[1]][splitted[2]][splitted[3]];
		if (typeof tmp === 'undefined')
			return undefined;
		var count = 4,
			part = splitted[count];
		while (part && tmp[part]) {
			tmp = tmp[part];
			part = splitted[++count];
		}
		if (count === len) {
			if (needtype)
				return utils.getJSPrimitiveType(tmp);
			return tmp;
		}
		return undefined;
	}

	function filter(condition, not) {
		var filtr = function doFilter(property, second) {
			if (typeof second == "undefined") {
				second = property;
				property = undefined;
			}
			var args = arguments;
			var filtered = [];
			for (var i = 0, length = this.length; i < length; i++) {
				var item = this[i];
				if (condition(evaluateProperty(item, property), second))
					filtered.push(item);
			}
			return filtered;
		};
		filtr.condition = condition;
		return filtr;
	}

	function reducer(func) {
		return function(property) {
			if (property)
				return this.map(function(object) {
					return retrieve(object, property);
				}).reduce(func);
			else
				return this.reduce(func);
		};
	}

	function evaluateProperty(object, property) {
		if (property && property.forEach)
			return retrieve(object, decodeURIComponent(property));
		if (typeof property === 'undefined')
			return retrieve(object);
		return retrieve(object, decodeURIComponent(property));
	}
	return rql;
});