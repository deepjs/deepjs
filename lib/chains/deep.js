/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
"use strict";
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "../utils", "../errors", "../promise", "../compose", "../protocol", "../query", "../nodes"], 
function(require, utils, errors, prom, compose, protoc, querier, nodes) {

	var chains = {};
	//________________________________________________________________________ VALUES CHAIN
	chains.Chain = compose.Classes(prom.Promise,
		function (state, options) {
			options = options || {};
			var obj = options.obj, schema = options.schema;
			if(obj)
				this._state.success = this._init(obj, schema);
			this._state.queried = this._state.queried || false;
			this._identity = chains.Chain;
		}, {
			_init:function(obj, schema){
				//console.log("_init");
			    var r = obj;
	            if (obj && obj._deep_query_node_)
	            {
	                r = obj.value;
	                this._state.nodes = [obj];
	            }
	            else
	                this._state.nodes = [deep.nodes.root(obj, schema)];
            	this._state.root = this._state.nodes[0];
            	this._state.success = r;
				// console.log("_init end");
            	return r;
			},
			_nodes: undefined,
			_forward:compose.around(function(old){
				return function(clone){
					var cloned = old.call(this, clone);
					cloned.nodes = (clone?this._state.nodes.slice():this._state.nodes);
					cloned.queried = this._state.queried;
					cloned.root = this._state.root;
					return cloned;
				}
			}),
			/**
			 * save current chain position. it means that it will save
			 * - current entries
			 * - current success and errors
			 * - current store (if any) in private queue before continuing.
			 *
			 *  asynch
			 *  transparent true
			 *
			 * @method  position
			 * @param  name the name of position (its id/label)
			 * @param  options optional object (no options for the moment)
			 * @return {chains.Chain} this
			 */
			/*position: function chainPosition(name, options) {
				var self = this;
				var func = function(s, e) {
					chains.chain.position(self, name, options);
				};
				func._isDone_ = true;
				addInChain.call(this, func);
				return this;
			},*/
			/**
			 * go back to a previously saved position (see .position).
			 * If no name is provided : go back to last position (if any)
			 *
			 * throw an error if no position founded.
			 *
			 * inject chain values as chain success
			 *
			 * @method  back
			 * @chainable
			 * @param  {String} name the name of the last position asked
			 * @param   {Object}    options   (optional - no options for the moment)
			 * @return {chains.Chain}
			 */
			/*back: function chainBack(name, options) {
				var self = this;
				var func = function(s, e) {
					var position = null;
					if (name) {
						var pos = self.positions.concat([]),
							ok = false;
						while (true && pos.length > 0) {
							position = pos.pop();
							if (position.name == name) {
								ok = true;
								break;
							}
						}
						if (pos.length === 0 && !ok)
							position = null;
					} else
						position = self.positions[self.position.length - 1];
					if (!position)
						return errors.Internal("chain handler error : no positions to go back with name : " + name);
					self._state.nodes = position.entries;
					self._store = position.store;
					self._state.queried = position.queried;
					return position;
				};
				func._isDone_ = true;
				addInChain.call(this, func);
				return this;
			}*/
		


		/**
		 *
		 * log current chain entries  with optional title
		 *
		 * full option means print full entry in place of just entry.value
		 * pretty option means print pretty json (indented)
		 *
		 * transparent true
		 *
		 * @method  logValues
		 * @chainable
		 * @param title (optional) the title you want
		 * @param options (optional) could contain : 'full':true|false, 'pretty':true|false
		 * @return {chains.Chain} this
		 */
		logValues: function(title, options) {
			var self = this;
			options = options || {};
			var func = function(success, error) {
				console.log(title || "deep.logValues : ", " (" + self._state.nodes.length + " values)");
				self._state.nodes.forEach(function(e) {
					var val = e;
					var entry = null;

					if (!options.full)
						val = e.value;
					if (options.pretty)
						val = JSON.stringify(val, null, ' ');
					console.log("\t- entry : (" + e.path + ") : ", val);
				});
			};
			return self._enqueue(func);
		},
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
		 * @return {chains.Chain} this
		 */
		interpret: function(context) {
			var self = this;
			var func = function() {
				var applyContext = function(context) {
					return chains.chain.transform(self, function(v) {
						return utils.interpret(v, context);
					});
				};
				if (typeof context === 'string')
					return prom.when(protoc.get(context)).done(applyContext);
				else
					return applyContext(context);
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
		 * @return {chains.Chain} this
		 */
		deepLoad: function(context, destructive, excludeFunctions) {
			var self = this;
			if (typeof destructive === 'undefined')
				destructive = false;
			var func = function(s, e) {
				return nodes.deepLoad(self._state.nodes, context, destructive, excludeFunctions)
					.done(function(res) {
						if (!self._state.queried && res.shift)
							return res.shift();
						return res;
					});
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},
		/**
		 *
		 * if request is provided :
		 *     try to retrieve 'request' and simply inject result in chain. request could be a ressource pointer OR a function to call to get something (maybe a promise tht will be manage before continuing chain)
		 * else
		 *     will try to retrieve any entry.value strings (will not seek deeply) and replace associated entries values by loaded result.
		 *     OR if entry.value is an object : look if there is any .load() function in it. If so : fire it.
		 *
		 * if context is provided : will try to 'interpret' (see .interpret) strings before retrieving them.
		 *     (on request or entries values)
		 *
		 * Chain success injection : array of loaded content.
		 *
		 * @method load
		 * @param  {string} request (optional)
		 * @param  {object} context (optional) the context to interpret strings
		 * @chainable
		 * @return {chains.Chain} this
		 */
		load: function(context, destructive) {
			var self = this;
			if (typeof destructive === 'undefined')
				destructive = false;
			var func = function(s, e) {
				//console.log("self.load : queried : ", self._state.queried, " - nodes : ", self._state.nodes);
				if (!self._state.queried && self._state.nodes[0] && self._state.nodes[0].value instanceof Array) {
					self._state.nodes = querier.query(self._state.nodes[0], "./*", {
						resultType: "full"
					});
					self._state.queried = true;
				}
				var res = [];

				var doLoad = function(v) {
					//console.log("deep.load : node : ",v);
					if (!v.value)
						return v.value;
					if (v.value.load)
						return prom.when(callFunctionFromValue(v, "load", [context]));
					else if (typeof v.value === 'string') {
						var val = v.value;
						if (context)
							val = utils.interpret(val, context);
						return prom.when(protoc.get(val, {
							entry: v
						}))
							.done(function(r) {
								//console.log("load res : ",r)
								if (destructive) {
									if (v.ancestor)
										v.ancestor.value[v.key] = r;
									v.value = r;
								}
								return r;
							});
					} else
						return v.value;
				};
				self._state.nodes.forEach(function(n) {
					res.push(doLoad(n));
				});
				return prom.all(res)
					.done(function(res) {
						//console.log("load res : ", res)
						if (!self._state.queried)
							return res.shift();
						return res;
					});
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},
		// ________________________________________ READ ENTRIES
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
		 * @return {chains.Chain} this (chain handler)
		 */
		query: function() {
			var self = this;
			var args = arguments;
			var func = function(s, e) {
				var nodes = [];
				var values = [];
				var straight = false;
				for (var i = 0; i < args.length; ++i) {
					var q = args[i];
					if (q[0] === "?")
						q = "./*" + q;
					if (q[0] === '/') {
						var r = querier.query(self._state.root, q, {
							resultType: "full"
						});
						if (r && r._deep_query_node_)
							straight = true;
						if (typeof r !== 'undefined')
							nodes = nodes.concat(r);
					} else
						for (var j = 0; j < self._state.nodes.length; ++j) {
							var n = self._state.nodes[j];
							n = querier.query(n, q, {
								resultType: "full"
							});
							if (n && n._deep_query_node_)
								straight = true;
							if (typeof n !== 'undefined')
								nodes = nodes.concat(n);
						}
				}
				if (nodes.length > 0)
					self._state.nodes = utils.arrayUnique(nodes, "path");
				else
					self._state.nodes = [];
				if (args.length == 1 && straight)
					self._state.queried = false;
				else
					self._state.queried = true;
				self._state.success = chains.chain.val(self);
				return;
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},
		/**
		 *
		 * no callBack is present : just return the FIRST value of entries. It's a chain end handle.
		 * If callback is provided : the FIRST entry  value will be passed as argument to callback.
		 *     and so th chain could continue : the return of this handle is the deep handler.
		 *
		 * transparent true
		 *
		 * @method  val
		 * @param callBack could be a retrievable (a String pointing something from store), or a Function, or a treatment (an Object - see treatments in doc)
		 * @chainable
		 * @return {chains.Chain|entry.value} this or val
		 */
		val: function(callBack) {
			var self = this;
			var func = function(s, e) {
				if (typeof callBack === 'string')
					return prom.when(protoc.get(callBack))
						.done(function(callBack) {
							return applyCallBackOrTreatment(callBack, chains.chain.val(self));
						});
				else
					return applyCallBackOrTreatment(callBack, chains.chain.val(self));
			};
			func._isDone_ = true;
			if (callBack)
				return self._enqueue(func);
			return chains.chain.val(self);
		},
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
		 * @return {chains.Chain|entry.value} this or val
		 */
		first: function(callBack) {
			var self = this;
			var func = function(s, e) {
				var shouldModify = function(callBack) {
					if (callBack === true)
						return chains.chain.first(self, true);
					return applyCallBackOrTreatment(callBack, chains.chain.first(self));
				};
				if (typeof callBack === 'string')
					return prom.when(protoc.get(callBack))
						.done(shouldModify);
				return shouldModify(callBack);
			};
			func._isDone_ = true;
			if (callBack)
				return self._enqueue(func);
			return chains.chain.first(self);
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
		 * @return {chains.Chain|entry.value} this or val
		 */
		last: function(callBack) {
			var self = this;
			var func = function(s, e) {
				var shouldModify = function(callBack) {
					if (callBack === true)
						return chains.chain.last(self, true);
					else
						return applyCallBackOrTreatment(callBack, chains.chain.last(self));
				};
				if (typeof callBack === 'string')
					return prom.when(protoc.get(callBack))
						.done(shouldModify);
				else
					return shouldModify(callBack);
			};
			func._isDone_ = true;
			if (callBack)
				return self._enqueue(func);
			return chains.chain.last(self);
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
		 * @return {chains.Chain} this
		 */
		each: function(callBack) {
			var self = this;
			var func = function() {
				var applyCallBackOrTreatment = function(callBack) {
					return prom.all(chains.chain.each(self, callBack));
				};
				if (typeof callBack === 'string')
					return prom.when(protoc.get(callBack))
						.done(applyCallBackOrTreatment);
				else
					return applyCallBackOrTreatment(callBack);
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},
		/**
		 *
		 * if no callBack is present : just return the array of values of entries. It's a chain end handle.
		 * If callback is provided : the entries values will be passed as argument to callback.
		 *     and so th chain could continue : the return of this handle is the deep handler.
		 *
		 * transparent true
		 *
		 *
		 * @method  values
		 * @chainable
		 * @param callBack could be a retrievable (a String pointing something from store), or a Function, or a treatment (an Object - see treatments in doc)
		 * @return {chains.Chain|Array} this or values
		 */
		values: function(callBack) {
			var self = this;
			var func = function(s, e) {
				if (typeof callBack === 'string')
					return prom.when(protoc.get(callBack))
						.done(function(callBack) {
							return applyCallBackOrTreatment(callBack, chains.chain.values(self));
						});
				return applyCallBackOrTreatment(callBack, chains.chain.values(self));
			};
			func._isDone_ = true;
			if (callBack)
				return self._enqueue(func);
			return chains.chain.values(self);
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
		 * @return {chains.Chain}  the current chain handler (this)
		 */
		transform: function(transformer) {
			var self = this;
			var func = function(s, e) {
				var applyTransformer = function(transformer) {
					return chains.chain.transform(self, transformer);
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
		 * @return {chains.Chain}  the current chain handler (this)
		 */
		run: function(funcRef, args) {
			var self = this;
			args = args || [];
			if (funcRef && funcRef.forEach) {
				args = funcRef;
				funcRef = null;
			}
			var doRun = function(node) {

				//console.log("doRun : ", node)
				if (!funcRef) {
					if (typeof node.value != "function")
						return;
					if (node.ancestor)
						return callFunctionFromValue(node.ancestor, node.key, args);
					else
						return node.value(args || null);
					return;
				} else if (typeof funcRef === 'function')
					return runFunctionFromValue(node, funcRef, args);
				else if (typeof funcRef === 'string')
					return callFunctionFromValue(node, funcRef, args);
				else
					return node;
			};
			var create = function(s, e) {
				//console.log("deep.run : ", funcRef)

				if (!self._state.queried) {
					if (!self._state.nodes[0])
						return undefined;
					return doRun(self._state.nodes[0]);
				}
				var alls = [];
				self._state.nodes.forEach(function(node) {
					alls.push(doRun(node));
				});
				return prom.all(alls);
			};
			create._isDone_ = true;
			return self._enqueue(create);
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
		 * @return {chains.Chain}  the current chain handler (this)
		 */
		exec: function(func, args) {
			var self = this;
			args = args || [];
			var create = function() {
				return func.apply({}, args);
			};
			create._isDone_ = true;
			return self._enqueue(create);
		},
		//______________________________________ ENTRIES ARRAY MANIPULATION
		/**
		 * reverse entries order
		 *
		 * inject entries values as chain success.
		 *
		 * @chainable
		 * @method  reverse
		 * @return {chains.Chain} this
		 */
		reverse: function() {
			var self = this;
			var create = function(s, e) {
				if (self._state.nodes.length === 0)
					return;
				if (self._state.queried) {
					self._state.nodes.reverse();
					return;
				}
				if (self._state.nodes[0].value instanceof Array)
					self._state.nodes[0].value.reverse();
			};
			create._isDone_ = true;
			return self._enqueue(create);
		},
		/**
		 * sort chain values.
		 * @method sort
		 * @chainable
		 * @return {chains.Chain} this
		 */
		sort: function() {
			var args = arguments;
			var self = this;
			var create = function(s, e) {
				if (args.length === 0)
					args = ["+"];
				if (self._state.queried)
					return utils.sort(self._state.nodes, args);
				if (self._state.nodes.length === 0)
					return [];
				if (self._state.nodes[0].value instanceof Array)
					return doSort(self._state.nodes[0].value, args);
				return self._state.nodes[0].value;
			};
			create._isDone_ = true;
			return self._enqueue(create);
		},
		//___________________________________________________________________________ NAVIGATION
		/**
		 * perform a range on chain entries : so will remove any chain entries of of range index.
		 *
		 *	asynch
		 *
		 *
		 *  inject a rangeObject as chain success :
		 *    {
		 *           start:number,
		 *           end:number,
		 *           total:number,
		 *           results:Array,
		 *           hasNext:boolean,
		 *           hasPrevious:boolean
		 *    }
		 * @example
	deep([0,1,2,3,4,5])
	.range(1,4)
	.valuesEqual([1,2,3,4]);

	deep([0,1,2,3,4,5])
	.range(3,5)
	.valuesEqual([3,4,5]);
		 *
		 * @method  range
		 * @param  start the index of range start
		 * @param  end the index of range end
		 * @chainable
		 * @return {chains.Chain} this
		 */
		range: function(start, end, query) {
			var self = this;
			var func = function(s, e) {
				var total, count, res;
				if (self._state.nodes.length === 0)
					return utils.createRangeObject(start, end, 0, 0, []);

				var val = self._state.nodes[0];
				if (!self.queried && !(val.value instanceof Array))
				// no range and no query could be applied : only one object
					return errors.Range("no range could be applied on chain : chain holds only on object (not an array).");


				if (query) // apply query, then slice
				{
					if (self.queried)
						self._state.nodes = chains.chain.select(self, query, {
							resultType: "full"
						});
					else // (val instanceof Array) 
						self._state.nodes = querier.query(val.value, query, {
							resultType: "full"
						});
					//console.log("rabge after query : nodes: ", total, self._state.nodes.length);
					total = self._state.nodes.length;
					self._state.nodes = self._state.nodes.slice(start, end + 1);
				} else // simple slice
				{
					if (self.queried) {
						total = self._state.nodes.length;
						self._state.nodes = self._state.nodes.slice(start, end + 1);
					} else // (val instanceof Array) 
					{
						total = val.value.length;
						// ==> query = ./[start:end]
						self._state.nodes = querier.query(val, "./[" + start + ":" + end + "]", {
							resultType: "full"
						});
					}
				}
				self._state.queried = true;
				count = self._state.nodes.length;
				res = chains.chain.values(self);
				return utils.createRangeObject(start, end, total, count, res, query);
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},

		//_________________________________________________________________________________________

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
		 * @return {chains.Chain}
		 */
		parents: function(errorIfEmpty) {
			var self = this;
			var func = function() {
				var res = [];
				self._state.nodes.forEach(function(r) {
					if (r.ancestor)
						res.push(r.ancestor);
				});
				if (res.length > 0)
					res = utils.arrayUnique(res, "path");
				self._state.nodes = res;
				if (res.length === 0 && errorIfEmpty)
					return errors.Internal("deep.parents could not gives empty results");
				return chains.chain.values(self);
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},
		/**
		 * take object, shcema, options and create fresh chain entries from it. Same mecanism as new chain.
		 * @method  root
		 * @chainable
		 * @param  object the object to produce entries  (could be a retrievable string - e.g. "json::myobject.json" - see retrievable doc)
		 * @param  schema the schema of the object  (could be a retrievable string - e.g. "json::myobject.json" - see retrievable doc)
		 * @return {chains.Chain} this
		 */
		deep: function(object, schema, options) {
			var self = this;
			var func = function() {
				//console.log("deep chain restart")
				return deep(object, schema, options)
					.done(function(s) {
						//console.log("deep restart resolved: ", s)
						self._state.nodes = this._state.nodes;
						self._state.root = this._state.root;
						self._state.success = this._state.success;
						self._state.queried = false;
						//console.log("self : ",self._state.success)
						//return this.delay(100).log("done")
						//return chains.chain.val(self);
					});
			};
			func._isDone_ = true;
			return self._enqueue(func);
		},
		//_________________________________________________________________    MODELISATION
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
		setByPath: function(path, obj) {
			var self = this;
			var func = function() {
				var applySet = function(obj) {
					var res = [];
					self._state.nodes.forEach(function(result) {
						res.push(utils.setValueByPath(result.value, path, obj, '/'));
					});
					return res;
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
		 * apply arguments from UP on each entries : will merge objects and array together DEEPLY. see docs and examples.
		 *
		 * synch
		 * inject entries values as chain success.
		 *
		 * @method  up
		 * @chainable
		 * @param objects a list (coma separated - not an array) of objects to apply on each chain entries
		 * @return {chains.Chain} this
		 */
		up: function() {
			var args = Array.prototype.slice.call(arguments);
			var self = this;
			var func = function() {
				return prom.when(protoc.getAll(args))
					.done(function(objects) {
						self._state.nodes.forEach(function(result) {
							objects.forEach(function(object) {
								//console.log("deep.up : entry : ", result.value, " - to apply : ", object)
								result.value = utils.up(object, result.value);
								if (result.ancestor)
									result.ancestor.value[result.key] = result.value;
							});
						});
						return chains.chain.val(self);
					});
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
		 * @return {chains.Chain} this
		 */
		bottom: function() {
			var args = Array.prototype.slice.call(arguments);
			args.reverse();
			var self = this;
			var func = function() {
				return prom.when(protoc.getAll(args))
					.done(function(objects) {
						self._state.nodes.forEach(function(result) {
							objects.forEach(function(object) {
								result.value = utils.bottom(object, result.value);
								if (result.ancestor)
									result.ancestor.value[result.key] = result.value;
							});
						});
						return chains.chain.val(self);
					});
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
		 * @return {chains.Chain} this
		 */
		replace: function(what, by, options) {
			var self = this;
			var func = function() {
				var replaced = [];

				function finalise(r) {
					if (!r.ancestor)
						return;
					r.ancestor.value[r.key] = r.value = by;
					replaced.push(r);
				}
				var doReplace = function(by) {
					self._state.nodes.forEach(function(r) {
						r = querier.query(r, what, {
							resultType: "full"
						});
						if (!r)
							return r;
						if (r._deep_query_node_)
							finalise(r);
						else
							r.forEach(finalise);
					});
					return replaced;
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
		 * @return {chains.Chain} this
		 */
		remove: function(what) {
			var self = this;
			var func = function() {
				return chains.chain.remove(self, what);
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
		 * @return {chains.Chain}     this
		 */
		validate: function(schema) {
			var self = this;
			var func = function() {
				if(!schema || e.schema)
					return;
				var runSchema = function(schema) {
					var report = {
						valid: true,
						reports: []
					};
					self._state.nodes.forEach(function(e) {
						var rep = deep.validate(e.value, schema || e.schema || {});
						report.reports.push(rep);
						if (!rep.valid)
							report.valid = false;
					});
					//console.log("validate is valid : ", report);
					if (report.valid)
						return (self._state.queried) ? report : report.reports.shift();
					else
						return errors.PreconditionFail("deep.validate failed ! ", report);
				};
				if (typeof schema === 'string')
					return prom.when(protoc.get(schema))
						.done(runSchema);
				else
					return runSchema(schema);
			};
			func._isDone_ = true;
			func._name = "chains.chain.validate";
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
		.valuesEqual([
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
		 * @return {chains.Chain} this
		 */
		mapOn: function(what, localKey, foreignKey, whereToStore) {
			var self = this;
			var doMap = function(what, localKey, foreignKey, whereToStore) {
				var map = {};
				what.forEach(function(w) {
					//console.log("mapOn : w :", w)
					if (w === null)
						return;
					var val = w[foreignKey];
					if (typeof map[val] !== 'undefined') {
						if (map[val] instanceof Array)
							map[val].push(w);
						else
							map[val] = [map[val], w];
					} else
						map[val] = w;
				});
				self._state.nodes.forEach(function(entry) {
					//console.log(" finalise mapping : ", entry.value, localKey, map, entry.value[localKey])
					if (!self._state.queried && entry.value && entry.value.forEach)
						entry.value.forEach(function(item) {
							if (map[item[localKey]])
								item[whereToStore || localKey] = map[item[localKey]];
						});
					else
					if (map[entry.value[localKey]])
						entry.value[whereToStore || localKey] = map[entry.value[localKey]];
				});
				return chains.chain.val(self);
			};
			var func = function(s, e) {
				if (self._state.nodes.length === 0)
					return chains.chain.values(self);
				if (typeof what === 'string') {
					var parsed = utils.parseRequest(what);
					var cloned = self.clone(true);
					//cloned.logValues();
					var localKeyQuery = localKey;
					if (!self._state.queried && self._state.nodes[0].value && self._state.nodes[0].value.forEach)
						localKeyQuery = "*/" + localKey;
					//console.log("____________________________ mapon :  query : ","./" + localKey);
					var foreigns = chains.chain.select(cloned, "./" + localKeyQuery).join(",");
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
								return doMap(results, localKey, foreignKey, whereToStore);
							});
					else
						return errors.Internal("deep.mapOn need array as 'what' : provided : " + JSON.stringify(what));
				} else
					return doMap(what, localKey, foreignKey, whereToStore);
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
		 * @return {chains.Chain} this
		 */
		getRelations: function() {
			var self = this;
			var relations = Array.prototype.slice.apply(arguments);
			var func = function(s, e) {
				var alls = [];
				var temp = [];
				self._state.nodes.forEach(function(entry) {
					if (!entry.schema || !entry.schema.links)
						return;
					var r = {
						value: entry.value,
						schema: entry.schema
					};
					temp.push(r);
					querier.query(entry.schema.links, "./*?rel=in=(" + relations.join(",") + ")")
						.forEach(function(relation) {
							//console.log("getRelations : got : ", relation)
							var path = utils.interpret(relation.href, entry.value);
							var parsed = utils.parseRequest(path);
							var wrap = {
								rel: relation
								//href: parsed
							};
							r[relation] = wrap;
							alls.push(protoc.get(parsed, {
								defaultProtocole: "json",
								wrap: wrap
							}));
						});
				});
				if (alls.length === 0)
					return [s, e];
				return prom.all(alls)
					.done(function(s) {
						//console.log("get relations : ", s)
						return s;
					});
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
		 * @return {chains.Chain}       this
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
				var promises = [];
				self._state.nodes.forEach(function(entry) {
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
								utils.setValueByPath(entry.value, r.path, r.result, delimitter);
							});
							return results;
						});
					promises.push(d);
				});
				if (promises.length === 0)
					return;
				return prom.all(promises)
					.done(function(results) {
						if (!self._state.queried)
							return results.shift();
					});
			};
			func._isDone_ = true;
			return self._enqueue(func);
		}
	});

	function callFunctionFromValue(entry, functionName, args) {
		if (!entry._deep_query_node_)
			throw errors.Error(500, "deep.callFunctionFromValue need DQNode");
		var value = entry.value;
		if (typeof args === 'undefined')
			args = [];
		else if (!(args instanceof Array))
			args = [args];
		//console.log("callFunctionFromValue : ", entry, functionName, args);
		var prom = null;
		if (value && value[functionName])
			return value[functionName].apply(value, args);
		return prom;
	}

	function runFunctionFromValue(entry, func, args) {
		if (!entry._deep_query_node_)
			throw errors.Error(500, "deep.callFunctionFromValue need DQNode");
		var value = entry.value;
		if (typeof args === 'undefined')
			args = [];
		else if (!(args instanceof Array))
			args = [args];

		if (!value)
			return undefined;
		var prom = func.apply(value, args);
		return prom;
	}

	function applyCallBackOrTreatment(callBack, value) {
		var r = null;
		if (typeof callBack === 'function')
			r = callBack(value);
		else
			r = utils.applyTreatment.call(callBack, value);
		if (typeof r === 'undefined')
			return value;
		return r;
	}
	//________________________________________________________ DEEP CHAIN UTILITIES


	chains.chain = {
		addInChain: prom.Promise.enqueue,
		/**
		 * same as .query : but in place of holding queried entries : it return directly the query results.
		 * Is the synch version of the query handle.
		 *
		 * synch true
		 * transparent false
		 *
		 * @method  select
		 * @chainable
		 * @param  {string} q the deep-query. Could be an ARRAY of Queries : the result will be the concatenation of all queries on all entries
		 * @return {chains.Chain} this
		 */
		select: function (handler, q, options) {
			var self = handler;
			if (!(q instanceof Array))
				q = [q];
			var res = [];
			handler._state.nodes.forEach(function(r) {
				q.forEach(function(qu) {
					res = res.concat(querier.query(r, qu, options));
				});
			});
			return res;
		},
		stringify: function (handler, options) {
			options = options || {};
			var res = "";
			handler._state.nodes.forEach(function(e) {
				if (options.pretty)
					res += JSON.stringify(e.value, null, ' ') + "\n";
				else
					res += JSON.stringify(e.value) + "\n";
			});
			return res;
		},
		clear: function (handler) {
			handler._state.oldQueue = null;
			handler._state.queue = [];
			return handler;
		},
		transform: function (handler, transformer) {
			var transfo = {
				results: [],
				nodes: null,
				promise: null
			};
			if (!handler._state.queried) {
				transfo.nodes = handler._state.nodes[0];
				if (transfo.nodes.value instanceof Array) {
					transfo.nodes.value.forEach(function(v) {
						transfo.results.push(transformer(v));
					});
					transfo.promise = prom.all(transfo.results);
				} else {
					transfo.results = transformer(transfo.nodes.value);
					transfo.promise = prom.when(transfo.results);
				}
			} else {
				transfo.nodes = handler._state.nodes;
				transfo.nodes.forEach(function(e) {
					transfo.results.push(transformer(e.value));
				});
				transfo.promise = prom.all(transfo.results);
			}
			return transfo.promise
				.done(function(res) {
					if (handler._state.queried)
						transfo.nodes.forEach(function(n) {
							n.value = res.shift();
							if (n.ancestor)
								n.ancestor.value[n.key] = n.value;
						});
					else {
						transfo.nodes.value = res;
						if (transfo.nodes.ancestor)
							transfo.nodes.ancestor.value[res.key] = res.value;
					}
					return res;
				});
		},
		val: function (handler) {
			if (!handler._state.nodes || handler._state.nodes.length === 0)
				return deep.Undefined;
			if (handler._state.queried)
				return this.values(handler);
			if (handler._state.nodes.forEach)
				return handler._state.nodes[0].value;
			return handler._state.nodes.value;
		},
		first: function (handler, modifyNodes) {
			// console.log("chains.chain.first : ", handler, modifyNodes)
			if (!handler._state.nodes)
				return deep.Undefined;
			if (handler._state.nodes && handler._state.nodes.length === 0)
				return deep.Undefined;
			var firstNode = handler._state.nodes[0];
			if (handler._state.queried || !(firstNode.value instanceof Array)) {
				if (modifyNodes)
					handler._state.nodes = [firstNode];
				return firstNode.value;
			}
			var val = firstNode.value[0];
			if (modifyNodes) {
				handler._state.queried = false;
				handler._state.nodes = querier.query(firstNode, "./0", {
					resultType: "full"
				});
			}
			return val;
		},
		last: function (handler, modifyNodes) {
			if (handler._state.nodes.length === 0)
				return deep.Undefined;
			if (handler._state.queried) {
				var lastNode = handler._state.nodes[handler._state.nodes.length - 1];
				if (modifyNodes)
					handler._state.nodes = [lastNode];
				return lastNode.value;
			}
			var firstNode = handler._state.nodes[0];
			if (firstNode.value instanceof Array) {
				var lastIndex = firstNode.value.length - 1;
				var val = firstNode.value[lastIndex];
				if (modifyNodes) {
					handler._state.queried = false;
					handler._state.nodes = querier.query(firstNode, "./" + lastIndex, {
						resultType: "full"
					});
				}
				return val;
			}
			return firstNode.value;
		},
		values: function (handler) {
			if (!handler._state.queried && (handler._state.nodes[0].value instanceof Array))
				return handler._state.nodes[0].value;
			var res = [];
			handler._state.nodes.forEach(function(e) {
				res.push(e.value);
			});
			return res;
		},
		each: function (handler, callBack) {
			var res = [];
			if (!handler._state.queried && (handler._state.nodes[0].value instanceof Array))
				handler._state.nodes[0].value.forEach(function(v) {
					if (typeof callBack === 'object')
						res.push(utils.execTreatment.call(callBack, v));
					else
						res.push(callBack(v));
				});
			else
				handler._state.nodes.forEach(function(e) {
					if (typeof callBack === 'object')
						res.push(utils.execTreatment.call(callBack, e.value));
					else
						res.push(callBack(e.value));
				});
			return res;
		},
		nodes: function (handler) {
			//console.log("chains.chain.nodes : ", handler._state.nodes[0]);
			if (!handler._state.queried && handler._state.nodes[0].value instanceof Array)
				return handler._state.nodes[0];
			var res = [];
			handler._state.nodes.forEach(function(e) {
				res.push(e);
			});
			return res;
		},
		paths: function (handler) {
			var res = [];
			handler._state.nodes.forEach(function(e) {
				res.push(e.paths);
			});
			return res;
		},
		schemas: function (handler) {
			var res = [];
			handler._state.nodes.forEach(function(e) {
				res.push(e.schema);
			});
			return res;
		},
		position: function (handler, name, options) {
			options = options || {};
			handler.positions.push({
				name: name,
				entries: handler._state.nodes.concat([]),
				store: handler._store,
				queried: handler._state.queried,
				queue: (options.restartChain) ? handler.callQueue.concat([]) : null
			});
		},
		remove: function(handler, what) {
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
			handler._state.nodes.forEach(function(r) {
				r = querier.query(r, what, {
					resultType: "full"
				});
				if (!r)
					return r;
				if (r._deep_query_node_)
					finalise(r);
				else
					r.forEach(finalise);
			});
			return removed;
		}
	};
	//_________________________________________________

	chains.Chain.add = function (name, func) {
		chains.Chain.prototype[name] = func;
		return chains.Chain;
	};
	chains.Chain.add("nodes", function(callBack) {
		var self = this;
		var func = function(s, e) {
			return callBack(chains.chain.nodes(self));
		};
		func._isDone_ = true;
		if (callBack)
			return self._enqueue(func);
		return chains.chain.nodes(self);
	});
	chains.Chain.add("init", function() {
		var args = arguments;
		var self = this;
		var func = function(s, e) {
			var alls = [];
			chains.chain.each(self, function(v) {
				if (typeof v.init === "function")
					alls.push(v.init.apply(v, args));
				else
					alls.push(v);
			});
			return prom.all(alls);
		};
		func._isDone_ = true;
		return self._enqueue(func);
	});
	chains.Chain.add("iterate", function(done, fail) {
		var self = this;
		var func = function(s, e) {
			return deep.iterate(chains.chain.values(self), done, fail);
		};
		func._isDone_ = true;
		return self._enqueue(func);
	});
	chains.Chain.add("wired", function(args, context, done, fail) {
		var self = this;
		var func = function(s, e) {
			var nodes = null;
			if (!self._state.queried && self._state.nodes[0].value instanceof Array)
				nodes = querier.query(self._state.nodes[0], "./*", {
					resultType: "full"
				});
			else
				nodes = chains.chain.nodes(self);
			return deep.wired(nodes, args, null, done, fail);
		};
		func._isDone_ = true;
		return self._enqueue(func);
	});
	/**
	 * will perform FULL backgrounds application on chain entries. (see backgrounds documentation)
			 * @chainable
	 * @async
	 * @method  flatten
	 * @return {chains.Chain} this
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
		backgrounds:[a],
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
	chains.Chain.add("flatten", function() {
		var self = this;
		var doFlatten = function() {
			var alls = [];
			self._state.nodes.forEach(function(node) {
				if (!node.value || typeof node.value !== 'object')
					return;
				alls.push(deep.flatten(node));
			});
			if (alls.length === 0)
				return [];
			return prom.all(alls)
				.done(function() {
					return chains.chain.val(self);
				});
		};
		doFlatten._isDone_ = true;
		return self._enqueue(doFlatten);
	});


	/**
	 * apply arguments from UP on each entries : will merge objects and array together DEEPLY. see docs and examples.
	 *
	 * synch
	 * inject entries values as chain success.
	 *
	 * @method  up
	 * @chainable
	 * @param objects a list (coma separated - not an array) of objects to apply on each chain entries
	 * @return {chains.Chain} this
	 */
	chains.Chain.add("sheet", function() {
		var args = Array.prototype.slice.call(arguments);
		var self = this;
		var func = function() {
			var alls = [];
			return prom.when(protoc.getAll(args))
				.done(function(objects) {
					self._state.nodes.forEach(function(result) {
						objects.forEach(function(object) {
							alls.push(deep.sheet(object, result));
						});
					});
					if (args.length == 1)
						return prom.when(alls[0]);
					return prom.all(alls);
				});
		};
		func._isDone_ = true;
		return self._enqueue(func);
	});
	return chains;
});