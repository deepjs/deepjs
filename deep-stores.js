if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(["require"], function (require){

	return function(deep)
	{
        //________________________________________________________________________________________
	if(typeof requirejs !== 'undefined')
		requirejs.onError = function (err) {
	        console.log('requirejs OnError : ' + err);
		    console.log(err.requireType);
		    if (err.requireType === 'timeout') {
		        console.log('modules: ' + err.requireModules);
		    }
		    //throw err;
		};

		/**
	 * start chain setted with a certain store
	 * @example
	 *
	 * 	deep.store("json").get("/campaign/").log();

	 *  ...
	 *  deep.store("campaign").get("?").log()
	 *
	 *
	 * @class deep.store
 	 * @constructor
	 */
	deep.store = function (name)
	{
		//	console.log("deep.store(name) : ",name)
		return deep({}).store(name);
	};

	/**
	 * Empty class : Just there to get instanceof working (be warning with iframe issue in that cases).
	 * @class deep.store.Store
	 * @constructor
	 */
	deep.Store = function () {
		this._deep_store_ = true;
	};
	deep.Store.prototype = {
		_deep_store_:true,
		init:function () {

		}
	};

	deep.extensions = [];

	/**
	 * A store based on simple array
	 * @class deep.store.Collection
	 * @constructor
	 * @param {Array} arr a first array of objects to hold
	 * @param {Object} options could contain 'schema'
	 */
	deep.store.Collection = function (protocole, collection, schema)
	{
		if (!(this instanceof deep.store.Collection))
			return new deep.store.Collection(protocole, collection, schema);
		deep.Store.call(this);
		deep.utils.bottom(deep.Store.prototype, this);
		if(collection)
			this.collection = collection;
		else
			this.collection = [];
		this.schema = schema;
		if(protocole)
			deep.protocole(protocole, this);
		return this;
	};


	deep.store.Collection.prototype =
	{
		init:deep.compose.parallele(function () {
			if(typeof this.collection === 'string' || typeof this.schema === 'string')
				return deep(this)
				.query("./[collection,schema]")
				.load();
		}),
        /**
         * @method get
         * @param  {String} id the id of the object to retrieve. Could also be a (deep)query.
         * @param {Object} options an options object (here there is no options)
         * @return {Object} the retrieved object
         */
        get : function (id, options)
        {
            options = options || {};
            //console.log("deep.store.Collection.get : ",id," - stock : ", this.collection)
            var q = "";
            var queried = false;
            if(id[0] === "*")
                id = "";
            if(typeof id === "string" &&  (id.match( /^((\.?\/)?\?)|^(\?)/gi ) || id === "" || id[0] === '?' ))
            {
                q = "./*"+id;
                queried = true;
            }
            else
                q = "./*?id="+id;
            var r = deep.query(this.collection,q);
            if(queried)
                return r;
            else if(r instanceof Array)
                return r.shift();
            else return r;
        },
        /**
         * @method put
         * @param  {Object} object the object to update
         * @param  {Object} options an options object : could contain 'id'
         * @return {Object} the updated object
         */
        put : function (object, options)
        {
            options = options || {};
            var id = options.id || object.id;
            if(!id)
                return deep(deep.errors.Store("Collection store need id on put"));
            var schema = options.schema || this.schema;
            var r = deep.query(this.collection, "./*?id="+id, { resultType:"full"});
            if(!r)
                return deep.errors.NotFound("no items found in collection with : "+id);
            r = r.shift();
            if(schema)
            {
                var report = deep.validate(object, schema);
                if(!report.valid)
                    return deep.errors.PreconditionFail("Failed to put on collection : validation failed.", report);
            }
            r.value = object;
            if(r.ancestor)
                r.ancestor.value[r.key] = r.value;
            return r.value;
        },
        /**
         * @method post
         * @param  {Object} object
         * @param  {Object} options (optional)
         * @return {Object} the inserted object (decorated with it's id)
         */
        post : function (object, options)
        {
            options = options || {};
            if(!object.id)
                object.id = new Date().valueOf()+""; // mongo styled id
            var schema = options.schema || this.schema;
            var res = deep.query(this.collection,"./*?id="+object.id);
            if(res && res.length > 0)
                return deep.errors.Store("deep.store.Collection.post : An object has the same id before post : please put in place : object : ",object);
            if(schema)
            {
                var report = deep.validate(object, schema);
                if(!report.valid)
                    return deep.errors.PreconditionFail("Failed to put on collection : validation failed.", report);
            }
            this.collection.push(object);
            return object;
        },
        /**
         * @method del
         * @param  {String} id
         * @param  {Object} options no options for the moment
         * @return {Object} the removed object
         */
        del : function (id, options) {
            var removed = deep(this.collection).remove("./*?id="+id).success();
            if(removed)
                removed = removed.shift();
            return removed;
        },
        /**
         * @method patch
         * @param  {Object} object  the update to apply to object
         * @param  {Object} options  could contain 'id'
         * @return {deep.Chain} a chain that hold the patched object and has injected values as success object.
         */
        patch : function (object, options)
        {
            options = options || {};
            var id = options.id || object.id;
            if(!id)
                return deep(deep.errors.Store("Collection store need id on patch"));

            var r = deep.query(this.collection, "./*?id="+id, { resultType:"full"});
            if(!r)
                return deep.errors.NotFound("no items found in collection with : "+id);
            r = r.shift();
            var val = deep.utils.copy(r.value);
            deep.utils.up(object,val);
            var schema = options.schema || this.schema;
            if(schema)
            {
                var report = deep.validate(val, schema);
                if(!report.valid)
                    return deep.errors.PreconditionFail("Failed to patch on collection : validation failed.", report);
            }
            r.value = val;
            if(r.ancestor)
                r.ancestor.value[r.key] = val;
            return r.value;
        },
        /**
         * select a range in collection
         * @method range
         * @param  {Number} start
         * @param  {Number} end
         * @return {deep.Chain} a chain that hold the selected range and has injected values as success object.
         */
        range : function (start, end) {
            return deep(this.collection).range(start,end).success();
        }
    }
    //__________________________________________________________________________________`
	/**
	 * A store based on simple object
	 * @class deep.store.Object
	 * @constructor
	 * @param {Object} obj the root object to hold
	 * @param {Object} options could contain 'schema'
	 */
	deep.store.Querier = function (protocole, root, schema)
	{
		if (!(this instanceof deep.store.Querier))
			return new deep.store.Querier(protocole, root, schema);
        deep.Store.call(this);
		deep.utils.bottom(deep.Store.prototype, this);
		if(root)
			this.root = root;
		else
			this.root = {};
		this.schema = schema;
		if(protocole)
			deep.protocole(protocole, this);
		return this;
	}

	deep.store.Querier.prototype = {


		/**
		 *
		 * @method get
		 * @param  {String} id
		 * @return {deep.Chain} depending on first argument : return an object or an array of objects
		 */
		get : function (id, options)
		{
			//if(id === "" || !id || id === "*")
			if(id[0] == "." || id[0] == "/")
				return deep.query(this.root, id);
			return deep.query(this.root, "./"+id);
		},
		/**
		 * @method put
		 * @param  {[type]} object
		 * @param  {[type]} query
		 * @return {[type]}
		 */
		put : function (object, options)
		{
            options = options || {};
            var id = options.id;
            if(!id)
                return deep(deep.errors.Store("QuerierStore need id on put"));
            var r = deep.query(this.root, id, { resultType:"full"});
            if(!r)
                return deep.errors.NotFound("QuerierStore.put : no items found in collection with : "+id);
            r = r.shift();
            var schema = options.schema || this.schema;
            if(schema)
            {
                var report = deep.validate(object, schema);
                if(!report.valid)
                    return deep.errors.PreconditionFail("Failed to put on QuerierStore : validation failed.", report);
            }
            r.value = object;
            if(r.ancestor)
                r.ancestor.value[r.key] = object;
            return r.value;
		},
		/**
		 * @method post
		 * @param  {[type]} object
		 * @param  {[type]} path
		 * @return {[type]}
		 */
		post : function (object, options)
        {
            options = options || {};
            var id = options.id;
            var schema = options.schema || this.schema;
            var res = deep.query(this.collection, id);
            if(res && res.length > 0)
                return deep.errors.Store("deep.store.Querier.post : An object has the same id before post : please put in place : object : ",object);
            if(schema)
            {
                var report = deep.validate(object, schema);
                if(!report.valid)
                    return deep.errors.PreconditionFail("Failed to put on deep.store.Querier : validation failed.", report);
            }
            deep(this.root).setByPath(path, object);
            return object;
        },
		/**
		 * @method del
		 * @param  {[type]} id
		 * @return {[type]}
		 */
		del : function (id)
		{
			var res = [];
			if(id[0] == "." || id[0] == "/")
				deep(obj).remove(id)
				.done(function (removed)
				{
					res = removed;
				});
			else
				deep(obj)
				.remove("./"+id)
				.done(function (removed)
				{
					res = removed;
				});
            if(res)
                return res.shift();
            return res;
		},
		/**
		 * @method patch
		 * @param  {[type]} object
		 * @param  {[type]} id
		 * @return {[type]}
		 */
		patch : function (object, id)
		{
			if(id[0] == "." || id[0] == "/")
				deep(obj).query(id).up(object);
            else
                deep(obj).query("./"+id).up(object);
		}
	}

	deep.store.Selector = function (protocole, root, selector)
	{
        if (!(this instanceof deep.store.Selector))
			return new deep.store.Selector(protocole, root, selector);
        deep.Store.call(this);
		deep.utils.bottom(deep.Store.prototype, this);
		if(root)
			this.root = root;
		this.selector = selector;
		if(protocole)
			deep.protocole(protocole, this);
		return this;
    }
    deep.store.Selector.prototype = {
		/**
		 *
		 * @method get
		 * @param  {String} id
		 * @return {deep.Chain} depending on first argument : return an object or an array of objects
		 */
		get : function (id, options)
		{
            var root = this.root || this;
			options = options || {};
			var nodes = deep.query(root, ".//?"+this.selector);
            //console.profile("e");
            var code = "return "+deep.parseSelector(id)+";";
            var func = new Function(code);
            var self = this;
            var res = [];
            nodes.forEach(function(n){
                var o = {}
                n[self.selector].forEach(function(i){
                    o[i] = true;
                });
                o.___func___ = func;
                if(o.___func___())
                res.push(n);
            })
            //console.profileEnd("e");
            return res;
		}
	};

    //_______________________________________________________

    deep.parseSelector = function(selector)
    {
        var char = selector[0];
        var final = "";
        var index = 0;
        while(char)
        {
            //console.log("base char : ", char, index);
            switch(char)
            {
                case '|':
                case '&':
                case '(':
                case ')':
                case '!':

                    final += char;
                    char = selector[++index];
                    //console.log("recatched : ",char, index);
                    break;
                default:
                    final += "this.";
                    var count = index;
                    while(char)
                    {
                        //console.log("var char : ", char, index);
                        var shouldBreak = false;
                        switch(char)
                        {
                            case '|':
                            case '&':
                            case '(':
                            case ')':
                            case '!':
                                shouldBreak = true;
                                break;
                        }
                        if(shouldBreak)
                        {
                            final += selector.substring(index,count);
                            index = count;
                            break;
                        }
                        char = selector[++count];
                    }
            }

        }
        return final;
    }

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
		var subprotocole = null;
		if(protoIndex > -1)
		{
			protoc = request.substring(0,protoIndex);
			var subprotoc = protoc.split(".");
			if(subprotoc.length > 1)
			{
				protoc = subprotoc.shift();
				subprotocole = subprotoc.join(".");
			}
			uri = request.substring(protoIndex+2);
		}

		var queryThis = false;
		if(request[0] == '#' || protoc == "first" || protoc == "last" || protoc == "this")
		{
			store = deep.protocoles.queryThis;
			queryThis = true;
		}
		else if(!protoc)
		{
			//console.log("no protocole : try extension");
			deep.extensions.some(function(storez){
				if(!storez.extensions)
					return;
				for(var j = 0; j < storez.extensions.length; ++j)
				{
					var extension = storez.extensions[j];
					if(uri.match(extension))
					{
						store = storez.store;
						break;
					}
				}
				if(store)
					return true;
				return false;
			});
		}
		else
		{
			store = deep.protocoles.store(protoc);
		}
		//console.log("store : ", store)
		var res = {
			_deep_request_:true,
			request:request,
			queryThis:queryThis,
			store:store,
			protocole:protoc,
			subprotocole:subprotocole,
			uri:uri
		};
		//console.log("deep.parseRequest : results : ", res);
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
			//console.log("get all : ", request, options);
			alls.push(deep.get(request,options));
		});
		return deep.all(alls);
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
		if(typeof request !== "string" && !request._deep_request_)
			return request;
		options = options || {};
		var infos = request;
		if(typeof infos === 'string')
			infos = deep.parseRequest(request, options);
		var res = null;
		//console.log("deep.get : infos : ", infos);
		if(!infos.store)
			if(!infos.protocole)
				return request;
			else
				return deep.errors.Store("no store found with : "+request, infos);
		else if(infos.subprotocole)
		{
			//console.log("deep.get with subprotocole : ", infos.subprotocole)
			var type = typeof infos.store;
			if(infos.store._deep_ocm_)
			{
				var o = infos.store();
				if(typeof o[infos.subprotocole] === 'object')
					res = deep.query(o[infos.subprotocole],infos.uri, options);
				else
				{
					//console.log("get with subprotoc: ",infos, infos.subprotocole);
					o = o.store(infos.subprotocole);
					if(!o)
						return deep.errors.Store("no store found with : "+request, infos);
					//console.log("store getted : ",o);
					res = o.get(infos.uri, options);
				}
			}
			else if(typeof infos.store[infos.subprotocole] === 'function')
				res = infos.store[infos.subprotocole](infos.uri, options);
			else if(typeof infos.store[infos.subprotocole] === 'object')
			{
				if(infos.store[infos.subprotocole].get)
					res = infos.store[infos.subprotocole].get(infos.uri, options);
				else
					res = deep.query(infos.store[infos.subprotocole],infos.uri, options);
			}
		}
		else
		{
			var type = typeof infos.store;
			if(typeof infos.store.get === 'function')
				res = infos.store.get(infos.uri, options);
			else if(type === 'function')
				res = infos.store(infos, options);
			else
				return deep.errors.Store("no store found with : "+request, infos);
		}

		if(options.wrap)
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
			});
		return res;
	};
	// ___________________________________________________________________________ BASICAL PROTOCOLES
	deep.protocoles = {
		/**
		 * options must contain the entry from where start query
		 * @param  {[type]} request [description]
		 * @param  {[type]} options [description]
		 * @return {[type]}         [description]
		 */
		queryThis:function (request, options)
		{
			var entry = options.entry;
			var root = entry.root || entry;
			//console.log("deep.stores.queryThis : ", request, " - root ? ", entry.root)

			var infos = request;
			if(typeof infos === 'string')
				infos = deep.parseRequest(infos);
			if(infos.uri[0] == '#')
				infos.uri = infos.uri.substring(1);
			var res = null;
			//console.log("uri : ", infos.uri);
			if(infos.uri.substring(0,3) == "../")
			{
				infos.uri = ((entry.path != "/")?(entry.path+"/"):"")+infos.uri;
				//console.log("queryThis with ../ start : ",root.value)
				res = deep.query(root, infos.uri, { keepCache:false });
				//console.log("res : ",res);
			}
			else if(infos.uri[0] == '/')
				res = deep.query(root, infos.uri, { keepCache:false });
			else
				res = deep.query(entry, infos.uri, { keepCache:false });

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
		},
		store:function(path, options)
		{
			//console.log("deep.protocoles.store : ", path, options);
			if(typeof path === 'object')
				path = path.uri;
			if(deep.protocoles[path])
				return deep.protocoles[path];
			var splitted = path.split(".");
			if(splitted.length > 1)
			{
				var proto = deep.protocoles[splitted.shift()];
				//console.log("deep.protocoles.store start with : ",proto);
				while(proto && splitted.length > 0)
				{
					if(proto._deep_ocm_)
					{
						var p = proto();
						//console.log("deep.protocoles.store : got ocm : ",p)
						var rest = splitted.join(".");
						//console.log("deep.protocoles.store : ocm rest : ",rest)
						proto = p[rest]
						if(!proto)
							proto = p.store(rest, true);
						splitted = [];
						//console.log("proto.store give : ",proto);
						break;
					}
					//console.log("_____")
					proto = deep.protocoles[splitted.shift()];
				}
				//console.log("final proto : ", proto, splitted);
				if(!proto || splitted.length > 0)
					return deep.errors.Protocole("no protocole found with : "+path);
				return proto;
			}
			return null;
		},
		js:function (path, options) {
			if(typeof path === 'object')
				path = path.uri;
			var def = deep.Deferred();
			try{
				require([path], function(obj){
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
			return def.promise();
		},
		aspect:function(path, options){
			return deep.protocoles.js(path, options)
			.done(function(res){
				return res.aspect;
			});
		},
		instance:function (path, options) {
			return deep.protocoles.js(path, options)
			.done(function(cl){
				if(typeof cl === 'function')
					return new cl();
				//console.log("deep.stores.instance  : could not instanciate : "+JSON.stringify(id));
				return new Error("deep.protocoles.instance  : could not instanciate : "+JSON.stringify(id));
			});
		}
	}

    /**
     *
     */
    deep.protocole = function (name, ctrl)
	{
		deep.protocoles[name] = ctrl;
		return ctrl;
	}

    //______________________________________________________________________ CHAIN DECORATION
	deep.Chain.addHandle("store", function(name)
	{
		var self = this;
		var func = function(s,e){
			//console.log("deep.Chain.store : ", name);
			if(typeof name === 'string')
			{
				self._storeName = name;
				self._store = null;
			}
			else{
				self._storeName = name.name;
				self._store = name;
			}
			deep.chain.position(self, self._storeName);
		}
		deep.Store.extendsChain(self);
		func._isDone_ = true;
		deep.chain.addInChain.apply(self,[func]);
		return this;
	});

	deep.Store.extendsChain = function (handler) {
			//console.log("store decoration");
			deep.utils.up({
				get : function (id, options)
				{
					var self = this;
					if(id == "?" || !id)
						id = "";
					var func = function (s,e) {
						var store = self._store || deep.protocoles.store(self._storeName);
						if(store instanceof Error)
							return store;
						if(!store)
							return deep.errors.Store("no store declared in chain. aborting GET !");
						if(!store.get)
							return deep.errors.Store("provided store doesn't have GET. aborting GET !");
						return deep.when(store.get(id, options))
						.done(function (success) {
							//console.log("deep(...).store : get : success : ", success);
							self._nodes = [deep.Querier.createRootNode( success, null, {uri:id})]
						});
					};
					deep.chain.addInChain.apply(this,[func]);
					self.range = deep.Chain.range;
					return self;
				},
				post : function (object, id, options)
				{
					var self = this;
					var func = function (s,e)
					{
						var store = self._store || deep.protocoles.store(self._storeName);
						if(store instanceof Error)
							return store;
						if(!store)
							return deep.errors.Store("no store declared in chain. aborting POST !");
						if(!store.post)
							return deep.errors.Store("provided store doesn't have POST. aborting POST !");
						//console.log("deep.Chain.post : got store : ",store);
						return deep.when(store.post(object || deep.chain.val(self),id, options))
						.done(function (success) {
							self._nodes = [deep.Querier.createRootNode(success)];
						});
					};
					self.range = deep.Chain.range;
					deep.chain.addInChain.apply(this,[func]);
					return self;
				},
				put :function (object, options)
				{
					var self = this;
					//console.log("deep.chain.put : add in chain : ", object, id);
					var func = function (s,e) {
						var store = self._store || deep.protocoles.store(self._storeName);
						if(store instanceof Error)
							return store;
						if(!store)
							return deep.errors.Store("no store declared in chain. aborting PUT !");
						if(!store.put)
							return deep.errors.Store("provided store doesn't have PUT. aborting PUT !");
						return deep.when(store.put(object  || deep.chain.val(self), options))
						.done(function (success) {
							self._nodes = [deep.Querier.createRootNode(success)];
						});
					};
					self.range = deep.Chain.range;
					deep.chain.addInChain.apply(this,[func]);
					return self;
				},
				patch :function (object, id, options)
				{
					var self = this;
					var func = function (s,e)
					{
						var store = self._store || deep.protocoles.store(self._storeName);
						if(store instanceof Error)
							return store;
						if(!store)
							return deep.errors.Store("no store declared in chain. aborting PATCH !");
						if(!store.patch)
							return deep.errors.Store("provided store doesn't have PATCH. aborting PATCH !");
						return deep.when(store.patch(object  || deep.chain.val(self),id, options))
						.done(function (success) {
							self._nodes = [deep.Querier.createRootNode(success)];
						});
					};
					self.range = deep.Chain.range;
					deep.chain.addInChain.apply(this,[func]);
					return self;
				},
				del : function (id, options)
				{
					var self = this;
					var func = function (s,e)
					{
						var store = self._store || deep.protocoles.store(self._storeName);
						if(store instanceof Error)
							return store;
						if(!store)
							return deep.errors.Store("no store declared in chain. aborting DELETE !");
						if(!store.del)
							return deep.errors.Store("provided store doesn't have DEL. aborting DELETE !");
						var val = deep.chain.val(self);
						return deep.when(store.del(id || val.id, options))
						.done(function (success) {
							self._nodes = [deep.Querier.createRootNode(success)];
						});
					};
					self.range = deep.Chain.range;
					deep.chain.addInChain.apply(this,[func]);
					return self;
				},
				rpc : function (method, body, uri, options)
				{
					var self = this;
					var func = function (s,e) {
						var store = self._store || deep.protocoles.store(self._storeName);
						if(store instanceof Error)
							return store;
						if(!store)
							return deep.errors.Store("no store declared in chain. aborting RPC !");
						if(!store.rpc)
							return deep.errors.Store("provided store doesn't have RPC. aborting RPC !");
						return deep.when(store.rpc(method, body, uri, options))
						.done(function (success) {
							self._nodes = [deep.Querier.createRootNode(success)];
						});
					};
					self.range = deep.Chain.range;
					deep.chain.addInChain.apply(this,[func]);
					return self;
				},
				range :function (arg1, arg2, uri, options)
				{
					var self = this;
					var func = function (s,e) {
						var store = self._store || deep.protocoles.store(self._storeName);
						if(store instanceof Error)
							return store;
						if(!store)
							return deep.errors.Store("no store declared in chain. aborting RANGE !");
						if(!store.range)
							return deep.errors.Store("provided store doesn't have RANGE. aborting RANGE !");
						return deep.when(store.range(arg1, arg2, uri, options))
						.done(function (success) {
							self._nodes = [deep.Querier.createRootNode(success)];
						});
					};
					self.range = deep.Chain.range;
					deep.chain.addInChain.apply(this,[func]);
					return self;
				},
				bulk : function (arr, uri, options)
				{
					var self = this;
					var func = function (s,e) {
						var store = self._store || deep.protocoles.store(self._storeName);
						if(store instanceof Error)
							return store;
						if(!store)
							return deep.errors.Store("no store declared in chain. aborting BULK !");
						if(!store.bulk)
							return deep.errors.Store("provided store doesn't have BULK. aborting BULK !");
						return deep.when(store.bulk(arr, uri, options))
						.done(function (success) {
							self._nodes = [deep.Querier.createRootNode(success)];
						});
					};
					self.range = deep.Chain.range;
					deep.chain.addInChain.apply(this,[func]);
					return self;
				}
			}, handler);
			return handler;
		};

	   return deep;
	}
});
