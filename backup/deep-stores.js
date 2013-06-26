/**
 * manage collections, objects and ressources as http styled stores.
 *
 * One interface for all stores/ressources.
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

/*
	TODO :
		stores : array
		stores : object
		+ add create function (more homogene with json create)

STANDARD trans stores/facets (tout store/facet peut etre utilisé avec)
	manager les readOnly + privates
	manager rpc + bulk

Ajouter deep-facets.js

Add deep.store.Store.fetchRelation(name) based on schema links.

 */
if(typeof define !== 'function'){
	var define = require('amdefine')(module);
	var requirejs = require("requirejs");
}

define(["require"],function(require)
{
	return function(deep){
		//_______________________________________________________________________________ STORES
		//var deep = require("deep/deep");
		var Querier = require("deep/deep-query");

		/**
		 * Just a namespace : where default and custom stores are mainly... stored. ;)
		 * @class deep.stores
		* @constructor
		 *
		 */
		deep.stores = {};

		/**
		 * create a custom store or start chain with a certain store
		 * @example
		 *
		 * 	deep.store("json").get("/campaign/").log();
		 *
		 * @example
		 *
		 * 	deep.store("json").create("campaign", "/campaign/");
		 *  ...
		 *  ...
		 *  deep.store("campaign").get("?").log()
		 *
		 *
		 * @class deep.store
	 	 * @constructor
		 */
		deep.store = function (name, definer, options)
		{
			//console.log("deep.store : ", name)
			options = options || {};
			if(!definer)
				return deep({}).store(name);

			var store = null;
			var stores = deep.stores;
			var role = { name:"no role" };
			if(deep.context && deep.context.role)
			{
				//console.log("deep.store got context.role : ", role);
				stores = deep.context.role.stores;
				role = deep.context.role;
			}
			if(definer instanceof Array)
				store = stores[name] = deep.store.ArrayStore(definer, options);
			else if(definer instanceof deep.store.Store)
				store = stores[name] = definer.create(name, options);
			else store = stores[name] = deep.store.ObjectStore(definer, options);
			store.name = name;
			store.options = options;
			return deep({}).store(name);
		};


		deep.store.extends = function(ancestor, name, options)
		{
			var stores = deep.stores;
			var role = { name:"no role" };
			if(deep.context && deep.context.role)
			{
				stores = deep.context.role.stores;
				role = deep.context.role;
			}

			var st = stores[ancestor];
			if(!st)
				throw new Error("no stores to extends found with : "+ancestor+". Could not create : "+name );

			var store = stores[name] = new deep.store.Store();
			store.name = name;
			if(st.extends)
				return st.extends(store, options);
			return deep.utils.bottom(st, store);
		}

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

			var func = function (s,e) {
				// console.log("chain.store : set store : ", store.name);
				// var store = null;
				var stores = deep.stores;
				var role = { name:"no role" };
				if(self.context && self.context.role)
				{
					stores = self.context.role.stores;
					role = self.context.role;
				}
				if(typeof name === 'string')
				{
					if(!stores[name])
						if(!role)
							return deep.errors.Store("deep.store('"+name+"') : error : no store found");
						else
							return deep.errors.Store("deep.store('"+name+"') : error : no store found in role : "+ role.name);
					store = stores[name];
					store.name = name;
				}
				else
					store = name;
				self._storeName = name;
				deep.chain.position(self, store.name);
			};
			deep.handlers.decorations.store({
				get:function (argument) {},
				patch:function (argument) {},
				put:function (argument) {},
				post:function (argument) {	},
				del:function (argument) {	},
				range:function (argument) {	},
				rpc:function (argument) {},
				bulk:function (argument) {}
			}, self);

			deep.chain.addInChain.apply(this,[func]);
			return self;
		};
		//_________________________________________________________________ dee.Chain wrapper store API
		deep.handlers.decorations.store = function (store, handler) {
			//console.log("store decoration");
			deep.utils.up({
				//_store : deep.collider.replace(store),

				get : deep.compose
				//.condition(typeof store.get === "function")
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
						if(!self._storeName)
							return deep.errors.Store("no store declared in chain. aborting get !");
						return deep.store(self._storeName)
						.get(id, options)
						.done(function (success) {
							//console.log("deep(...).store : get : success : ", success);
							self._nodes = [deep.Querier.createRootNode( success, schema, {uri:id})]
						});
					};
					deep.chain.addInChain.apply(this,[func]);
					self.range = deep.Chain.range;
					return self;
				}),

				post : deep.compose
				//.condition(typeof store.post === "function")
				.createIfNecessary()
				.replace(function (object, id, options) {
					var self = this;
					var func = function (s,e)
					{
						if(!self._storeName)
							return deep.errors.Store("no store declared in chain. aborting post !");
						var schema = null;
						if(typeof self._store.schema === 'function')
							schema = self._store.schema("post");
						else if(typeof self._store.schema === 'object')
							schema = self._store.schema;

						return deep.store(self._storeName)
						.post(object || deep.chain.val(self),id, options)
						.done(function (success) {
							self._nodes = [deep.Querier.createRootNode(success)];
						});
					};
					self.range = deep.Chain.range;
					deep.chain.addInChain.apply(this,[func]);
					return self;
				}),

				put : deep.compose
				//.condition(typeof store.put === "function")
				.createIfNecessary()
				.replace(function (object, options) {
					var self = this;
					//console.log("deep.chain.put : add in chain : ", object, id);
					var func = function (s,e) {
						if(!self._storeName)
							return deep.errors.Store("no store declared in chain. aborting put !");
						return deep.store(self._storeName)
						.put(object  || deep.chain.val(self), options)
						.done(function (success) {
							self._nodes = [deep.Querier.createRootNode(success)];
						});
					};
					self.range = deep.Chain.range;
					deep.chain.addInChain.apply(this,[func]);
					return self;
				}),

				patch : deep.compose
				//.condition(typeof store.patch === "function")
				.createIfNecessary()
				.replace(function (object, id, options) {
					var self = this;
					var func = function (s,e)
					{
						if(!self._storeName)
							return deep.errors.Store("no store declared in chain. aborting patch !");
						return deep.store(self._storeName)
						.patch(object  || deep.chain.val(self),id, options)
						.done(function (success) {
							self._nodes = [deep.Querier.createRootNode(success)];
						});
					};
					self.range = deep.Chain.range;
					deep.chain.addInChain.apply(this,[func]);
					return self;
				}),

				del : deep.compose
				//.condition(typeof store.del === "function")
				.createIfNecessary()
				.replace(function (id, options)
				{
					var self = this;
					var func = function (s,e)
					{
						if(!self._storeName)
							return deep.errors.Store("no store declared in chain. aborting delete !");
						var val = deep.chain.val(self);
						return deep.store(self._storeName)
						.del(id || val.id, options)
						.done(function (success) {
							self._nodes = [deep.Querier.createRootNode(success)];
						});
					};
					self.range = deep.Chain.range;
					deep.chain.addInChain.apply(this,[func]);
					return self;
				}),

				rpc : deep.compose
				//.condition(typeof store.rpc === "function")
				.createIfNecessary()
				.replace(function (method, body, uri, options) {
					var self = this;
					var func = function (s,e) {
						if(!self._storeName)
							return deep.errors.Store("no store declared in chain. aborting rpc !");
						return deep.store(self._storeName).rpc(method, body, uri, options)
						.done(function (success) {
							self._nodes = [deep.Querier.createRootNode(success)];
						});
					};
					self.range = deep.Chain.range;
					deep.chain.addInChain.apply(this,[func]);
					return self;
				}),

				range : deep.compose
				//.condition(typeof store.range === "function")
				.createIfNecessary()
				.replace(function (arg1, arg2, uri, options) {
					var self = this;
					var func = function (s,e) {
						if(!self._storeName)
							return deep.errors.Store("no store declared in chain. aborting range !");
						return deep.store(self._storeName).range(arg1, arg2, uri, options)
						.done(function (success) {
							self._nodes = [deep.Querier.createRootNode(success)];
						});
					};
					self.range = deep.Chain.range;
					deep.chain.addInChain.apply(this,[func]);
					return self;
				}),

				bulk : deep.compose
				//.condition(typeof store.bulk === "function")
				.createIfNecessary()
				.replace(function (arr, uri, options) {
					var self = this;
					var func = function (s,e) {
						if(!self._storeName)
							return deep.errors.Store("no store declared in chain. aborting bulk !");
						return deep.store(self._storeName).bulk(arr, uri, options)
						.done(function (success) {
							self._nodes = [deep.Querier.createRootNode(success)];
						});
					};
					self.range = deep.Chain.range;
					deep.chain.addInChain.apply(this,[func]);
					return self;
				})
			}, handler);
			return handler;
		};
		/**
		 * Empty class : Just there to get instanceof working (be warning with iframe issue in that cases).
		 * @class deep.store.Store
		 * @constructor
		 */
		deep.store.Store = function () {};
		deep.store.Store.prototype = {
			_deep_store_:true
		};

		/**
		 * A store based on simple array
		 * @class deep.store.Array
		 * @constructor
		 * @param {Array} arr a first array of objects to hold
		 * @param {Object} options could contain 'schema'
		 */
		deep.store.ArrayStore = function (arr, options)
		{
			var store = new deep.store.Store();
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
				if(id === "" || !id || id === "*")
					id = "?";
				//console.log("ArrayStore.get : ",id," - stock : ", stock)
				if(typeof id === "string" &&  id.match( /^((\.?\/)?\?)|^(\?)/gi ) )
					return deep(stock).query("./collection/*"+id).store(this);

				if(typeof id === "string")
					return deep(stock)
					.query("./collection/*?id=string:"+id)
					.done(function(res){
						return res.shift();
					})
					.store(this);

				return deep(stock)
				.query("./collection/*?id="+id)
				.done(function(res){
					return res.shift();
				})
				.store(this);
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
					throw new Error("Array store need id on put");
				var schema = options.schema || this.schema;
				if(schema)
					return deep(object, schema)
					.validate()
					.root(stock)
					.replace("./collection/*?id="+id, object)
					.done(function(success){
					    return success.shift().value;
					})
					.store(this);
				else
					return deep(stock)
					.replace("./collection/*?id="+id, object)
					.done(function(success){
					    return success.shift().value;
					})
					.store(this);
			};
			/**
			 * @method post
			 * @param  {Object} object
			 * @param  {Object} options (optional)
			 * @return {Object} the inserted object (decorated with it's id)
			 */
			store.post = function (object, options)
			{
				options = options || {};
				if(!object.id)
					object.id = id = new Date().valueOf()+""; // mongo styled id
				var schema = options.schema || this.schema;

				return deep(stock)
				.query("./collection/*?id="+object.id)
				.done(function(res){
					if(res.length > 0)
						return new Error("deep.store.ArrayStore.post : An object has the same id before post : please put in place : object : ",object);
					if(schema)
						return deep(object)
						.validate(schema)
						.done(function (report) {
							stock.collection.push(object);
							return object;
						});
					stock.collection.push(object);
					return object;
				})
				.store(this);
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
				return deep(stock)
				.query("./collection/*?id="+object.id)
				.done(function (res) {
					if(res.length == 0)
						return new Error("ArrayStore.patch : no object found in collection with id : "+ object.id+". Aborting patch. Please post before");
				})
				.up(object)
				.done(function (res) {
					if(schema)
						this.validate(schema);
				})
				.store(this);
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
		 * @class deep.store.Object
		 * @constructor
		 * @param {Object} obj the root object to hold
		 * @param {Object} options could contain 'schema'
		 */
		deep.store.ObjectStore = function (obj, options)
		{
			var store = new deep.store.Store();
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
				//if(id === "" || !id || id === "*")
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
			if(!request)
				return request;
			if(typeof request !== "string" && request && !request._deep_request_)
				return request;
			options = options || {};
			var infos = request;
			if(typeof infos === 'string')
				infos = deep.parseRequest(request, options);
			var res = null;
			//console.log("deep.get : infos : ", request);
			if(!infos.store)
				if(!infos.protocole)
					return request;
				else
					return new Error("no store found with : "+request);
			if(infos.queryThis)
				res = infos.store.get(infos, options);
			else if(infos.method )
			{
				switch(infos.method)
				{
					case "range" :
						if(!infos.store.range)
							return deep(new Error("store doesn't contain method : "+request));
						var splitted = infos.uri.split("?");
						var rangePart = splitted.shift();
						var query = splitted.shift() || "";
						if(query !== "" && query[0] !== "?")
							query = "?"+query;
						var rn = rangePart.split(",");
						var start = parseInt(rn[0], 10);
						var end = parseInt(rn[1], 10);
						res =  infos.store[infos.method](start, end, query, options);
						break;
					default:
						res = infos.store.get(infos.uri, options);
				}

			}
			else
				res = infos.store.get(infos.uri, options);
			if(options.wrap)
			{
				return deep.when(res)
				.done(function(res){
					if(options.wrap.result)
					{
						if(typeof options.wrap.result.push === 'function')
							options.wrap.result.push(res);
						else
							options.wrap.result = [].concat(options.wrap.result);
					}
					else
						options.wrap.result = res;
					return options.wrap;
				})
			}
			return res;
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
		deep.parseRequest = function (request, options)
		{
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
			var stores = deep.stores;
			var role = { name:"no role" };
			if(deep.context && deep.context.role)
			{
				//console.log("deep.store got context.role : ", role);
				stores = deep.context.role.stores;
				role = deep.context.role;
			}
			var queryThis = false;
			if(request[0] == '#' || protoc == "first" || protoc == "last" || protoc == "this")
			{
				store = deep.stores.queryThis;
				queryThis = true;
			}
			else if(!protoc)
			{
				//console.log("no protocole : try extension");
				for( var i in stores )
				{
					var storez = stores[i];
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
				if(!store && options.defaultProtocole)
				{
					store = deep.stores[options.defaultProtocole];
					protoc = options.defaultProtocole;
				}
			}
			else
				store = stores[protoc] || stores[protoc+"."+method];
			//console.log("store : ", store)
			var res = {
				_deep_request_:true,
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
		 * store to manage requirejs module load
		 * not intended to be used directly. use deep.store("js") or "js::...js" instead
		 * @class deep.stores.js
		 */
		deep.stores.js = {
			/**
			 * @method get
			 * @param  {String} id the path of the module to load
			 * @param  {Object} options
			 * @return {deep.Chain} the loaded module injected in a chain
			 */
			get:function (id, options) {
				//console.log("deep.stores.js.get : ", id)
				if(!id)
					return deep(new Error("deep.store.js need id !!"));
				var def = deep.Deferred();
				try{
					require([id], function(obj){
						def.resolve(obj);
					}, function(err){
						//console.log("require get error : ", err);
						def.reject(err);
					});
				}
				catch(e)
				{
					//console.log("require get errors catched : ", e);
					def.reject(e);
				}
				return deep(def.promise());
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
				return deep.stores.js
				.get(id, options)
				.done(function(cl){
					if(typeof cl === 'function' && cl.prototype)
						this.root(new cl());
					//console.log("deep.stores.instance  : could not instanciate : "+JSON.stringify(id));
					return new Error("deep.stores.instance  : could not instanciate : "+JSON.stringify(id));
				});
				//console.log("protocole::instance : ", cl);

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
				return deep.stores.js
				.get(id, options)
				.done(function(res){
					this.root(res.aspect);
					return res.aspect;
				});
			}
		};



		/*
			TODO : add schema protocole :

				retrieve it and "compile" it ( produce cleans + validations methods )

				use LAZZY SCHEMA LOADING (only on demand)

		 */

		return deep;
	}
});