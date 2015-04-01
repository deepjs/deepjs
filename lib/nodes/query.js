/**
 *
 *
 * A other proposal for (json/object)-query which (as differences from official proposal):
 * - use simple slash delimitted syntax,
 * - could handle regular expression for step selection,
 * - could handle rql (for filtering) on each step selection,
 * - could be relative to where the query are placed in a object/json
 * - so could handle steps toward any ancestor
 * - could handle json-schema in rql filtering
 * - could handle ancestor in rql filtering
 *
 *
 *
 * @module deep
 * @submodule deep-query
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 * TODO : introduce OCM resolution and traversal while querying.
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "./nodes-create", "./rql", "../utils/array", "../utils/catch-parenthesis"],
function (require, nodes, rqler, arrayUtils, parenthesis) {
	"use strict";

	var QueryError = function(msg, report, fileName, lineNum) {
		var e = new Error("QueryError : "+msg, fileName, lineNum);
		e.status = 400;
		e.report = report;
		return e;
	};

	var queryCache = {};

	/**
	 * @class Query
	 * @namespace deep
	 * @constructor
	 */
	var DQ = function() {};

	DQ.prototype.analyseEreg = function analyseEreg(path, parts) {
		//	console.log("PARSE EREG : path : "+JSON.stringify(path))
		var parsed = parenthesis(path);
		var reg = parsed.value;
		var regOptions = "";
		var rest = parsed.rest;
		var self = this;
		if (rest[0] == "g" || rest[0] == "i") {
			regOptions = rest[0];
			if (rest[1] == "g" || rest[1] == "i")
				regOptions += rest[1];
		}
		rest = rest.substring(regOptions.length);
		parts.push({
			type: "selector",
			value: reg,
			options: regOptions,
			handler: function(parent) {
				var res = [];
				for (var i in parent.value) {
					//if(!parent.value.hasOwnProperty(i))
					//	continue;
					if (new RegExp(this.value, this.options).test(i)) {
						var filtered = self.returnProperty(parent, i);
						if (typeof filtered !== 'undefined' && filtered !== null)
							res.push(filtered);
					}
				}
				return res;
			}
		});
		return rest;
	};
	/**
	 * analyse path and return parsed paths objects
	 * @method analyse
	 * @param  {String} path
	 * @return {Array} parsed paths
	 */
	DQ.prototype.analyse = function dqAnalyse(path) {
		//console.log("analyse")
		var paths = [];
		var rest = path;
		this.asked = path;
		while (rest.length > 0) {
			rest = this.analyseMoves(rest, paths);
			if (paths.length === 0)
				throw QueryError("deep-queries need at least one move.", path);
			if (rest.length === 0)
				break;
			rest = this.analyseSelector(rest, paths);
			//console.log("selector analysed : rest : ",rest)
			if (rest.length === 0)
				break;
			if (rest[0] == "?")
				rest = this.analyseRQL(rest, paths);
		}
		var self = this;
		if (paths.length > 0 && paths[paths.length - 1].slashes == "/")
			paths.push({
				type: "selector",
				value: "*",
				handler: function(parent) {
					/*if(parent)
						return [parent];
					return [];*/
					return self.returnAllProps(parent);
				}
			});

		//console.log("dq analayse : ", path);
		//console.log(" : gives : "+JSON.stringify(paths, null, ' '));
		return paths;
	};

	DQ.prototype.analyseRQL = function dqanalyseRQL(path, parts) {
		if (path[0] != "?")
			return path;
		path = path.substring(1);
		//console.log("will analyse rql : ", path)
		if (path[0] == '(') {
			var parsed = parenthesis(path);
			parts.push({
				type: "rql",
				value: parsed.value,
				handler: function(items) {
					//console.log("will do rql : ", items, parsed.value);
					return rql(items, parsed.value);
				}
			});
			return parsed.rest;
		}
		var count = 0;
		var rql = "";
		while (path[count] != "/" && count < path.length)
			rql += path[count++];
		parts.push({
			type: "rql",
			value: rql,
			handler: function(items) {
				var res = null;
				try {
					//console.log("doRQLHANDLER : items : ", items)
					//console.log("will do rql 2 : ", items, rql);
					res = rqler(items, rql);
					//console.log("doRQLHANDLER : res : ", res)
				} catch (e) {
					console.log("deep-query : rql errors : ", e);
					return [];
				}
				return res;
			}
		});
		//console.log("rql analyse gives : ", rql)
		return path.substring(count);
	};

	DQ.prototype.analyseIndexAccess = function dqanalyseIndexAccess(path, parts) {
		var tmp = "";
		var count = 0;
		while (path[count] != "/" && path[count] != "?" && count < path.length)
			tmp += path[count++];
		var splitted = tmp.split(":");
		var self = this;
		var range = {
			type: "selector",
			handler: function(parent) {
				var st = this.start(parent);
				if (st == -1)
					return [];
				var prop = null;
				if (this.end === null) {

					prop = self.returnProperty(parent, st);
					if (prop !== null && typeof prop !== 'undefined')
						return [prop];
					return [];
				}
				var res = [];
				for (var i = st; i <= this.end(parent); i += this.step(parent)) {
					prop = self.returnProperty(parent, i);
					if (prop !== null && typeof prop !== 'undefined')
						res.push(prop);
				}
				return res;
			},
			start: null,
			end: null,
			step: function(parent) {
				return 1;
			}
		};
		var pos = 0,
			value = null;
		splitted.forEach(function(e) {
			if (e === "") {
				if (pos === 0)
					value = function(parent) {
						return 0;
					};
				else if (pos == 1)
					value = function(parent) {
						if (parent.value.length !== undefined)
							return parent.value.length - 1;
						else
							return -1;
					};
				else
					value = function(parent) {
						return 1;
					};
			} else if (e.substring(0, 8) == '@.length') {
				var rest = e.substring(8);
				if (rest.length === 0 || rest[0] != "-")
					throw QueryError("when you use @.length : you could only use minus '-' operator followed by an integer.", path, parts);
				var integ = parseInt(rest.substring(1));
				if (isNaN(integ))
					throw QueryError("when you use @.length : you could only use minus '-' operator followed by an integer.", path, parts);
				value = function(parent) {
					if (parent.value.length !== undefined)
						return parent.value.length - integ;
					else
						return -1;
				};
			} else {
				var integs = parseInt(e);
				if (isNaN(integs))
					throw QueryError("bad index : index unknown", path, parts);
				value = function(parent) {
					return integs;
				};
			}
			if (pos === 0)
				range.start = value;
			else if (pos == 1)
				range.end = value;
			else range.step = value;
			pos++;
		});
		parts.push(range);
		return path.substring(count);
	};

	DQ.prototype.analyseUnionAccess = function dqanalyseUnionAccess(path, parts) {
		if (path[0] != '[')
			throw QueryError("union access need to start with '['.", path, parts);
		var inner = "";
		var othis = this;
		var count = 1;
		while (path[count] != ']' && count < path.length)
			inner += path[count++];
		var splitted = inner.split(",");
		var self = this;
		if (splitted.length === 0) {
			parts.push({
				type: "selector",
				value: "*",
				handler: function(parent) {
					return self.returnAllProps(parent);
				}
			});
			return path.substring(count + 1);
		}
		var union = {
			type: "selector",
			selectors: [],
			handler: function(parent) {
				var res = [];
				this.selectors.forEach(function(selector) {
					var locals = selector.handler(parent);
					if (locals)
						res = res.concat(locals);
				});
				return res;
				// make unique on path
			}
		};
		splitted.forEach(function(spl) {
			othis.analyseSelector(spl, union.selectors, true);
		});
		parts.push(union);
		return path.substring(count + 1);
	};

	DQ.prototype.returnProperty = function dqreturnProperty(entry, key) {
		if (typeof entry.value === 'string' && key !== 'length')
			return null;
		var obj = entry.value;

		if (obj && typeof obj[key] !== 'undefined')
			entry = nodes.create(key, entry);
		else
			entry = null;
		//console.log("returnProperty : ", key, " - on : ", obj, " - entry : ", entry)
		return entry;
	};
	DQ.prototype.returnAllProps = function dqreturnAllProps(entry) {
		//if(typeof entry.value === "string")
		//	return [this.createEntry('length', entry)];
		if (typeof entry.value === "string")
			return [];
		var obj = entry.value;
		var childs = [];
		for (var i in obj) {
			if (i == "_deep_shared_")
				continue;
			if (!obj.hasOwnProperty(i))
				continue;
			var ent = nodes.create(i, entry);
			if (typeof ent !== 'undefined')
				childs.push(ent);
		}
		return childs;
	};
	DQ.prototype.returnRecursiveProps = function dqreturnRecursiveProps(entry) {
		//console.log("recursive props : ", entry.path)
		if (typeof entry.value === "string")
			return [];
		var obj = entry.value;
		var childs = [];
		var self = this;
		for (var i in obj) {
			if (!obj.hasOwnProperty(i))
				continue;
			var child = nodes.create(i, entry);
			if (typeof child !== "undefined")
				childs.push(child);
			if (typeof obj[i] === 'object')
				childs = childs.concat(self.returnRecursiveProps(child));
		}
		return childs;
	};

	DQ.prototype.analyseSelector = function dqanalyseSelector(path, parts, fromUnion) {
		//console.log("analyseSelector : ", path);
		var count = 0;
		var self = this;
		if (path.length === 0) {
			if (parts.length > 1 && parts[parts.length - 1].slashes == "//")
				return path;
			if (fromUnion)
				parts.push({
					type: "selector",
					value: "*",
					handler: function(parent) {
						return self.returnAllProps(parent);
					}
				});
			else
				parts.push({
					type: "selector",
					value: "*",
					handler: function(parent) {
						return self.returnAllProps(parent);
						if (parent)
							return [parent];
						return [];
						//return self.returnAllProps(parent);
					}
				});
			return path;
		}
		if (path[0] == "?") {
			//console.log("analyseSelector : find rql directly : preious is // : ",parts[parts.length-1].value == "//")
			if (fromUnion)
				throw QueryError("you couldn't have '?' in union of selectors.", path, parts);
			if (parts[parts.length - 1].slashes == "//")
				return path;
			parts.push({
				type: "selector",
				value: "*",
				handler: function(parent) {
					return self.returnAllProps(parent);
					if (parent)
						return [parent];
					return [];
					//return self.returnAllProps(parent);
				}
			});
			return path;
		}
		if (path[0] == "!") {
			parts.push({
				type: "selector",
				value: "!",
				handler: function(parent) {
					//console.log("apply direct acces : ", path)
					if (parent)
						return [parent];
					return [];
				}
			});
			//console.log("git drect access : ", path, JSON.stringify(parts));

			return path.substring(1);
		}
		if (path[0] == "(")
			return this.analyseEreg(path, parts);
		if (/^[0-9]/.test(path[0]) || path[0] == '@' || path[0] == ":")
			return this.analyseIndexAccess(path, parts);
		if (path[0] == '[') {
			if (fromUnion)
				throw QueryError("you couldn't have union in union of selectors." + this.currentQuery);
			return this.analyseUnionAccess(path, parts);
		}
		var string = "";
		while (path[count] != '/' && path[count] != '?' && count < path.length)
			string += path[count++];
		//console.log("analyseSelector : got string", string);
		if (string == "*") {
			if (parts.length > 0 && parts[parts.length - 1].slashes == "//")
				return path.substring(count);

			parts.push({
				type: "selector",
				value: "*",
				handler: function(parent) {
					return self.returnAllProps(parent);
				}
			});
			return path.substring(count);
		}
		parts.push({
			type: "selector",
			value: string,
			handler: function(parent) {
				//	console.log("analyseSelector string handler : ", string, parent);
				var res = self.returnProperty(parent, string);
				if (res !== null && typeof res !== 'undefined')
					return [res];
				return [];
			}
		});
		return path.substring(count);
	};

	DQ.prototype.analyseMoves = function dqanalyseMoves(path, paths) {
		var steps = [];
		var tmp = "";
		var a = 0;
		//console.log("analyseMoves");
		while (a < path.length && (path[a] == "." || path[a] == "/")) {
			//console.log("analyse move: ", path[a])
			while (path[a] == '/') {
				tmp += '/';
				a++;
			}
			if (tmp.length > 0) {
				if (tmp.length > 2)
					throw QueryError("bad move : ", path);
				steps.push(tmp);
				tmp = '';
			}
			while (path[a] == '.') {
				tmp += '.';
				a++;
			}
			if (tmp.length > 0) {
				if (tmp.length > 3)
					throw QueryError("bad move : ", path);
				steps.push(tmp);
				tmp = '';
			}
			//console.log("a ?",a, path.length)
			//break;
		}
		//console.log("analyseMoves : steps : ", steps);

		//return "";
		var last = steps[steps.length - 1];
		if (!last)
			throw QueryError("deepQuery : missformed query : " + this.asked);
		if (last[0] == ".")
			a -= last.length;

		while (steps.length > 0) {
			var res = {
				type: "move",
				points: null,
				slashes: null
			};
			var step = steps.shift();
			if (step[0] == ".") {
				res.points = step;
				step = steps.shift();
			}
			if (step != '/' && step != '//')
				throw QueryError("bad move : " + JSON.stringify(path) + " - " + step);
			res.slashes = step;
			paths.push(res);
			//console.log("analyse move give : ",res)
		}

		return path.substring(a);
	};

	DQ.prototype.doMove = function dqdoMove(move, items) {
		var newItems = [];
		var toDo = move;
		var self = this;
		items.forEach(function(item) {
			if (toDo.points)
				switch (toDo.points) {
					case ".":
						newItems.push(item);
						break;
					case "..":
						if (item.ancestor)
							newItems.push(item.ancestor);
						break;
					case "...":
						var tmp = item;
						while (tmp.ancestor) {
							newItems.push(tmp.ancestor);
							tmp = tmp.ancestor;
						}
						break;
					default:
						throw QueryError("bad move : ", toDo);
				} else
					newItems.push(item);
			if (toDo.slashes == "//")
				newItems = newItems.concat(self.returnRecursiveProps(item));
		});
		//console.log("DO MOVE gives : ", newItems);
		return newItems;
	};


	var straightRegExp = /(\?)|(\/\/)|(\[)|(\()|(\*)/gi;
	/**
	 *
	 * perform the query on object
	 *
	 * @method query
	 * @param  {Object} obj any object to query on
	 * @param  {String} q the query
	 * @param  {Object} options (optional) :  options : fullOutput:true when you want to get the array of nodes results, not only the values results.
	 * @return {Array} an array of results (maybe empty)
	 */
	DQ.prototype.query = function doDeepQuery(obj, q, options) {
		if (typeof obj !== 'object' || !obj)
			return [];
		this.currentQuery = q;
		//console.log("DQ.query : ", obj, q, options)
		options = options || {};
		var items = null,
			currentRoot = null;

		if (q[0] === '#')
			q = q.substring(1);
		//console.log("DeepQuery : will do : ",q);

		if (obj._deep_query_node_) {
			// console.log("DQ : start with _deep_query_node_", obj, q)
			currentRoot = obj.root || obj;
			if (q[0] == '/')
				items = [currentRoot];
			else
				items = [obj];
		} else {
			// console.log("DQ : start with direct object", obj, q)
			currentRoot = nodes.root(obj, options.schema);
			//this.root.root = this.root;
			items = [currentRoot];
		}
		//items[0].root = this.root;

		if (q == '/')
			if (options.allowStraightQueries !== false) {
				if (options.fullOutput)
					return items[0];
				return items[0].value;
			} else {
				if (options.fullOutput)
					return items;
				return items.map(function(n) {
					//if(n.value && n.value._deep_ocm_)
					//	return n.value();
					return n.value;
				});
			}
		this.straightQuery = false;
		if (options.allowStraightQueries !== false && !q.match(straightRegExp)) {
			//console.log("straight query")
			this.straightQuery = true;
			/*if(!q.match(/(\.\.)/g))
			{
				if(q[0] == ".")
					q = q.substring(1);
				//console.log("STRAIGHT QUERY : ",q)
				var r = utils.fromPath(items[0].value, q, "/");
				if(typeof r === 'undefined')
					return [];
				return r;
			}*/
		}
		var parts;
		if (queryCache[q])
			parts = queryCache[q];
		else
			queryCache[q] = parts = this.analyse(q);
		//parts = parts.slice();
		//console.log("Query Cache gives : ", parts);
		if (parts.length === 0 || parts[0].type != "move")
			throw QueryError("query need to start with move : " + q);
		var self = this,
			start = true,
			count = 1,
			part = parts[0];
		while (part) {
			switch (part.type) {
				case 'move':
					if (start && (part.slashes == "/" && !part.points)) {
						items = [currentRoot];
						break;
					}
					items = self.doMove(part, items);
					//console.log("do move : ", items)
					break;
				case 'selector':
					var results = [];

					var len = items.length;
					for (var i = 0; i < len; ++i) {
						var item = items[i];
						var r = part.handler(item);
						if (r && r.length > 0)
							results = results.concat(r);
					}
					items = results;
					break;
				case 'rql':
					items = part.handler(items);
					break;
			}
			//console.log("catch results : ", items)
			start = false;
			part = parts[count++];
		}
		items = arrayUtils.arrayUnique(items, "path");
		//console.log("DQ :"+q+" raw results : ", items)
		if (options.fullOutput) {
			if (this.straightQuery)
				if (items.length == 1)
					return items.shift();
				else
					return undefined;
			items._deep_array_ = true;
			return items;
		}
		var finalRes = items.map(function(e) {
			return e.value;
		});
		//console.log("QUERY "+q+" : straight ? ", this.straightQuery, finalRes);
		if (this.straightQuery)
			if (items.length == 1)
				return finalRes.shift();
			else
				return undefined;
		return finalRes;
	};

	var globalQuerier = null;
	/**
	 *
	 * perform the query (static access of query method)
	 *
	 * @static
	 * @method query
	 * @param  {Object} root
	 * @param  {String} path
	 * @param  {Object} options
	 * @return {Array} results
	 */
	DQ.query = function deepQuery(root, path, options) {
		if (!globalQuerier)
			globalQuerier = new DQ();
		return globalQuerier.query(root, path, options);
	};

	DQ.remove = function(obj, what, schema) {
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
		var r = DQ.query(obj, what, {
			fullOutput: true,
			schema: schema
		});
		//console.log("deep.Querier.remove : ", obj, what, r);
		if (!r)
			return r;
		if (r._deep_query_node_) {
			finalise(r);
			return removed.shift();
		}
		r.forEach(finalise);
		return removed;
	};

	DQ.replace = function(target, what, by, schema) {
		var replaced = [];

		function finalise(r) {
			if (!r.ancestor)
				return;
			r.ancestor.value[r.key] = r.value = by;
			replaced.push(r);
		}
		var r = DQ.query(target, what, {
			fullOutput: true,
			schema: schema
		});
		if (!r)
			return r;
		if (r._deep_query_node_) {
			finalise(r);
			return replaced.shift();
		}
		r.forEach(finalise);
		return replaced;
	};	
	return DQ;

});