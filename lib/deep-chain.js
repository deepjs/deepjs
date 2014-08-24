/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "./utils", "./errors", "./promise", "./compose", "./protocol", "./query", "./nodes", "./compiler"], 
function(require, utils, errors, prom, compose, protoc, querier, nodes, compiler) {
"use strict";

	//________________________________________________________________________ VALUES CHAIN
	var DeepChain = compiler.Classes(prom.Promise,
		function (state, options) {
			options = options || {};
			var obj = options.obj, schema = options.schema;
			if(obj || schema)
				this._init(obj, schema);
			this._identity = DeepChain;
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
		 * deep("hello { name }").interpret({ name:"john" }).val();
		 * //will provide "hello john".
		 * deep({
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
		 * @return {DeepChain} this
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
		 * @return {DeepChain} this
		 */
		each: function(callback) {
			var self = this;
			var func = function(s,e) {
				var applyCallBackOrTreatment = function(callBack) {
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
						.done(applyCallBackOrTreatment);
				else
					return applyCallBackOrTreatment(callback);
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
		 * @return {DeepChain}  the current chain handler (this)
		 */
		transform: function(transformer) {
			var self = this;
			var func = function(s, e) {
				var applyTransformer = function(transformer) {
					if(!s)
						return transformer(s);
					else if(s._deep_query_node_)
					{
						s.value = transformer(s)
						if(s.ancestor)
							s.ancestor.value[s.key] = s.value;
						return s.value;
					}
					else if(s._deep_array_)
						return nodes.transform(s, transformer);
					else if(s.forEach)
					{
						var r = [];
						for(var i = 0, len = s.length; i < len; ++i)
						{
							s[i] = transformer(s[i]);
							r.push(s[i]);
						}
						return prom.all(r);
					}
					else
						return transformer(s);
				};
				if (typeof transformer === 'string')
					return prom.when(protoc.get(transformer))
						.done(applyTransformer);
				else
					return applyTransformer(transformer);
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
		 * @return {DeepChain}  the current chain handler (this)
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
		 * @return {DeepChain} this
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
		 * @return {DeepChain} this
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
		 * @return {DeepChain} this
		 */
		sheet: function() {
			var args = Array.prototype.slice.call(arguments);
			var self = this;
			var func = function(s, e) {
				if(!s)
					return s;
				return prom.when(protoc.getAll(args))
				.done(function(objects) {
					objects = utils.compile.apply({}, objects);
					if(s._deep_array_)
					{
						var promises = [];
						s.forEach(function(result) {
							promises.push(sheets.sheet(objects, result));
						});
						return prom.all(promises)
						.done(function(){ return s; });
					}
					else
						return sheets.sheet(objects, s);
				});
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},
		/**
		 * will perform FULL backgrounds application on chain entries. (see backgrounds documentation)
		 * @chainable
		 * @async
		 * @method  flatten
		 * @return {DeepChain} this
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

			deep({})
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
		flatten:function() {
			var self = this;
			var doFlatten = function(s, e) {
				if(!s)
					return s;
				if(s._deep_array_)
				{
					var alls = [];
					s.forEach(function(node) {
						if (!node.value || typeof node.value !== 'object')
							return;
						alls.push(flattener.flatten(node));
					});
					if (alls.length === 0)
						return s;
					return prom.all(alls)
						.done(function() {
							return s;
						});
				}
				var tmp = s;
				if(s._deep_query_node_)
					tmp = s.value;
				return flattener.flatten(tmp);
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
			var func = function(s, e) {
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
		 * @return {DeepChain}
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
		 * @return {DeepChain} this
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
			deep(a)
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
		 * @return {DeepChain} this
		 */
		replace: function(what, by, options) {
			var self = this;
			var func = function(s, e) {
				var doReplace = function(by) {
					if(!s)
						return s;
					if(s._deep_array_)
						s.forEach(function(node){
							utils.replace(node, what, by);
						});
					else
						utils.replace(s, what, by);
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

			deep(a)
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

			deep(obj, schema)
			.remove(".//*?_schema.private=true")
			.equal({
			email: 'test@test.com',
			id: '51013dec530e96b112000001'
			});

		 * @chainable
		 * @method  remove
		 * @param  {string} what a query to select properties to replace
		 * @return {DeepChain} this
		 */
		remove: function(what) {
			var self = this;
			var func = function(s,e) {
				if(!s)
					return s;
				if(s._deep_array_)
					s.forEach(function(node){
						utils.remove(node, what);
					});
				else
					utils.remove(s, what);
				return s;
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},

		copy: function() {
			var self = this;
			var func = function(s,e) {
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
		 * deep(1,{ type:"numbder"}).validate().log();
		 *
		 * @example
		 *
		 * deep(1).validate({ type:"numbder"}).log();
		 *
		 * @example
		 *
		 * deep({
		 *     //...
		 * }).validate("user::schema").log();
		 *
		 * @method  validate
		 * @parame {Object,String} schema (optional) a schema object or a schema reference (deep json pointer)
		 * @chainable
		 * @return {DeepChain}     this
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
							var rep = deep.validate(e.value, schema || e.schema || {});
							report.reports.push(rep);
							if (!rep.valid)
								report.valid = false;
						});
					}
					else if(s._deep_query_node_)
						report = deep.validate(s.value, schema || s.schema || {});
					else
						report = deep.validate(s, schema || {});

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
		 * @return {DeepChain|entry.value} this or val
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
		 * @return {DeepChain|entry.value} this or val
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
		 * @return {DeepChain}  the current chain handler (this)
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
		 * @return {DeepChain} this (chain handler)
		 */
		query: function(q) {
			var self = this;
			var func = function(s, e) {
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
							r = r.concat(deep.query(n, q, { fullOutput:true }));
						});
						if(r.length)
							r = utils.arrayUnique(r, "path");
						r._deep_array_ = true;
						return r;
					}
				}
				r = deep.query(s, q, { fullOutput:true });
				if(typeof r === 'undefined')
					return deep.Undefined;
				if(r._deep_query_node_)
					return r;
				r._deep_array_ = true;
				return r;
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},

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
		 * @return {DeepChain} this
		 */
		deepLoad: function(context, destructive, excludeFunctions) {
			var self = this;
			if (typeof destructive === 'undefined')
				destructive = false;
			var func = function(s, e) {
				if(!s)
					return s;
				if(s._deep_array_)
					return nodes.deepLoad(s, context, destructive, excludeFunctions)
					.done(function(){
						return s;
					}, destructive);
				if(s._deep_query_node_)
					return nodes.deepLoad([s], context, destructive, excludeFunctions)
					.done(function(suc){
						if(destructive)
							return s;
						return suc.shift();
					});
				return nodes.deepLoad([deep.nodes.root(s)], context, destructive, excludeFunctions)
					.done(function(suc){
						if(destructive)
							return s;
						return suc.shift();
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
		 * @return {DeepChain} this
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
		//__________________________________________________________ MAP
		/**
		 * It's the way of performing a SQL JOIN like between two objects.
		 * Objects could be retrievables.
		 *
		 * take current entries, seek after localKeys, use it to get 'what' with foreignKey=localKey, and finnaly store result at 'whereToStore' path in                  current entries values.
		 *
		 * @example

	deep([{ title:"my title", id:1}, { title:"my title 2", id:2}])
	.mapOn([
			{itemId:1, value:true},
			{itemId:2, value:"133"},
			{itemId:2, value:"hello"}
		],
		"id","itemId","linkeds")
		.equal([
		{
			title:"my title",
			id:1,
			linkeds:{itemId:1, value:true}
		},
		{
			title:"my title 2",
			id:2,
			linkeds:[
				{itemId:2, value:"133"},
				{ itemId:2, value:"hello"}
			]
		}
	]);
		 *
		 * @method mapOn
		 * @chainable
		 * @param  {Collection|retrievable_string} what
		 * @param  {string} localKey  the name of the localKey to match with Collection items
		 * @param  {string} foreignKey  the name of the foreignKey to match with current entries
		 * @param  {string} whereToStore the path where save map result in each entries
		 * @return {DeepChain} this
		 */
		mapOn: function(what, localKey, foreignKey, whereToStore) {
			var self = this;
			var doMap = function(s, what, localKey, foreignKey, whereToStore) {
				var map = {};
				what.forEach(function(w) {
					//console.log("mapOn : w :", w)
					if (w === null)
						return;
					var val = w[foreignKey];
					if (typeof map[val] !== 'undefined') {
						if (map[val].forEach)
							map[val].push(w);
						else
							map[val] = [map[val], w];
					} else
						map[val] = w;
				});
				var finaliseNode = function(entry) {
					if (map[entry.value[localKey]])
						entry.value[whereToStore || localKey] = map[entry.value[localKey]];
					if(entry.ancestor)
						entry.ancestor.value[entry.key] = entry.value;
				};
				if(s._deep_array_)
					s.forEach(finaliseNode);
				else if(s.forEach)
					s.forEach(function(entry){
						if (map[entry[localKey]])
							entry[whereToStore || localKey] = map[entry[localKey]];
					});
				else if(s._deep_query_node_)
					finaliseNode(s);
				else if (map[s[localKey]])
					s[whereToStore || localKey] = map[s[localKey]];
				return s;
			};
			var func = function(s, e) {
				if (!s)
					return s;
				if (typeof what === 'string') {
					var parsed = utils.parseRequest(what);
					//cloned.logValues();
					//console.log("____________________________ mapon :  query : ","./" + localKey);
					var foreigns;
					if(s._deep_array_)
						foreigns = querier.query(s, "./*/value/" + localKey).join(",");
					else if(s.forEach)
						foreigns = querier.query(s, "./*/" + localKey).join(",");
					else
						foreigns = querier.query(s, "./" + localKey);
					//console.log("_____________ foreigns : ", foreigns);
					var constrain = foreignKey + "=in=(" + foreigns + ")";
					if (parsed.uri === '!')
						parsed.uri = "";
					if (parsed.uri.match(/(\/\?)|^(\?)/gi))
						parsed.uri += "&" + constrain;
					else
						parsed.uri += "?" + constrain;
					//console.log("mapOn : parsedUri with constrains : ",parsed.uri);
					if (parsed.store !== null)
						return protoc.get(parsed)
							.done(function(results) {
								results = [].concat(results);
								return doMap(s, results, localKey, foreignKey, whereToStore);
							});
					else
						return errors.Internal("deep.mapOn need array as 'what' : provided : " + JSON.stringify(what));
				} else
					return doMap(s, what, localKey, foreignKey, whereToStore);
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},

		/**
		 * retrieve relations described in schema links.
		 *
		 * Inject as success in chain an object that hold each relation, their result and the associated (parsed) request object
		 *
		 *
		 *
		 *
		 * @method getRelations
		 * @chainable
		 * @example
		 * var schema3 = {
				properties:{
					id:{ type:"string", required:false, indexed:true },
					label:{ type:"string" },
					plantId:{ type:"string" },
					userId:{ type:"string" }
				},
				links:[
					{
						href:"plant::{ plantId }",
						rel:"plant"
					},
					{
						href:"user::{ userId }",
						rel:"user"
					}
				]
			}
			//____________________________
			deep({
				plantId:"e1",
				userId:"e1",
				label:"hello"
			}, schema3)
			.getRelations("plant", "user")
			.log();

		 * @param a list of string arguments that gives which relation to retrieve
		 * @return {DeepChain} this
		 */
		getRelations: function() {
			var self = this;
			var relations = utils.argToArr.call(arguments);
			var func = function(s, e) {
				if(!s)
					return s;
				var alls = [];
				var doGet = function(entry) {
					if (!entry.schema || !entry.schema.links)
						return;
					var r = {
						value: entry.value,
						schema: entry.schema
					};
					querier.query(entry.schema.links, "./*?rel=in=(" + relations.join(",") + ")")
						.forEach(function(relation) {
							//console.log("getRelations : got : ", relation)
							var path = utils.interpret(relation.href, entry.value);
							var parsed = utils.parseRequest(path);
							var wrap = {
								rel: relation,
								href: parsed
							};
							r[relation] = wrap;
							alls.push(protoc.get(parsed, {
								wrap: wrap
							}));
						});
				}
				if(s._deep_array_)
					s.forEach(doGet);
				else if(s._deep_query_node_)
					doGet(s);
				if (alls.length)
					return prom.all(alls);
				return null;
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},

		/**
		 * map relations in current entries values
		 *
		 * @method mapRelations
		 * @chainable
		 * @example
		 * var schema3 = {
				properties:{
				id:{ type:"string", required:false, indexed:true },
				label:{ type:"string" },
				plantId:{ type:"string" },
				userId:{ type:"string" }
				},
				links:[
				{
					href:"plant::{ plantId }",
					rel:"plant"
				},
				{
					href:"user::{ userId }",
					rel:"user"
				}
				]
				}
				deep({
				plantId:"e1",
				userId:"e1",
				label:"hello"
				}, schema3)
				.mapRelations({
				user:"relations.user",
				plant:"relations.plant"
			})
			.logValues();
		 * @param  {Object} map        the map (see examples)
		 * @param  {String} delimitter (optional) the paths delimitter
		 * @return {DeepChain}       this
		 */
		mapRelations: function(map, delimitter) {
			if (!delimitter)
				delimitter = ".";
			var self = this;
			var relations = [];
			for (var i in map)
				relations.push(i);
			//console.log("mapRelations :  relations : ", relations);
			var func = function(s, e) {
				if(!s || (!s._deep_query_node_ && !s._deep_array_))
					return s;
				var doMap = function(entry) {
					if (!entry.schema || !entry.schema.links)
						return;
					var alls = [];
					querier.query(entry.schema.links, "./*?rel=in=(" + relations.join(",") + ")")
						.forEach(function(relation) {
							//console.log("do map relations on : ", relation);
							var path = utils.interpret(relation.href, entry.value);
							alls.push(protoc.get(path, {
								defaultProtocole: "json",
								wrap: {
									path: map[relation.rel]
								}
							}));
						});
					var d = prom.all(alls)
						.done(function(results) {
							//console.log("mapRelations : results : ");
							//console.log(JSON.stringify(results));
							results.forEach(function(r) {
								//console.log("do : ", r, " - on : ", entry.value)
								utils.toPath(entry.value, r.path, r.result, delimitter);
							});
							return results;
						});
					promises.push(d);
				};
				var promises = [];
				if(s._deep_array_)
					s.forEach(doMap);
				else
					doMap(s);
				if (!promises.length)
					return s;
				return prom.all(promises)
					.done(function() {
						return s;
					});
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
	DeepChain.add = function (name, func) {
		DeepChain.prototype[name] = func;
		return DeepChain;
	};
	DeepChain.add("init", function() {
		var args = arguments;
		var self = this;
		var func = function(s, e) {
			if(!s)
				return s;
			if(s._deep_array_)
			{
				var alls = [];
				s.forEach(function(v) {
					v = v.value;
					if (typeof v.init === "function")
						alls.push(v.init.apply(v, args));
					else
						alls.push(v);
				});
				return prom.all(alls);
			}
			var tmp = s;
			if(s._deep_query_node_)
				tmp = s.value;
			if(typeof tmp !== 'object')
				return s;
			if (typeof tmp.init === "function")
				return tmp.init.apply(tmp, args);
			return s;
		};
		func._isDone_ = true;
		return self._enqueue(func);
	});
	return DeepChain;
});