/**
 * how manage collections and objects as http styled stores
 *
 * One interface for all stores.
 *
 * @module deep
 * @submodule deep-stores
 * @example simple
 *
 * 		deep({ id:1, title:"hello" })
 *   	.store("mystore")
 *    	.put()
 *     	.done(function (puttedObject) {
 *	     	// do something 
 *	    });
 *
 * @example simple 2
 *
 * 		deep
 * 		.store("json")
 * 		.get("/campaign/12")
 * 		.up({
 * 			title:"my new title"
 * 		})
 * 		.put()
 * 		.done(function (argument) {
 * 			//...
 *   	})
 *   	.log();
 *
 * @example simple 3
 *
 * 		deep
 * 		.store("json")
 * 		.create("campaign", "/campaign/");
 *
 * 		....
 *
 * 		deep("campaign::12")
 * 		.done(function (camp) {
 *		 	....
 *		});
 * 
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(["require", "deep/deep"],function(require)
{
	return function(deep){
		//_______________________________________________________________________________ STORES
		//var deep = require("deep/deep");
		var Querier = require("deep/deep-query");
		/**
		 *
		 * 
		 * @submodule deep-stores
		 */
		
		/**
		 * Just a namespace : where default and custom stores are mainly... stored. ;)
		 * @class deep.stores
		 */
		deep.stores = {};

		/**
		 * create a custom store or start chain with a certain store
		 * @example
		 *
		 * deep.store("json").get("/campaign/").log();
		 *
		 * @example
		 *
		 * deep.store("json").create("campaign", "/campaign/");
		 * ...
		 * ...
		 * deep.store("campaign").get("?").log()
		 *
		 * 
		 * @for deep
		 * @method store
		 * @static
		 */
		deep.store = function (name, definer, options)
		{
			options = options || {};
			var store = null;
			if(!definer)
			{
				if(!deep.stores[name])
					throw new Error("deep.store(name) : no store found with : ", name);
				return deep.stores[name];
			}
			else if(definer instanceof Array)
				store = deep.stores[name] = deep.store.ArrayStore(definer, options);
			else if(definer instanceof deep.store.DeepStore)
				store = deep.stores[name] = definer.create(name, options);
			else store = deep.stores[name] = deep.store.ObjectStore(definer, options);
			store.name = name;
			store.options = options;
			return store;
		};

		/**
		 * set chain with a certain store. If no store founded : throw an error.
		 * @example 
		 *
		 * 	deep(myObject).store("campaign").post().log();
		 * 
		 * @for deep.Chain
		 * @method store
		 * @param {String} name the name of the store to select
		 * @return {deep.Chain} the chain to manage selected store. Inject chain's values as success object.
		 */
		deep.Chain.prototype.store = function (name)
		{
			var self = this;
			var store = null;
			if(typeof name === 'string')
			{
				if(!deep.stores[name])
					throw new Error("no store found with : "+name);
				store = deep.stores[name];
			}
			else
				store = name;
			var func = function (s,e) {
				//console.log("chain.store : set store : ", store.name);
				self._store = store;
				deep.chain.position(self, store.name);
				deep.chain.forceNextQueueItem(self, s, e);
			};
			deep.handlers.decorations.store(store, self);
			deep.chain.addInQueue.apply(this,[func]);
			return self;
		};
		//_________________________________________________________________ dee.Chain wrapper store API
		deep.handlers.decorations.store = function (store, handler) {
			//console.log("store decoration");
			deep.utils.up({
				_store : deep.collider.replace(store),

				get : deep.compose
				.condition(typeof store.get === "function")
				.createIfNecessary()
				.replace(function (id, options) {
					var self = this;
					if(id == "?" || !id)
						id = "";

					var schema = null;
					if(typeof self._store.schema === 'function')
						schema = self._store.schema("get");
					else if(typeof self._store.schema === 'object')
						schema = self._store.schema;

					var func = function (s,e) {
						self
						._store
						.get(id, options)
						.done(function (success) {
							//console.log("deep(...).store : get : success : ", success);
							if(success instanceof Array)
								self._entries = deep(success, schema, {uri:id}).nodes();
							else
								self._entries = [deep.Querier.createRootNode( success, schema, {uri:id})];
							deep.chain.forceNextQueueItem(self, success, null);
						})
						.fail(function (error) {
							deep.chain.forceNextQueueItem(self, null, error);
						});
					};
					deep.chain.addInQueue.apply(this,[func]);
					self.range = deep.Chain.range;
					return self;
				}),

				post : deep.compose
				.condition(typeof store.post === "function")
				.createIfNecessary()
				.replace(function (object, id, options) {
					var self = this;
					var func = function (s,e)
					{
						self
						._store
						.post(object || deep.chain.val(self),id, options)
						.done(function (success) {
							self._entries = [deep.Querier.createRootNode(success)];
							deep.chain.forceNextQueueItem(self, success, null);
						})
						.fail(function (error) {
							console.log("deeo.chain.store.post : post failed : ", error);
							deep.chain.forceNextQueueItem(self, null, error);
						});
					};
					self.range = deep.Chain.range;
					deep.chain.addInQueue.apply(this,[func]);
					return self;
				}),

				put : deep.compose
				.condition(typeof store.put === "function")
				.createIfNecessary()
				.replace(function (object, options) {
					var self = this;
					//console.log("deep.chain.put : add in chain : ", object, id);
					var func = function (s,e) {
						options = options || {};
						var id = object.id || options.id;
						//console.log("deep.chain.put : ", object, id);

						self._store.put(object  || deep.chain.val(self), options)
						.done(function (success) {
							self._entries = [deep.Querier.createRootNode(success)];
							deep.chain.forceNextQueueItem(self, success, null);
						})
						.fail(function (error) {
							deep.chain.forceNextQueueItem(self, null, error);
						});
					};
					self.range = deep.Chain.range;
					deep.chain.addInQueue.apply(this,[func]);
					return self;
				}),

				patch : deep.compose
				.condition(typeof store.patch === "function")
				.createIfNecessary()
				.replace(function (object, id, options) {
					var self = this;
					var func = function (s,e) {
						self
						._store
						.patch(object  || deep.chain.val(self),id, options)
						.done(function (success) {
							self._entries = [deep.Querier.createRootNode(success)];
							deep.chain.forceNextQueueItem(self, success, null);
						})
						.fail(function (error) {
							deep.chain.forceNextQueueItem(self, null, error);
						});
					};
					self.range = deep.Chain.range;
					deep.chain.addInQueue.apply(this,[func]);
					return self;
				}),

				del : deep.compose
				.condition(typeof store.del === "function")
				.createIfNecessary()
				.replace(function (id, options) {
					var self = this;
					var func = function (s,e) {
						var val = deep.chain.val(self);
						self
						._store
						.del(id || val.id, options)
						.done(function (success) {
							self._entries = [deep.Querier.createRootNode(success)];
							deep.chain.forceNextQueueItem(self, success, null);
						})
						.fail(function (error) {
							deep.chain.forceNextQueueItem(self, null, error);
						});
					};
					self.range = deep.Chain.range;
					deep.chain.addInQueue.apply(this,[func]);
					return self;
				}),

				rpc : deep.compose
				.condition(typeof store.rpc === "function")
				.createIfNecessary()
				.replace(function (method, body, uri, options) {
					var self = this;
					var func = function (s,e) {
						self._store.rpc(method, body, uri, options)
						.done(function (success) {
							self._entries = [deep.Querier.createRootNode(success)];
							deep.chain.forceNextQueueItem(self, success, null);
						})
						.fail(function (error) {
							deep.chain.forceNextQueueItem(self, null, error);
						});
					};
					self.range = deep.Chain.range;
					deep.chain.addInQueue.apply(this,[func]);
					return self;
				}),

				range : deep.compose
				.condition(typeof store.range === "function")
				.createIfNecessary()
				.replace(function (arg1, arg2, uri, options) {
					var self = this;
					var func = function (s,e) {
						self._store.range(arg1, arg2, uri, options)
						.done(function (success) {
							self._entries = deep(success.results).nodes();
							deep.chain.forceNextQueueItem(self, success, null);
						})
						.fail(function (error) {
							deep.chain.forceNextQueueItem(self, null, error);
						});
					};
					self.range = deep.Chain.range;
					deep.chain.addInQueue.apply(this,[func]);
					return self;
				}),

				bulk : deep.compose
				.condition(typeof store.bulk === "function")
				.createIfNecessary()
				.replace(function (arr, uri, options) {
					var self = this;
					var func = function (s,e) {
						self._store.bulk(arr, uri, options)
						.done(function (success) {
							self._entries = deep(success).nodes();
							deep.chain.forceNextQueueItem(self, success, null);
						})
						.fail(function (error) {
							deep.chain.forceNextQueueItem(self, null, error);
						});
					};
					self.range = deep.Chain.range;
					deep.chain.addInQueue.apply(this,[func]);
					return self;
				})
			}, handler);
			return handler;
		};
		/**
		 * Empty class : Just there to get instanceof working (be warning with iframe issue in that cases).
		 * @class deep.stores.Store
		 * @constructor
		 */
		deep.store.DeepStore = function () {};
		deep.store.DeepStore.prototype = {
			_deeo_store_:true
		};

		/**
		 * A store based on simple array
		 * @class deep.stores.Array
		 * @constructor
		 * @param {Array} arr a first array of objects to hold
		 * @param {Object} options could contain 'schema'
		 */
		deep.store.ArrayStore = function (arr, options) {
			var store = new deep.store.DeepStore();
			options = options || {};
			store.schema = options.schema || {};
			var stock = {
				collection:arr
			};
			/**
			 * @method get
			 * @param  {String} id the id of the object to retrieve. Could also be a (deep)query.
			 * @param {Object} options an options object (here there is no options)
			 * @return {Object} the retrieved object
			 */
			store.get = function (id, options) {
				if(id === "")
					id = "?";
				if( id.match( /^((\.?\/)?\?)|^(\?)/gi ) )
					return deep(stock).query("collection/*"+id).store( this);
				return deep(stock).query("./collection/*?id="+id).store(this);
			};
			/**
			 * @method put
			 * @param  {Object} object the object to update
			 * @param  {Object} options an options object : could contain 'id'
			 * @return {Object} the updated object
			 */
			store.put = function (object, options) {
				options = options || {};
				var id = options.id || object.id;
				if(!id)
					throw new Error("Array store need id on put")
				var schema = options.schema || this.schema;
				if(schema)
					deep(object)
					.validate(schema)
					.fail(function (error) {
						object = error;
					})
					.root(stock)
					.replace("./collection/*?id="+id, object);
				else
					deep(stock)
					.replace("./collection/*?id="+id, object);
				return deep(object).store(this);
			};
			/**
			 * @method post
			 * @param  {Object} object
			 * @param  {Object} options (optional)
			 * @return {Object} the inserted object (decorated with it's id)
			 */
			store.post = function (object, options) {
				options = options || {};
				object.id = id = new Date().valueOf(); // mongo styled id
				var schema = options.schema || this.schema;
				if(schema)
					deep(object)
					.validate(schema)
					.done(function (report) {
						arr.push(object);
					})
					.fail(function (error) {
						object = error;
					});
				else
					arr.push(object);
				return deep(object).store(this);
			};
			/**
			 * @method del
			 * @param  {String} id
			 * @param  {Object} options no options for the moment
			 * @return {Object} the removed object
			 */
			store.del = function (id, options) {
				return deep(stock).remove("./collection/*?id="+id).store(this);
			};
			/**
			 * @method patch
			 * @param  {Object} object  the update to apply to object
			 * @param  {Object} options  could contain 'id'
			 * @return {deep.Chain} a chain that hold the patched object and has injected values as success object.
			 */
			store.patch = function (object, options) {
				options = options || {};
				var id = object.id || options.id;
				if(!id)
					throw new Error("deep.stores.Array need id on patch");
				var schema = options.schema || this.schema;
				if(schema)
				{
					var report = deep.validate(object, schema, { partial:true });
					if(!report.valid)
						throw new Error("412 : Precondition Failed : deep.stores.Array patch failed : "+JSON.stringify());
				}	
				return deep(stock).query("./collection/*?id="+id).up(object).store(this);
			};
			/**
			 * select a range in collection
			 * @method range
			 * @param  {Number} start
			 * @param  {Number} end
			 * @return {deep.Chain} a chain that hold the selected range and has injected values as success object.
			 */
			store.range = function (start, end) {
				return deep(stock.collection).range(start,end).store(this);
			};
			return store;
		};

		/**
		 * A store based on simple object
		 * @class deep.stores.Object
		 * @constructor
		 * @param {Object} obj the root object to hold
		 * @param {Object} options could contain 'schema'
		 */
		deep.store.ObjectStore = function (obj, options)
		{
			var store = new deep.store.DeepStore();
			options = options || {};
			store.schema = options.schema || {};
			/**
			 * 
			 * @method get
			 * @param  {String} id
			 * @return {deep.Chain} depending on first argument : return an object or an array of objects
			 */
			store.get = function (id)
			{
				if(id[0] == "." || id[0] == "/")
					return deep(obj).query(id).store(this);
				return deep(obj).query("./"+id).store(this);
			};
			/**
			 * @method put
			 * @param  {[type]} object
			 * @param  {[type]} query
			 * @return {[type]}
			 */
			store.put = function (object, query)
			{
				//console.log("ObjectStore.put : ", object, query);
				deep(obj)
				.setByPath(query, object);
				return deep(object).store(this);
			};
			/**
			 * @method post
			 * @param  {[type]} object
			 * @param  {[type]} path
			 * @return {[type]}
			 */
			store.post = function (object, path)
			{
				if(options.schema)
					deep(object)
					.validate(options.schema)
					.fail(function (error) {
						object = error;
					})
					.root(obj)
					.setByPath(path, object);
				else
					deep(obj)
					.setByPath(path, object);
				return deep(object)
					.store(this);
			};
			/**
			 * @method del
			 * @param  {[type]} id
			 * @return {[type]}
			 */
			store.del = function (id)
			{
				var res = [];
				if(id[0] == "." || id[0] == "/")
					deep(obj).remove(id)
					.done(function (removed)
					{
						res = removed;
					});
				else
					deep(obj).remove("./"+id)
					.done(function (removed)
					{
						res = removed;
					});
				return deep(res).store(this);
			};
			/**
			 * @method patch
			 * @param  {[type]} object
			 * @param  {[type]} id
			 * @return {[type]}
			 */
			store.patch = function (object, id)
			{
				if(id[0] == "." || id[0] == "/")
					return deep(obj).query(id).up(object).store(this);
				return deep(obj).query("./"+id).up(object).store(this);
			};
			return store;
		};


		/**
		 * retrieve request (if string in retrievable format) (e.g. "json::test.json")
		 * perform an http get
		 * if request is not a string : will just return request
		 * @for deep
		 * @static 
		 * @method get
		 * @param  {String} request a string to retrieve
		 * @param  {Object} options (optional)
		 * @return {deep.Chain} a handler that hold result 
		 */
		deep.get = function  (request, options)
		{
			if(typeof request !== "string")
				return request;
			var infos = deep.parseRequest(request);
			if(!infos.store)
				if(!infos.protocole)
					return request;
				else
					return new Error("no store found with : ", request);
			if(infos.queryThis)
				return infos.store.get(infos, options);
			if(infos.method )
			{
				if(infos.method !== "range" || !infos.store.range)
					return deep(new Error("store doesn't contain method : ",request));
				var splitted = infos.uri.split("?");
				var rangePart = splitted.shift();
				var query = splitted.shift() || "";
				if(query !== "" && query[0] !== "?")
					query = "?"+query;
				var rn = rangePart.split(",");
				var start = parseInt(rn[0], 10);
				var end = parseInt(rn[1], 10);
				return infos.store[infos.method](start, end, query, options);
			}
			else
				return infos.store.get(infos.uri, options);
		};
		/**
		 * retrieve an array of retrievable strings (e.g. "json::test.json")
		 * if request is not a string : will just return request
		 * @for deep
		 * @static 
		 * @method getAll
		 * @param  {String} requests a array of strings to retrieve
		 * @param  {Object} options (optional)
		 * @return {deep.Chain} a handler that hold result 
		 */
		deep.getAll = function  (requests, options)
		{
			var alls = [];
			requests.forEach(function (request) {
				alls.push(deep.get(request,options));
			});
			return deep.all(alls);
		};

		/**
		 * parse 'retrievable' string request (e.g. "json::test.json")
		 * @for deep
		 * @method parseRequest
		 * @static
		 * @param  {String} request
		 * @return {Object} infos an object containing parsing result
		 */
		deep.parseRequest = function (request) {
			var protoIndex = request.indexOf("::");
			var protoc = null;
			var uri = request;
			var store = null;
			var method = null;
			if(protoIndex > -1)
			{
				protoc = request.substring(0,protoIndex);
				var subprotoc = protoc.split(".");
				if(subprotoc.length > 1)
				{
					protoc = subprotoc.shift();
					method = subprotoc.shift();
				}
				uri = request.substring(protoIndex+2);
			}
			//console.log("parseRequest : protoc : ", protoc, " - uri : ", uri);
			var queryThis = false;
			if(request[0] == '#' || protoc == "first" || protoc == "last" || protoc == "this")
			{
				store = deep.stores.queryThis;
				queryThis = true;
			}
			else if(!protoc)
			{
				//console.log("no protocole : try extension");
				for( var i in deep.stores )
				{
					var storez = deep.stores[i];
					if(!storez.extensions)
						continue;
					for(var j =0; j < storez.extensions.length; ++j)
					{
						var extension = storez.extensions[j];
						if(uri.match(extension))
						{
							store = storez;
							break;
						}
					}
					if(store)
						break;
				}
			}
			else
				store = deep.stores[protoc];
			var res = {
				request:request,
				queryThis:queryThis,
				store:store,
				protocole:protoc,
				method:method,
				uri:uri
			};
			//console.log("deep.parseRequest : results : ", res);
			return res;
		};

		//__________________________________________________________________________ CORE STORES
		/**
		 * the store to manage 'query this' approach. see query usage in object when flatten for example.
		 * not intended to be used directly. use  "this::./..." || "first::./..." || "last::"./..." somewhere in objects instead.
		 * @class deep.stores.queryThis
		 */
		deep.stores.queryThis = {
			/**
			 * @method get
			 * @param  {String} request the query to apply on object
			 * @param  {Object} options { root:theObjectToQuery, basePath:"the_path_of_the_object_if_any"}
			 * @return {Object} the query result
			 */
			get:function (request, options) {
				//console.log("deep.stores.queryThis : ", request)
				options = options || {};
				var root = options.root;
				var basePath = options.basePath;
				var infos = request;
				if(typeof infos === 'string')
					infos = deep.parseRequest(infos);
				if(infos.uri[0] == '#')
					infos.uri = infos.uri.substring(1);
				var res = null;
				if(root._isDQ_NODE_)
					res = Querier.query(root, infos.uri, { keepCache:false });
				else
				{
					basePath = basePath || '';
					if(basePath !== '' && infos.uri.substring(0,3) == "../")
						infos.uri = ((basePath[basePath.length-1] != "/")?(basePath+"/"):basePath)+infos.uri;
					res = Querier.query(root, infos.uri, { keepCache:false });
				}
				if(res)
					switch(infos.protocole)
					{
						case "first" :
							res = res[0] || null;
							break;
						case "last" :
							res = res[res.length-1] || null;
							break;
					}
				//if(infos.protocole == "first")
				//	console.log("QUERY THIS : "+request + " - base path : "+basePath)//, " - results : ", JSON.stringify(res, null, ' '));
				return res;
			}
		};

		/**
		 * store to manage javascript instanciation with requirejs load.
		 * not intended to be used directly. use deep.store("instance") or "instance::...js" instead
		 * @class deep.stores.instance
		 */
		deep.stores.instance = {
			/**
			 * @method get
			 * @param  {String} id the path of the requirejs module to load
			 * @param  {Object} options
			 * @return {Object} the instanciated module
			 */
			get:function (id, options) {
				var cl = require(id);
				//console.log("DeepRequest.instance : ", cl);
				if(typeof cl === 'function' && cl.prototype)
					return deep(new cl());
				console.log("DeepRequest : could not instanciate : "+JSON.stringify(info));
				throw new Error("DeepRequest : could not instanciate : "+JSON.stringify(info));
			}
		};

		/**
		 * store to manage javascript instanciation with requirejs load
		 * not intended to be used directly. use deep.store("aspect") or "aspect::...js" instead
		 * @class deep.stores.aspect
		 */
		deep.stores.aspect = {
			/**
			 * @method get
			 * @param  {String} id the path of the requirejs module to load
			 * @param  {Object} options
			 * @return {Object} the loaded aspect
			 */
			get:function (id, options) {
				return deep(require(id)).then(function(res){
					return res.aspect;
				}, function(res){
					return res;
				});
			}
		};

		/**
		 * store to manage requirejs module load
		 * not intended to be used directly. use deep.store("js") or "js::...js" instead
		 * @class deep.stores.js
		 */
		deep.stores.js = {
			/**
			 * @method get
			 * @param  {String} id the path of the module to load
			 * @param  {Object} options
			 * @return {Object} the loaded module
			 */
			get:function (id, options) {
				return deep(require(id));
			}
		};

		return deep;
	}
});