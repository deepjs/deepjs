/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>

see Docs/deep-query.md   for full documentations

A other proposal for (json/object)-query which (as differences from official proposal):
use simple slash delimitted syntax, 
could handle regular expression for step selection, 
could handle rql (for filtering) on each step selection,
could be relative to where the query are placed in a object/json
so could handle a step toward any ancestor
could handle json-schema in rql filtering
could handle ancestor in rql filtering

queries: 
/?foo=2&bar/myArray.*?length=gt=10/[1:4:2,@.length-2]//(^p.*)g?=in=(hello,bye)&_parent.taxerate=lt=0.12&_schema.type=string
../foo/bar?zoo.name//price?=in=(12,55)
/foo/bar/
//(p.+)gi/../../foo//bar?=3

Each move could be composed of 

[''|'.'|'..'|'...'] ['/'|'//']

Any selector could be :
!				current
empty | *		any childs  (obviously not in ../../ (there is no selectors between : just up moves))
string (precise)	particular child
(regExp without /)[gi]	reg exp matching
[array of selectors]   (will give the union of all selectors)

Any filter could be a (deep)RQL query
*/
/*
query options : 
resultType : "full" || undefined : full : you got all the map (with path etc.), undefined you got just results
*/


/*
parser gives : [ { up:0, recursif:false, access:[____, ____], rql:[____, ____] } ]
*/ 
/*
	TODO : 
	add context and parametrisation
	add full expression in access
	add -brothers selector
/+brothers

	check if parent access give array if starting from items 		OK it does
*/
if(typeof define !== 'function'){
	var define = require('amdefine')(module);
}
define(function defineDeepQuery(require)
{
	var rqlQuery = require("deep/deep-rql").query;
	var utils = require("deep/utils");
	var QueryError = Error;
	var retrieveFullSchemaByPath = utils.retrieveFullSchemaByPath;

	var DQ = function(){}

	DQ.prototype.analyseEreg = function analyseEreg(path, parts)
	{
	//	console.log("PARSE EREG : path : "+JSON.stringify(path))
		var parsed = utils.catchParenthesis(path);
		var reg = parsed.value;
		var regOptions = "";
		var rest = parsed.rest;
		var self = this;
		if(rest[0] == "g" || rest[0] == "i")
		{
			regOptions = rest[0];
			if(rest[1] == "g" || rest[1] == "i")
				regOptions += rest[1];
		}
		rest = rest.substring(regOptions.length);
		parts.push({
			type:"selector",
			value:reg,
			options:regOptions,
			handler:function(parent){
				var res = [];
				for(var i in parent.value)
				{
					//if(!parent.value.hasOwnProperty(i))
					//	continue;
					if(i == "_deep_entry")
						continue;
					if(new RegExp(this.value,this.options).test(i))
					{
						var filtered = self.returnProperty(parent, i);
						if(typeof filtered !== 'undefined' && filtered != null)
							res.push(filtered);
					}	
				}
				return res;
			}
		});
		return rest;
	}		

	DQ.prototype.analyse = function (path) 
	{
		//console.log("analyse")
		var paths = [];
		var rest = path;
		while(rest.length > 0)
		{
			var rest = this.analyseMoves(rest, paths);
			if(paths.length == 0)
				throw new QueryError("deep-queries need at least one move.", path);
			if(rest.length == 0)
				break;
			rest = this.analyseSelector(rest, paths);
			//console.log("selector analysed : rest : ",rest)
			if(rest.length == 0)
				break;
			if(rest[0]== "?")
				rest = this.analyseRQL(rest,paths);
		}
		var self = this;
		if(paths.length > 0 && paths[paths.length-1].slashes == "/")
			paths.push({
				type:"selector",
				value:"*",
				handler:function (parent) {
					return self.returnAllProps(parent);
				}
			})
		if(console.flags && console.flags["deep-query"])
		{
			console.log("dq analayse : ", path)
			console.log(" : gives : "+JSON.stringify(paths, null, ' '));
		}
		return paths;
	}

	DQ.prototype.analyseRQL = function (path, parts) {
		if(path[0] != "?")
			return path;
		path = path.substring(1);
		//console.log("will analyse rql : ", path)
		if(path[0] == '(')
		{
			var parsed = utils.catchParenthesis(path);
			parts.push({
				type:"rql",
				value:parsed.value,
				handler:function(items){
					return rqlQuery(items, parsed.value, { prefix:"value", fromDeepQuery:true });
				}
			});
			return parsed.rest;
		}
		var count = 0;
		var rql = "";
		while(path[count] != "/" && count < path.length)
			rql += path[count++];
		parts.push({
			type:"rql",
			value:rql,
			handler:function(items){
				try{
					//console.log("doRQLHANDLER : items : ", items)
					var res = rqlQuery(items, rql, { prefix:"value", fromDeepQuery:true });
					//console.log("doRQLHANDLER : res : ", res)
				}
				catch(e)
				{
					console.log("deep-query : rql errors : ", e);
					return [];
				}
				return res;
			}
		});
		//console.log("rql analyse gives : ", rql)

		return path.substring(count);
	}

	DQ.prototype.analyseIndexAccess = function (path, parts) 
	{
		var tmp = "";
		var count = 0;
		while(path[count] != "/" && path[count] != "?" && count < path.length)
			tmp += path[count++];
		var splitted = tmp.split(":");
		var self = this;
		var range = {
			type:"selector",
			handler:function(parent){
				var st = this.start(parent);
				if(st == -1)
					return [];
				if(this.end === null)
				{

					var prop = self.returnProperty(parent, st);
					if(prop != null && typeof prop !== 'undefined')
						return [prop];
					return [];	
				}	
				var res = [];
				for(var i = st; i <= this.end(parent); i += this.step(parent))
				{
					var prop = self.returnProperty(parent, i);
					if(prop != null && typeof prop !== 'undefined')
						res.push(prop);
				}	
				return res;
			},
			start:null,
			end:null,
			step:function(parent){
				return 1;
			}
		}
		var pos = 0, value = null;
		splitted.forEach(function (e) {
			if(e == "")
			{
				if(pos == 0)
					value = function(parent){
						return 0;
					};
				else if(pos == 1)
					value = function(parent){
						if(parent.value.length !== undefined)
							return parent.value.length-1;
						else
							return -1;
					}
				else 
					value = function(parent){
						return 1;
					}
			}
			else if(e.substring(0,8) == '@.length')
			{	
				var rest = e.substring(8);
				//console.log("got index with @.length : rest : ",rest)
				if(rest.length == 0 || rest[0] != "-")
					throw new QueryError("when you use @.length : you could only use minus '-' operator followed by an integer.", path, parts);
				var integ = parseInt(rest.substring(1));
				if(isNaN(integ))
					throw new QueryError("when you use @.length : you could only use minus '-' operator followed by an integer.", path, parts);
				value = function(parent){
					if(parent.value.length !== undefined)
					{
						var len = Math.min(integ, parent.value.length);
						return len-integ;
					}	
					else
						return -1;
				};
			}	
			else 
			{
				var integs = parseInt(e);
				if(isNaN(integs) )
					throw new QueryError("bad index : index unknown", path, parts);
				value = function(parent){
					return integs;
				}
			}	
			if(pos == 0)
				range.start = value;
			else if(pos == 1)
				range.end = value;
			else range.step = value;
			pos++;
		})
		parts.push(range);
		return path.substring(count);
	}

	DQ.prototype.analyseUnionAccess = function (path, parts) 
	{
		if(path[0] != '[')
			throw new QueryError("union access need to start with '['.", path, parts)
		var inner = "";
		var othis = this;
		var count = 1;
		while(path[count] != ']'  && count < path.length)
			inner += path[count++];
		var splitted = inner.split(",");
		if(splitted.length == 0)
		{
			parts.push({
				type:"selector",
				value:"*",
				handler:function (parent) {
					return self.returnAllProps(parent)
				}
			});
			return path.substring(count+1);
		}
		var union = {
			type:"selector",
			selectors:[],
			handler:function(parent){
				var res = [];
				this.selectors.forEach(function (selector) {
					var locals = selector.handler(parent);
					if(locals)
						res = res.concat(locals);
				})
				return res;
				// make unique on path
			}
		}
		splitted.forEach(function (spl) {
			othis.analyseSelector(spl, union.selectors, true);
		})
		parts.push(union);
		return path.substring(count+1);
	}
	DQ.prototype.createEntry = function  (key, ancestor) 
	{
		var path = ancestor.path
		if(path[path.length-1] == '/')
			path += key;
		else
			path += "/"+key;
		//if(this.cache[path])
		//	return this.cache[path];

		var schema = null;
		if(ancestor.schema)
			schema = retrieveFullSchemaByPath(ancestor.schema, path, "/");
		//console.log("DQ.createEntry : "+path+" : ancestor : ",ancestor)
		return this.cache[path] = {
			_isDQ_NODE_:true,
			root:ancestor.root,
			value:ancestor.value[key],
			path:path,
			key:key,
			ancestor:ancestor,
			schema:schema,
			depth:ancestor.depth+1
		}
	}
	DQ.prototype.returnProperty = function(entry, key){
		if(key == "_deep_entry")
			return null;
		if(typeof entry.value === 'string' && key !== 'length')
			return null;
		var obj = entry.value;
		
		if(typeof obj[key] !== 'undefined')
			entry = this.createEntry(key, entry);
		else
			entry = null;
		//console.log("returnProperty : ", key, " - on : ", obj, " - entry : ", entry)
		return entry;

	}
	DQ.prototype.returnAllProps = function(entry){
		//if(typeof entry.value === "string")
		//	return [this.createEntry('length', entry)];
		if(typeof entry.value === "string")
			return [];
		var obj = entry.value;
		var childs = [];
		for(var i in obj)
		{
			if(i == "_deep_entry")
				continue;
			if(!obj.hasOwnProperty(i))
				continue;
			var ent = this.createEntry(i, entry);
			if(typeof ent !== 'undefined')
				childs.push(ent);
		}
		return childs;
	}
	DQ.prototype.returnRecursiveProps = function(entry){
		//console.log("recursive props : ", entry.path)

		if(typeof entry.value === "string")
			return [];

		var obj = entry.value;
		var childs = [];
		var self = this;
		for(var i in obj)
		{
			if(!obj.hasOwnProperty(i))
				continue;
			if(i == "_deep_entry")
				continue;
			var child = self.createEntry(i, entry);
			if(typeof child !== "undefined")
				childs.push(child);
			if(typeof obj[i] === 'object')
				childs = childs.concat(self.returnRecursiveProps(child));
		}
		return childs;
	}
	DQ.prototype.analyseSelector = function (path, parts, fromUnion) 
	{
		//console.log("analyseSelector : ", path);
		var count = 0;
		var self = this;
		if(path.length == 0)
		{
			if(parts.length > 1 && parts[parts.length-1].slashes == "//")
				return path;
			parts.push({
				type:"selector",
				value:"*",
				handler:function (parent) {
					return self.returnAllProps(parent);
				}
			});
			return path;
		}
		if(path[0] == "?")
		{
			//console.log("analyseSelector : find rql directly : preious is // : ",parts[parts.length-1].value == "//")
			if(fromUnion)
				throw new QueryError("you couldn't have '?' (rql) in an union of selectors.", path, parts);
			if(parts[parts.length-1].slashes == "//")
				return path;
			parts.push({
				type:"selector",
				value:"*",
				handler:function (parent) {
					return self.returnAllProps(parent);
				}
			});
			return path;
		}
		if(path[0] == "!")
		{
			parts.push({
				type:"selector",
				value:"!",
				handler:function(parent){
					//console.log("apply direct acces : ", path)
					if(parent)
						return [parent];
					return [];
				}
			})
			//console.log("git drect access : ", path, JSON.stringify(parts));

			return path.substring(1);
		}
		if(path[0] == "(")
			return this.analyseEreg(path, parts);
		if(/^[0-9]/.test(path[0]) || path[0] == '@' || path[0] == ":")
			return this.analyseIndexAccess(path, parts);
		if(path[0] == '[')
		{
			if(fromUnion)
				throw new QueryError("you couldn't have union in union of selectors.", path, parts);
			return this.analyseUnionAccess(path, parts);
		}	
		var string = "";
		while(path[count] != '/' && path[count] != '?'  && count < path.length)
			string += path[count++];
		//console.log("analyseSelector : got string", string);
		if(string == "*")
		{	
			if(parts[parts.length-1].slashes == "//")
				return path.substring(count);

			parts.push({
				type:"selector",
				value:"*",
				handler:function (parent) {
					return self.returnAllProps(parent)
				}
			});
			return path.substring(count);
		}
		parts.push({
			type:"selector",
			value:string,
			handler:function(parent)
			{
			//	console.log("analyseSelector string handler : ", string, parent);
				var res = self.returnProperty(parent, string);
				if(res != null && typeof res !== 'undefined')
					return [res];
				return [];
			}
		})
		return path.substring(count);
	}
	DQ.prototype.analyseMoves = function (path, paths) {
		var steps = [];
		var tmp = "";
		var a = 0;
		//console.log("analyseMoves");
		while(a < path.length && (path[a] == "." || path[a] == "/") )
		{
			//console.log("analyse move: ", path[a])
			while(path[a] == '/')
			{
				tmp += '/';
				a++;
			}	
			if(tmp.length > 0)
			{
				if(tmp.length > 2)
					throw new QueryError("bad move : ", path);
				steps.push(tmp);
				tmp = '';
			}
			while(path[a] == '.')
			{
				tmp += '.';
				a++;
			}
			if(tmp.length > 0)
			{
				if(tmp.length > 3)
					throw new QueryError("bad move : ", path);
				steps.push(tmp);
				tmp = '';
			}
			//console.log("a ?",a, path.length)
			//break;
		}
		//console.log("analyseMoves : steps : ", steps);
		
		//return "";
		var last = steps[steps.length-1];
		if(last[0] == ".")
			a -= last.length;
			
		while(steps.length > 0)
		{
			var res = { type:"move", points:null, slashes:null };
			var step = steps.shift();
			if(step[0]  == ".")
			{
				res.points = step;
				step = steps.shift();
			}
			if(step  != '/' && step != '//')
				throw new QueryError("bad move : "+JSON.stringify( path )+" - "+step);
			res.slashes = step;
			paths.push(res);
			//console.log("analyse move give : ",res)
		}

		return path.substring(a);
	}
	DQ.prototype.doMove = function(move, items, start)
	{
		var newItems = [];
		var toDo = move;
		var self = this;
		items.forEach ( function ( item ) 
		{
			if(toDo.points)
				switch(toDo.points)
				{
					case "." : 
						newItems.push(item);
					break;
					case ".." : 
						if(item.ancestor)
							newItems.push(item.ancestor);
					break;
					case "..." : 
						var tmp = item;
						while(tmp.ancestor)
						{
							newItems.push(tmp.ancestor);
							tmp = tmp.ancestor;
						}
					break;
					default: 
						throw new QueryError("bad move : ", toDo);
				}
			if(!toDo.points)
			{
				if(start)
					newItems.push(self.root);
				else
					newItems.push(item);
			}
			if(toDo.slashes == "//")
				newItems = newItems.concat(self.returnRecursiveProps(item));
		})
		//console.log("DO MOVE gives : ", newItems);
		return newItems;
	}
	
	DQ.prototype.query = function (obj, q, options) 
	{
		if(typeof obj !== 'object')
		{
			return [];
		}
		//console.log("DQ.query : ", obj, q, options)
		options = options || {};
		if(!this.cache || !options.keepQueryCache)
			this.cache = {};
		var items = null;

		var parts = this.analyse(q);
		if(parts.length == 0 || parts[0].type != "move")
			throw new QueryError("query need to start with move : "+q);
		if(obj && obj._isDQ_NODE_ == true)
		{
			//console.log("DQ : start with _isDQ_NODE_")
			this.root = this.cache["/"] = obj.root || obj;
			items = [obj];
		}
		else if(obj && obj._deep_entry)
		{
			//console.log("DQ : start with object with _deep_entry ")
			this.root = this.cache["/"] = obj._deep_entry.root;
			items = [obj._deep_entry];
		}
		else
		{
			this.root = this.cache["/"] = DQ.createRootNode(obj, options.schema)
			//this.root.root = this.root;
			items = [this.cache["/"]];
		}
		items[0].root = this.root;

		var self = this;
		var start = true;
		while(parts.length>0)
		{
			var part = parts.shift();
			switch(part.type)
			{
				case 'move' : 
					items = self.doMove(part, items, start);
					//console.log("do move : ", items)
					break;
				case 'selector' : 
					var results = [];
					items.forEach(function (item) {
						var r =  part.handler(item);
						if(r && r.length > 0)
							results = results.concat(r);
					})
					/*results.forEach(function (a) {
						console.log("do selector results: ", a.path)
					})*/
					//console.log("catch selector : items : ", results)
					
					items = results;
					break;
				case 'rql': 
					//console.log("before do rql : ", items)
					/*results.forEach(function (a) {
						console.log("before do rql ", a.path)
					})*/
					
					items = part.handler(items);
					break;
			}
			//console.log("catch results : ", items)
			start = false;
		}
		items =	utils.arrayUnique(items, "path");
		//console.log("DQ : raw results : ", items)
		if(options.resultType == "full")
			return items;
		var finalRes = [];
		items.forEach(function (r) {
			finalRes.push(r.value);
		})
		return finalRes;
	}

	var globalQuerier = null;
	DQ.query = function(root, path, options){
		if(!globalQuerier)
			globalQuerier = new DQ();
		return globalQuerier.query(root, path, options);
	}
	DQ.createRootNode = function (obj, schema) {
		return {
				_isDQ_NODE_:true,
				value:obj,
				path:"/",
				key:null,
				ancestor:null,
				schema:schema || {},
				depth:0
			}
	}
	return DQ;
})