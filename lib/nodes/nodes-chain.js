/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "../utils", "../errors", "../promise", "../compose", "../protocol", "./query", "./nodes", "../compiler", "../classes", "../utils/logs", "../context", "../sheet", "../validator", "../flatten"], 
function(require, utils, errors, prom, compose, protoc, Querier, nodes, compiler, classes, logs, context, sheets, Validator, flattener) {
"use strict";

	//________________________________________________________________________ VALUES CHAIN
	var NodesChain = classes.Classes(prom.Promise,
		function (state, options) {
			options = options || {};
			var obj = options.obj, schema = options.schema;
			if(obj || schema)
				this._init(obj, schema);
			this._identity = NodesChain;
		}, {
			_init:function(obj, schema){
				//console.log("_init : ", obj);
			    var r = obj;
	            if (obj && obj._deep_query_node_)
	            {
	                if(schema)
	                	obj.schema = schema;
	            }
	            else if(obj && obj._deep_array_)
	            	;
	            else if(schema)
	                obj = nodes.root(obj, schema);
	            this._state.success = obj;
				// console.log("_init end");
			},
			//_nodes: undefined,
		/**
		 * will interpret entries values with context
		 * @example
		 * deep.nodes("hello { name }").interpret({ name:"john" }).val();
		 * //will provide "hello john".
		 * deep.nodes({
		 *     msg:"hello { name }"
		 * })
		 * .query("./msg")
		 * .interpret({ name:"john" })
		 * .logValues()
		 * .equal("hello john");
		 *
		 * @method interpret
		 * @chainable
		 * @param  {object} context the context to inject in strings
		 * @return {NodesChain} this
		 */
		interpret: function(context, value, destructive) {
			var self = this;
			var func = function(s,e) {
				var applyContext = function(context) {
					s = value || s;
					//console.log("chain2.interpret : ", s)
					if(destructive)
					{
						self.transform(function(v){
							return utils.interpret(v.value, context);
						});
						return s;
					}
					if(!s)
						return s;
					if(s._deep_query_node_)
					{
						if(!s.value)
							return s;
						s = s.value;
					}
					if(s.forEach)
					{
						var r = [];
						s.forEach(function(v){
							if(v && v._deep_query_node_)
								v = v.value;
							if(typeof v === 'string')
								r.push(utils.interpret(v, context));
							else
								r.push(v);
						});
						return r;
					}
					else if(typeof s === 'string')
						return utils.interpret(s, context);
					else
						return s;
				};
				if (typeof context === 'string')
					return prom.when(protoc.get(context)).done(applyContext);
				else
					return applyContext(context);
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},
		/**
		 * will pass each entries to callback as argument . same behaviours than classical Array.each.
		 * callback could return promise. the chain will wait any promise before continuing.
		 *
		 * Chain Success injection : the results of callback calls (resolved if promises)
		 * Chain Error injection : the errors of callback calls (rejected if promises)
		 *
		 * @method  each
		 * @chainable
		 * @param callBack could be a retrievable (a String pointing something from store), or a Function, or a treatment (an Object - see treatments in doc)
		 * @return {NodesChain} this
		 */
		each: function(callback) {
			var self = this;
			var func = function(s,e) {
				var applyCallback = function(callBack) {
					var r = [], res;
					if(s && s._deep_query_node_)
						s = s.value;
					if(s && s.forEach)
						s.forEach(function(v){
							if(v && v._deep_query_node_)
								v = v.value;
							res = callback(v);
							r.push(typeof res !== 'undefined'?res:v);
						});
					else
					{
						res = callback(s);
						r.push(typeof res !== 'undefined'?res:s);
					}
					return prom.all(r);
				};
				if (typeof callback === 'string')
					return prom.when(protoc.get(callback))
						.done(applyCallback);
				else
					return applyCallback(callback);
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},
		//______________________________________________________________  RUNS
		/**
		 * transform : loop on entries, apply 'func' with 'args' on each entry : replace entries values with func result
		 * function could return promise.
		 *
		 * - loop on entries : true
		 * - chainable : true
		 * - transparent : false
		 * - promised management : true
		 * - success injected : the array of results of each call on func
		 * - error injected : any error returned (or produced) from a func call
		 *
		 * @method transform
		 * @chainable
		 * @param  {Function} func any function that need to be apply on each chain entry
		 * @param  {Array} args the arguments to pass to 'func'
		 * @return {NodesChain}  the current chain handler (this)
		 */
		map: function(transformer) {
			var self = this;
			var func = function(s, e) {
				if(typeof s === "undefined")
					return s;
				return nodes.map(s,transformer);
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},
		/**
		 * run : loop on entries, apply 'func' with 'args' on each entry (entry become 'this' of func)
		 * function could retrun promise.
		 *
		 * - loop on entries : true
		 * - chainable : true
		 * - transparent : false
		 * - promised management : true
		 * - success injected : the array of results of each call on func
		 * - error injected : any error returned (or produced) from a func call
		 * @method run
		 * @chainable
		 * @param  {Function} func any function that need to be apply on each chain entry
		 * @param  {Array} args the arguments to pass to 'func'
		 * @return {NodesChain}  the current chain handler (this)
		 */
		run: function(funcRef, args) {
			var self = this;
			args = args || [];
			if (funcRef && funcRef.forEach) {
				args = funcRef;
				funcRef = null;
			}
			if(!args.forEach)
				args = [args];
			var doRun = function(node) {
				//console.log("doRun : ", node)
				var type = typeof funcRef;
				if (!funcRef) {
					if(node._deep_query_node_)
					{
						if (typeof node.value !== "function")
							return;
						if (node.ancestor)
							return node.ancestor.value[node.key].apply(node.ancestor.value ,args);
						else
							return node.value.apply({}, args);
					}
					else if(typeof node === 'function')
						return node.apply({}, args);
				} 
				else if (type === 'function')
				{
					if(node._deep_query_node_)
						return funcRef.apply(node.value, args);
					else
						return funcRef.apply(node, args);
				}
				else if (type === 'string')
				{
					var tmp = node;
					if(node._deep_query_node_)
						tmp = node.value;
					if(tmp[funcRef])
						return tmp[funcRef].apply(tmp, args);
					return node;
				}
				else
					return (node._deep_query_node_)?node.value:node;
			};

			var create = function(s, e) {
				if(!s)
					return s;
				if(s._deep_array_)
				{
					var r = [];
					for(var i = 0, len = s.length; i < len; ++i)
						r.push(doRun(s[i]));
					return prom.all(r);
				}
				else
					return doRun(s);
			};
			create._isDone_ = true;
			return self._enqueue(create);
		},
				/**
		 * apply arguments from UP on each entries : will merge objects and array together DEEPLY. see docs and examples.
		 *
		 * synch
		 * inject entries values as chain success.
		 *
		 * @method  up
		 * @chainable
		 * @param objects a list (coma separated - not an array) of objects to apply on each chain entries
		 * @return {NodesChain} this
		 */
		up: function() {
			var args = Array.prototype.slice.call(arguments);
			var self = this;
			var func = function(s, e) {
				if(!s)
					return s;
				return nodes.asyncUps(s, args);
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},
		/**
		 *
		 * apply arguments from BOTTOM on each entries : will merge objects and array together DEEPLY. see docs and examples.
		 *
		 * synch
		 * inject entries values as chain success.
		 * @method  bottom
		 * @chainable
		 * @param objects a list (coma separated - not an array) of objects to apply on each chain entries
		 * @return {NodesChain} this
		 */
		bottom: function() {
			var args = Array.prototype.slice.call(arguments);
			args.reverse();
			var self = this;
			var func = function(s, e) {
				if(!s)
					return s;
				return nodes.asyncBottoms(s, args);
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},
		/**
		 *
		 * apply arguments from BOTTOM on each entries : will merge objects and array together DEEPLY. see docs and examples.
		 *
		 * synch
		 * inject entries values as chain success.
		 * @method  bottom
		 * @chainable
		 * @param objects a list (coma separated - not an array) of objects to apply on each chain entries
		 * @return {NodesChain} this
		 */
		sheet: function() {
			var args = Array.prototype.slice.call(arguments);
			var self = this;
			var func = function(s, e) {
				return nodes.sheet(s, args);
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},
		/**
		 * will perform FULL backgrounds application on chain entries. (see backgrounds documentation)
		 * @chainable
		 * @async
		 * @method  flatten
		 * @return {NodesChain} this
		 * @example
			var a = {
				obj:{
					first:true
				},
				myFunc:function(){
					console.log("base myFunc");
					this.obj.a = true;
				}
			}
			var b = {
				_backgrounds:[a],
				obj:{
					second:true
				},
				myFunc:deep.compose.after(function()
				{
					console.log("myFunc of b : ", this)
					this.obj.b = true;
				})
			}

			deep.nodes({})
			.bottom(b)
			.flatten()
			.run("myFunc")
			.query("./obj")
			.equal({
				first:true,
				second:true,
				a:true,
				b:true
			});
		 */
		flatten:function(exclude) {
			var self = this;
			var doFlatten = function(s) {
				return nodes.flatten(s, exclude);
			};
			doFlatten._isDone_ = true;
			return self._enqueue(doFlatten);
		},
		/**
		 * set entries properties by path.
		 *
		 * synch
		 * inject setted values as chain success
		 *
		 * @method  setByPath
		 * @chainable
		 * @param {string} path  a slash delimitted path (e.g. "/my/property")
		 * @param {object|primitive} obj the value to assign (could be a retrievable strings (see ressource pointer))
		 */
		set: function(path, obj) {
			var self = this;
			var func = function(s) {
				var applySet = function(obj) {
					if(!s)
						return s;
					if(s._deep_query_node_)
						utils.toPath(s.value, path, obj, '/');
					else if(s._deep_array_)
						s.forEach(function(v){
							utils.toPath(v.value, path, obj, '/');
						});
					else
						utils.toPath(s, path, obj, '/');
					return s;
				};
				if (typeof obj === 'string')
					return prom.when(protoc.get(obj))
						.done(applySet);
				return applySet(obj);
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},
		/**
		 * take current entries parents (if any) as new entries.
		 *
		 * inject new entries values as chain success.
		 *
		 * asynch
		 *
		 * @method  parents
		 * @chainable
		 * @param boolean errorIfEmpty : if true and no parents was selected : throw an error
		 * @return {NodesChain}
		 */
		parent: function() {
			var self = this;
			var func = function(s,e) {
				if(s._deep_query_node_)
					return s.ancestor;
				var res = [];
				if(s._deep_array_)
					s.forEach(function(r) {
						if (r.ancestor)
							res.push(r.ancestor);
					});
				if (res.length > 0)
					res = utils.arrayUnique(res, "path");
				return res;
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},
		/**
		 * reverse entries order
		 *
		 * inject entries values as chain success.
		 *
		 * @chainable
		 * @method  reverse
		 * @return {NodesChain} this
		 */
		reverse: function() {
			var self = this;
			var func = function(s, e) {
				if(!s)
					return s;
				if (s.forEach && s.length)
					s.reverse();
				return s;
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},
			/**
		 *
		 *	synch
		 *
		 * replace queried entries properties by new value and inject replaced properties as chain success.
		 *
		 * @example

			var a = {
				aString : "Hello",
				anInt : 5,
				anArray : ["1","2","3"],
				anObject : {
					anArray : ["4","5","6"],
					aString : "World"
				}
			}
			deep.nodes(a)
			.replace("./anArray/1","replaceString")
			.equal({
				aString : "Hello",
				anInt : 5,
				anArray : ["1","replaceString","3"],
				anObject : {
					anArray : ["4","5","6"],
					aString : "World"
				}
			});

		 * @method  replace
		 * @param  {string} what a query to select properties to replace
		 * @param  {object} by  any value to assign (could be a retrievable string)
		 * @chainable
		 * @param  {object} options (optional) : it is the options object for the protoc.get which will eventually retrieve the 'by' object (see protoc.get)
		 * @return {NodesChain} this
		 */
		replace: function(what, by, options) {
			var self = this;
			var func = function(s, e) {
				var doReplace = function(by) {
					if(!s)
						return s;
					if(s._deep_array_)
						s.forEach(function(node){
							Querier.replace(node, what, by);
						});
					else
						Querier.replace(s, what, by);
					return s;
				};
				if (typeof by === 'string')
					return prom.when(protoc.get(by, options))
						.done(doReplace);
				return doReplace(by);
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},

		/**
		 *
		 * remove queried properties from entries and inject removed properties as chain success.
		 * @example
			var a = {
				aString : "Hello",
				anInt : 5,
				anArray : ["1","2","3"],
				anObject : {
					anArray : ["4","5","6"],
					aString : "World"
				}
			}

			deep.nodes(a)
			.remove("./anArray/1").log().valuesEqual([{
				aString : "Hello",
				anInt : 5,
				anArray : ["1","3"],
				anObject : {
					anArray : ["4","5","6"],
					aString : "World"
				}
			}]);

			@example

			var obj = {
				email: 'test@test.com',
				password: 'test54',
				id: '51013dec530e96b112000001'
			}
			var schema = {
				properties:
				{
					id: { type: 'string', required: false, minLength: 1 },
					email: { type: 'string', required: true, minLength: 1 },
					password: { type: 'string', required: true, "private": true }
				},
				additionalProperties: false
			}

			deep.nodes(obj, schema)
			.remove(".//*?_schema.private=true")
			.equal({
			email: 'test@test.com',
			id: '51013dec530e96b112000001'
			});

		 * @chainable
		 * @method  remove
		 * @param  {string} what a query to select properties to replace
		 * @return {NodesChain} this
		 */
		remove: function(what) {
			var self = this;
			var func = function(s) {
				if(!s)
					return s;
				if(s._deep_array_)
					s.forEach(function(node){
						Querier.remove(node, what);
					});
				else
					Querier.remove(s, what);
				return s;
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},

		copy: function() {
			var self = this;
			var func = function(s) {
				if(!s)
					return s;
				if(s._deep_array_)
					return s.map(function(node){
						return nodes.clone(node);
					});
				else
					return nodes.clone(node);
				return utils.copy(s);
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},

		/**
		 *  validate each chain entry against provided schema (if any) or against their own schemas (i.e. the entry schema) (if any).
		 *  Provided schema could be a deep json pointer (e.g. json::/my/path/to/schema.json or user::schema.post)
		 *
		 *
		 *
		 *	Chain Success injection : the valid report
		 *	Chain Error injection : an error, status 412, containing the unvalid report (or any errors from schema )
		 *
		 * @example
		 *
		 * deep.nodes(1,{ type:"numbder"}).validate().log();
		 *
		 * @example
		 *
		 * deep.nodes(1).validate({ type:"numbder"}).log();
		 *
		 * @example
		 *
		 * deep.nodes({
		 *     //...
		 * }).validate("user::schema").log();
		 *
		 * @method  validate
		 * @parame {Object,String} schema (optional) a schema object or a schema reference (deep json pointer)
		 * @chainable
		 * @return {NodesChain}     this
		 */
		validate: function(schema) {
			var self = this;
			var func = function(s, e) {
				var runSchema = function(schema) {
					var report;
					if(s._deep_array_)
					{
						report = {
							valid: true,
							reports: []
						};
						s.every(function(e) {
							var rep = Validator.validate(e.value, schema || e.schema || {});
							report.reports.push(rep);
							if (!rep.valid)
								report.valid = false;
						});
					}
					else if(s._deep_query_node_)
						report = Validator.validate(s.value, schema || s.schema || {});
					else
						report = Validator.validate(s, schema || {});

					if(!report.valid)
						return errors.PreconditionFail("deep.validate failed ! ", report);
					return s;
				};
				if (typeof schema === 'string')
					return prom.when(protoc.get(schema))
					.done(runSchema);
				return runSchema(schema);
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},
		/**
		 * if no callBack is present : just return the FIRST value of entries. It's a chain end handle.
		 * If callback is provided : the FIRST entry  value will be passed as argument to callback.
		 *     and so th chain could continue : the return of this handle is the deep handler.
		 *
		 * transparent true
		 *
		 * @method  val
		 * @param callBack could be a retrievable (a String pointing something from store), or a Function, or a treatment (an Object - see treatments in doc)
		 * @chainable
		 * @return {NodesChain|entry.value} this or val
		 */
		first: function() {
			var self = this;
			var func = function(s, e) {
				if(!s)
					return s;
				if(s.forEach)
					return s[0];
				return s;
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},
		// ________________________________________ READ ENTRIES
		/**
		 *
		 * if no callBack is present : just return the FIRST value of entries. It's a chain end handle.
		 * If callback is provided : the FIRST entry  value will be passed as argument to callback.
		 *     and so th chain could continue : the return of this handle is the deep handler.
		 *
		 * transparent true
		 *
		 * @method  val
		 * @param callBack could be a retrievable (a String pointing something from store), or a Function, or a treatment (an Object - see treatments in doc)
		 * @chainable
		 * @return {NodesChain|entry.value} this or val
		 */
		last: function() {
			var self = this;
			var func = function(s, e) {
				if(!s)
					return s;
				if(s.forEach)
					return s[s.length-1];
				return s;
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},

		/**
		 * exec :  call 'func' with 'args' (the 'this' of the function isn't modified)
		 * function could retruen promise.
		 *
		 * - loop on entries : false
		 * - chainable : true
		 * - transparent : false
		 * - promised management : true
		 * - success injected : the result of the call on func
		 * - error injected : any error returned (or produced) from func call
		 *
		 *
		 * @method  exec
		 * @chainable
		 * @param  {Function} func any function that need to be apply on each chain entry
		 * @param  {Array} args the arguments to pass to 'func'
		 * @return {NodesChain}  the current chain handler (this)
		 */
		exec: function(func, args) {
			var self = this;
			var create = function() {
				return func.apply({}, args);
			};
			create._isDone_ = true;
			return self._enqueue(create);
		},
				/**
		 * Apply the query on EACH chain entries and concatened all the results to form new chain entries.
		 *
		 *
		 * inject queried results as chain success
		 *
		 * @method  query
		 * @chainable
		 * @param  {string} q the deep-query. Could be an ARRAY of Queries : the result will be the concatenation of all queries on all entries
		 * @param  {boolean} errorIfEmpty : if true : throw an error if query return nothing
		 * @return {NodesChain} this (chain handler)
		 */
		query: function(q) {
			var self = this;
			var func = function(s, e) {
				// console.log("deep chain query : start : ", s, e);
				if(!s)
					return s;
				if (q[0] === "?")
					q = "./*" + q;
				var r;
				if(s._deep_array_)
				{
					var root = null;
					if(q[0] == '/')
					{
						s.some(function(n){  // normally the first root should be the good one.
							root = n.root;
							return root;
						});
						if(root)
							s = root;
					}
					if(!root)
					{
						r = [];
						s.forEach(function(n){
							r = r.concat(Querier.query(n, q, { fullOutput:true }));
						});
						if(r.length)
							r = utils.arrayUnique(r, "path");
						r._deep_array_ = true;
						return r;
					}
				}
				r = Querier.query(s, q, { fullOutput:true });
				if(typeof r === 'undefined')
					return prom.Undefined;
				if(r._deep_query_node_)
					return r;
				r._deep_array_ = true;
				return r;
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},
		/*root:function(){
			var self = this;
			var func = function(s, e) {
				if(!s)
					return s;
				if(s._deep_query_node_)
					return s.root || s;
				if(s._deep_array_)
				{				
					var r = s.map(function(n){
						return n.root || n;
					});
					return utils.arrayUnique(r, "path");
				}
				return s;
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},*/
		//____________________________________________________________________  LOAD
		/**
		 * will seek in entries after any retrievable string OR executable functions : and will replace references by loaded/returned content.
		 *
		 * if context is provided : will try to 'interpret' (see .interpret) strings before retrieving them.
		 *
		 * Chain Success injection : array of loaded results
		 *
		 * @method deepLoad
		 * @param  {object} context (optional) a context to interpret strings before retrieving
		 * @chainable
		 * @return {NodesChain} this
		 */
		deepLoad: function(context, destructive, excludeFunctions) {
			var self = this;
			if (typeof destructive === 'undefined')
				destructive = false;
			var func = function(s, e) {
				if(!s)
					return s;
				if(s._deep_array_)
				{
					var p = [];
					s.forEach(function(e){
						p.push(nodes.deepLoad(s, context, destructive, excludeFunctions));
					});
					return prom.all(p)
					.done(function(){
						if(destructive)
							return s;
					});
				}
				if(s._deep_query_node_)
					return nodes.deepLoad(s, context, destructive, excludeFunctions);
				return nodes.deepLoad(nodes.root(s), context, destructive, excludeFunctions)
					.done(function(suc){
						return suc.value;
					});
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},
		//______________________________________ ENTRIES ARRAY MANIPULATION

		/**
		 * sort chain values.
		 * @method sort
		 * @chainable
		 * @return {NodesChain} this
		 */
		sort: function() {
			var args = arguments;
			var self = this;
			var func = function(s, e) {
				if(!s)
					return s;
				if (args.length === 0)
					args = ["+"];
				if (s.forEach)
					return utils.sort(s, args);
				return s;
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},

		val:function(callback){
			var self = this;
			var func = function(s, e) {
				if(!callback)
					return nodes.val(s); 
				return callback(nodes.val(s));
			};
			func._isDone_ = true;
			return self._enqueue(func);
		}
	});
	//_________________________________________________
	NodesChain.add = function (name, func) {
		NodesChain._up({ name : func });
		return NodesChain;
	};
	NodesChain.start = function(obj, schema, options) {
		// console.log("CHAIN START ", obj)
		options = options || {};
		var h = new NodesChain(options._state || null, options),
			d;
		try {
			if (typeof obj === 'string')
				obj = protoc.get(obj, options);

			if (typeof schema === 'string')
				schema = protoc.get(schema, options);

			if (!schema && obj && (obj.then || obj.promise))
				d = prom.when(obj)
					.done(function(res) {
						h._init(res);
						h.resolve();
					});
			if (schema && (schema.then || schema.promise))
				if (obj && (obj.then || obj.promise))
					d = prom.all([obj, schema])
						.done(function(res) {
							h._init(res[0], res[1]);
							h.resolve();
						});
				else
					d = prom.when(schema)
						.done(function(res) {
							h._init(null, res);
							h.resolve();
						});
			if (d)
				d.fail(function(error) {
					h.reject(error);
				});
			else {
				h._init(obj, schema);
				h.resolve();
			}
		} catch (error) {
			//console.log("internal chain start error : ", error);
			h.reject(error);
		}
		return h;
	};

	/**
	 * deep chain identity method
	 * @param  {*} val     The value injected as success (optional).
	 *                     Could be a protocoled ressource reference (e.g. json::myfile.json).
	 *                     Will be load before injection.
	 * @param  {Object} schema  Optional : the json-schema associate
	 * @param  {Object} options Optional (internal use only for the moment)
	 * @return {deep.NodesChain}  a deep.NodesChain holding the success (or error if load fail).
	 */
	prom.Promise._up({
		nodes : function(val, schema, options) {
			options = options || {};
			var h = new NodesChain(this._state, options);
			var self = this;
			var func = function(s, e) {
				return NodesChain.start(val || s, schema, options);
			};
			func._isDone_ = true;
			this._enqueue(h);
			h._enqueue(func);
			return h;
		}
	});

	return NodesChain;
});