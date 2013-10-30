/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 *
 * TODO : 
 *     - files extensions matching optimisation
 *     - add optimised mode that do not return deep chain handle for any HTTP verb (to be used when stores are used from within a chain)
 *     - check range object usage in chain
 */

if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require"], function (require) {

    return function (deep) {
        //________________________________________________________________________________________
        if (typeof requirejs !== 'undefined')
            requirejs.onError = function (err) {
                console.log('requirejs OnError : ' + err);
                console.log(err.requireType);
                if (err.requireType === 'timeout')
                    console.log('modules: ' + err.requireModules);
                //throw err;
        };

        deep.extensions = [];


        /**
	 * start chain setted with a certain store
	 * @example
	 *
	 * deep.store("json").get("/campaign/").log();

	 *  ...
	 *  deep.store("campaign").get("?").log()
	 *
	 *
	 * @class deep.store
     * @constructor
	 */
    
        deep.store = function (name) {
            //	console.log("deep.store(name) : ",name)
            return deep(deep.getStoreHandler(name)).transform(function(handler){
                return handler.store;
            })
            .store(name);
        };

        /**
         * Empty class : Just there to get instanceof working (be warning with iframe issue in that cases).
         * @class deep.Store
         * @constructor
         */
        deep.Store = function (protocole) {
            this.protocole = protocole;
            if (protocole)
                deep.protocole(protocole, this);
            this._deep_store_ = true;
            //console.log("deep.Store : protocole : ", protocole);
        };
        deep.Store.prototype = {
            _deep_store_: true,

            wrap:function(){
                var self = this;
                return function(){
                    return self;
                };
            }
        };
        //_____________________________________________________________________ COLLECTION STORE
        /**
         * A store based on simple array
         * @class deep.store.Collection
         * @constructor
         * @param {Array} arr a first array of objects to hold
         * @param {Object} options could contain 'schema'
         */
        deep.store.Collection = deep.compose.Classes(deep.Store,
        function (protocole, collection, schema, options) {
            if (collection)
                this.collection = collection;
            if(schema)
                this.schema = schema;
            if(options)
                deep.utils.up(options, this);
        },
        {
            /**
             * @method init
             */
            init: deep.compose.parallele(function () {
                var self = this;
                //console.log("deep.store.Collection.init : this.collection : ", this.collection, " - this.schema : ", this.schema);
                this.collection = this.collection || [];
                if (typeof this.collection === 'string' || typeof this.schema === 'string')
                    return deep(this)
                        .query("./[collection,schema]")
                        .load()
                        .done(function(success){
                             return self;
                        });
            }),
            /**
             * @method get
             * @param  {String} id the id of the object to retrieve. Could also be a (deep)query.
             * @param {Object} options an options object (here there is no options)
             * @return {Object} the retrieved object
             */
            get: function (id, options) {
                options = options || {};
                //console.log("deep.store.Collection.get : ",id," - stock : ", this.collection)
                var q = "";
                var queried = false;
                if(!id)
                {
                    q = "./*";
                    queried = true;
                }
                else if (id[0] == "*")
                {
                    q = "./"+id;
                    queried = true;
                }
                else if(id[0] == "?")
                {
                    q = "./*"+id;
                    queried = true;
                }
                else
                    q = "./*?id=" + id;
                //console.log("deep.store.Collection.get : q :",q);
                var col = this.collection;
                if(this.collection._deep_ocm_)
                    col = this.collection();
                var r = deep.query(col, q);
                //console.log("deep.store.Collection.get : res :",r);
                if (!queried && r instanceof Array)
                    r = r.shift();
                if(typeof r === 'undefined')
                    return deep.when(deep.errors.NotFound());
                return deep.when(r);
            },
            /**
             * @method put
             * @param  {Object} object the object to update
             * @param  {Object} options an options object : could contain 'id'
             * @return {Object} the updated object
             */
            put: function (object, options) {
                options = options || {};
                var id = options.id || object.id;
                if (!id)
                    return deep.when(deep.errors.Store("Collection store need id on put"));

                var col = this.collection;
                if(this.collection._deep_ocm_)
                    col = this.collection();

                var r = deep.query(col, "./*?id=" + id, { resultType: "full" });
                if (!r || r.length === 0)
                    return deep.when(deep.errors.NotFound("no items found in collection with : " + id));
                r = r.shift();
                if(options.query)
                {
                    r.value = deep.utils.copy(r.value);
                    deep.utils.replace(r.value, options.query, object);
                }
                else
                {
                    if(!object.id)
                        object.id = options.id;
                    r.value = object;
                }

                var schema = this.schema;
                if(schema)
                {
                    if(schema._deep_ocm_)
                        schema = schema("put");
                    var report = deep.validate(r.value, schema);
                    if(!report.valid)
                        return deep.when(deep.errors.PreconditionFail(report));
                }

                if (r.ancestor)
                    r.ancestor.value[r.key] = r.value;
                return deep.when(r.value);
            },
            /**
             * @method post
             * @param  {Object} object
             * @param  {Object} options (optional)
             * @return {Object} the inserted object (decorated with it's id)
             */
            post: function (object, options) {
                //console.log("deep.store.Collection.post : ", object, options);
                options = options || {};
                options.id = options.id || object.id;
                if (!options.id)
                    object.id = options.id = "id"+new Date().valueOf(); // mongo styled id
                if(!object.id)
                    object.id = options.id;
                var col = this.collection;
                if(this.collection._deep_ocm_)
                    col = this.collection();
                var res = deep.query(col, "./*?id=" + object.id);
                if (res && res.length > 0)
                    return deep.when(deep.errors.Store("deep.store.Collection.post : An object has the same id before post : please put in place : object : ", object));
                col.push(object);
                return deep.when(object);
            },
            /**
             * @method del
             * @param  {String} id
             * @param  {Object} options no options for the moment
             * @return {Object} the removed object
             */
            del: function (id, options) {
                var col = this.collection;
                if(this.collection._deep_ocm_)
                    col = this.collection();
                var removed = deep(col).remove("./*?id=" + id).done();
                if (removed)
                    removed = removed.shift();
                return deep.when(removed);
            },
            /**
             * @method patch
             * @param  {Object} object  the update to apply to object
             * @param  {Object} options  could contain 'id'
             * @return {deep.Chain} a chain that hold the patched object and has injected values as success object.
             */
    
            /**
             * select a range in collection
             * @method range
             * @param  {Number} start
             * @param  {Number} end
             * @return {deep.Chain} a chain that hold the selected range and has injected values as success object.
             */
            range: function (start, end) {
                var col = this.collection;
                if(this.collection._deep_ocm_)
                    col = this.collection();
                return deep(col).range(start, end);
            },
            flush:function(){
                this.collection = [];
            }
        });

        deep.store.Collection.create = function(protocole, collection, schema, options)
        {
            return new deep.store.Collection(protocole, collection, schema, options);
        };

        //__________________________________________________________________________________ OBJECT store
        /**
         * A store based on simple object
         * @class deep.store.Object
         * @constructor
         * @param {Object} obj the root object to hold
         * @param {Object} options could contain 'schema'
         */
        deep.store.Object = deep.compose.Classes(deep.Store,
        function (protocole, root, schema, options) {
            if (root)
                this.root = root;
            if(schema)
                this.schema = schema;
            if(options)
                deep.utils.up(options, this);
            this.root = this.root || {};
        },
        {
            /**
             *
             * @method get
             * @param  {String} id
             * @return {deep.Chain} depending on first argument : return an object or an array of objects
             */
            get: function (id, options) {
                //if(id === "" || !id || id === "*")
                var root = this.root || this;
                if(root._deep_ocm_)
                    root = root();
                if (id[0] == "." || id[0] == "/")
                    return deep.when(deep.query(root, id));
                return deep.when(deep.query(root, "./" + id));
            },
            /**
             * @method put
             * @param  {[type]} object
             * @param  {[type]} query
             * @return {[type]}
             */
            put: function (object, options) {
                options = options || {};
                var root = this.root || this;
                if(root._deep_ocm_)
                    root = root();
                var id = options.id || object.id;
                if (!id)
                    return deep.when(deep.errors.Store("QuerierStore need id on put"));
                
                var r = deep.query(root, id, { resultType: "full", allowStraightQueries:false });
                if (!r || r.length === 0)
                    return deep.when(deep.errors.NotFound("QuerierStore.put : no items found in collection with : " + id));
                r = r.shift();
                
                if(options.query)
                {
                    r.value = deep.utils.copy(r.value);
                    deep.utils.replace(r.value, options.query, object);
                }
                else
                {
                    if(!object.id)
                        object.id = id;
                    r.value = object;
                }
                var schema = this.schema;
                if(schema)
                {
                    if(schema._deep_ocm_)
                        schema = schema("put");
                    var report = deep.validate(r.value, schema);
                    if(!report.valid)
                        return deep.when(deep.errors.PreconditionFail(report));
                }
                if (r.ancestor)
                    r.ancestor.value[r.key] = r.value;
                
                return deep.when(r.value);
            },
            /**
             * @method post
             * @param  {[type]} object
             * @param  {[type]} path
             * @return {[type]}
             */
            post: function (object, options) {
                options = options || {};
                var root = this.root || this;
                if(root._deep_ocm_)
                    root = root();
                var id = object.id || options.id;
                var res = deep.query(root, id);
                if (res && res.length > 0)
                    return deep.when(deep.errors.Store("deep.store.Object.post : An object has the same id before post : please put in place : object : ", object));
                deep(root).setByPath(id, object);
                return deep.when(object);
            },
            /**
             * @method del
             * @param  {[type]} id
             * @return {[type]}
             */
            del: function (id) {
                var res = [];
                var root = this.root || this;
                if(root._deep_ocm_)
                    root = root();
                if (id[0] == "." || id[0] == "/")
                    deep(root).remove(id)
                        .done(function (removed) {
                        res = removed;
                    });
                else
                    deep(root)
                        .remove("./" + id)
                        .done(function (removed) {
                        res = removed;
                    });
                if (res)
                    res = res.shift();
                return deep.when(res);
            },
            /**
             * @method fluch
             */
            flush:function(){
                this.root = {};
            }
        });

        deep.store.Object.create = function(protocole, root, schema)
        {
            return new deep.store.Object(protocole, root, schema);
        };

       
        //_______________________________________________________________________________ GET/GET ALL  REQUESTS

        deep.getStoreHandler = function(protocole)
        {
            //console.log("deep.getStoreHandler : protocle : ", protocole);
            var handler = {
                method:"get",
                store:null
            };
            if(typeof protocole === 'object')
                handler.store = protocole;
            else if(deep.protocoles[protocole])
                handler.store = deep.protocoles[protocole];
            else
            {
                var splitted = protocole.split(".");
                handler.store = deep.protocoles[splitted.shift()];
                if(!handler.store)
                    return deep.when(deep.errors.Store("no store found with : "+protocole));
                handler.method = splitted.shift();
                if(!handler.store[handler.method])
                    return deep.when(deep.errors.Store("no method found in store with : "+protocole));
            }
            if(handler.store._deep_ocm_)
                handler.store = handler.store();
            if(typeof handler.store === 'function')
                handler.store = {
                    _deep_store_:true,
                    get:handler.store
                };
            if(handler.store.init)
                return deep.when(handler.store.init())
                .done(function(){
                    return handler;
                });
            return deep.when(handler);
        };


        /**
         * parse 'retrievable' string request (e.g. "json::test.json")
         * @for deep
         * @method parseRequest
         * @static
         * @param  {String} request
         * @return {Object} infos an object containing parsing result
         */
        deep.parseRequest = function (request, options) {
            // console.log("parse request : ", request);
            var protoIndex = request.substring(0,50).indexOf("::");
            var protoc = null;
            var uri = request;
            var store = null;
            if (protoIndex > -1) {
                protoc = request.substring(0, protoIndex);
                uri = request.substring(protoIndex + 2);
            }
            //console.log("protoco found : ", protoc, " - uri : ", uri);
            //var queryThis = false;
            if (request[0] == '#' || protoc == "first" || protoc == "last" || protoc == "this") {
                store = deep.getStoreHandler(deep.protocoles.dq);
              //  queryThis = true;
            } else if (!protoc) {
                //console.log("no protocole : try extension");
                var founded = deep.extensions.some(function (storez)
                {
                    if (!storez.extensions)
                        return;
                    for (var j = 0; j < storez.extensions.length; ++j)
                    {
                        var extension = storez.extensions[j];
                        if (uri.match(extension)) {
                            store = storez.store;
                            break;
                        }
                    }
                    if (store)
                        return true;
                    return false;
                });
                if(founded)
                    store = deep.getStoreHandler(store);
            }
            else
            {
                store = deep.getStoreHandler(protoc);
            }
            //console.log("parseRequest : protocole used : ",protoc, " - uri :",uri);
            //console.log("parseRequest : store : ", store);
            var res = {
                _deep_request_: true,
                request: request,
                store: store,
                protocole: protoc,
                uri: uri
            };
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
        deep.getAll = function (requests, options) {
            var alls = [];
            requests.forEach(function (request) {
                //console.log("get all : ", request, options);
                alls.push(deep.get(request, options));
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
        deep.get = function (request, options) {
            if (!request || (typeof request !== "string" && !request._deep_request_))
                return deep.when(request);
            options = options || {};
            var infos = request;
            if (typeof infos === 'string')
                infos = deep.parseRequest(request, options);
            var res = null;
            //console.log("deep.get : infos : ", infos);
            if (!infos.store && !infos.protocole)
                return deep.when(request);
            var doAction = function(storeHandler){
                var res = storeHandler.store[storeHandler.method](infos.uri, options);
                //console.log("deep.get "+infos.request+" result : ",res)
                if (options.wrap)
                {
                    return deep.when(res)
                    .done(function (res) {
                        if (options.wrap.result) {
                            if (typeof options.wrap.result.push === 'function')
                                options.wrap.result.push(res);
                            else
                                options.wrap.result = [].concat(options.wrap.result);
                        } else
                            options.wrap.result = res;
                        return options.wrap;
                    });
                }
                else
                    return res;
            };
            return deep.when(infos.store)
            .done(doAction);
        };
        // ___________________________________________________________________________ BASICAL PROTOCOLES
        deep.protocoles = {
            /**
             * deep-query protocole :
             * for code-sheet usage.
             * 
             * options must contain the entry from where start query
             * @param  {[type]} request [description]
             * @param  {[type]} options [description]
             * @return {[type]}         [description]
             */
            dq:{
                get: function dqGet(request, options) {
                    var entry = options.entry;
                    if(!entry)
                        return undefined;
                    var root = entry.root || entry;
                    //console.log("deep.stores.queryThis : ", request, " - root ? ", entry.root)

                    var infos = request;
                    if (typeof infos === 'string')
                        infos = deep.parseRequest(infos);
                    if (infos.uri[0] == '#')
                        infos.uri = infos.uri.substring(1);
                    var res = null;
                    options = options || {};
                    options.keepCache = false;
                    //console.log("uri : ", infos.uri);
                    if (infos.uri.substring(0, 3) == "../") {
                        infos.uri = ((entry.path != "/") ? (entry.path + "/") : "") + infos.uri;
                        //console.log("queryThis with ../ start : ",root.value)
                        res = deep.query(root, infos.uri, options);
                        //console.log("res : ",res);
                    } else if (infos.uri[0] == '/')
                        res = deep.query(root, infos.uri, options);
                    else
                        res = deep.query(entry, infos.uri, options);
                    return res;
                }
            },
            js: function (path, options) {
                if (typeof path === 'object')
                    path = path.uri;
                var def = deep.Deferred();
                try {
                    require([path], function (obj) {
                        def.resolve(obj);
                    }, function (err) {
                        //console.log("require get error : ", err);
                        def.reject(err);
                    });
                } catch (e) {
                    //console.log("require get errors catched : ", e);
                    def.reject(e);
                }
                return def.promise();
            },
            instance: function (path, options) {
                return deep.protocoles.js(path, options)
                    .done(function (Cl) {
                    if (typeof Cl === 'function')
                        return new Cl();
                    //console.log("deep.stores.instance  : could not instanciate : "+JSON.stringify(id));
                    return deep.errors.Internal("deep.protocoles.instance  : could not instanciate : " + JSON.stringify(path));
                });
            }
        };



        /**
         * 
         */
        deep.protocole = function (name, ctrl) {
            if(ctrl)
            {
                deep.protocoles[name] = ctrl;
                return ctrl;
            }
            return deep.protocoles[name];
        };

        deep.protocole.SheetProtocoles = {
                //________________________________________ SHEET PROTOCOLES
                up:function (request, options) {
                    options = options || {};
                    var self = this;
                    return function dodqUP(layer){
                        options.allowStraightQueries = false;
                        options.resultType = "full";
                        return deep.when(self.get(request, options))
                        .done(function(r){
                            var modified = [];
                            //console.log("sheet up protocole : getted : ", r );
                            if(r)
                                r.forEach(function(item){
                                    var value = item;
                                    if(item._isDQ_NODE_)
                                        value = item.value;
                                    var f = deep.utils.up(layer, value, options.shema);
                                    if(item.ancestor)
                                        item.ancestor.value[item.key] = f;
                                    modified.push(f);
                                });
                            return modified;
                        });
                    };
                },
                bottom:function (request, options) {
                    options = options || {};
                    var self = this;
                    return function dodqBottom(layer){
                        options.allowStraightQueries = false;
                        options.resultType = "full";
                        return deep.when(self.get(request, options))
                        .done(function(r){
                            var modified = [];
                            if(r)
                                r.forEach(function(item){
                                    var value = item;
                                    if(item._isDQ_NODE_)
                                        value = item.value;
                                    var f = deep.utils.bottom(layer, value, options.shema);
                                    if(item.ancestor)
                                        item.ancestor.value[item.key] = f;
                                    modified.push(f);
                                });
                            return modified;
                        });
                    };
                },
                series:function (request, options) {
                    options = options || {};
                    var self = this;
                    return function dodqSeries(fn){
                        options.allowStraightQueries = false;
                        options.resultType = null;
                        return deep.when(self.get(request, options))
                        .done(function(r){
                            var results = [];
                            var err = null;
                            if(r && r.length > 0)
                            {
                                var def = deep.Deferred();
                                var end = function(){
                                    if(err)
                                        def.reject(err);
                                    else
                                        def.resolve(results);
                                };
                                var cycle = function(){
                                    var item = r.shift();
                                    var output = null;
                                    if(typeof fn === 'string')
                                    {
                                        if(typeof item[fn] === 'function')
                                            output = item[fn]();
                                    }
                                    else
                                        output = fn.apply(item);
                                    if(output instanceof Error)
                                    {
                                        err = output;
                                        return end();
                                    }
                                    if(output && output.then)
                                        deep.when(output)
                                        .done(function (s){
                                            results.push(s);
                                            if(r.length > 0)
                                                cycle();
                                            else end();
                                        })
                                        .fail(function (error) {
                                            def.reject(error);
                                        });
                                    else {
                                        results.push(output);
                                        if(r.length > 0)
                                            cycle();
                                        else end();
                                    }
                                };
                                cycle();
                                return def.promise();
                            }
                            return results;
                        });
                    };
                },
                parallele:function (request, options) {
                    options = options || {};
                    var self = this;
                    return function dodqParallele(fn){
                        return deep.all(self.call(request, options)(fn));
                    };
                },
                call:function (request, options) {
                    options = options || {};
                    var self = this;
                    return function dodqCall(fn){
                        options.allowStraightQueries = false;
                        options.resultType = null;
                        return deep.when(self.get(request, options))
                        .done(function(r){
                            //console.log("sheet call protocole : getted : ", r );
                            var res = [];
                            if(r)
                            r.forEach(function(item){
                                //console.log("dq.call : on : ", item)
                                if(typeof fn === 'string')
                                {
                                    if(typeof item[fn] === 'function')
                                        res.push(item[fn]());
                                    else
                                        res.push(undefined);
                                }
                                else
                                    res.push(fn.apply(item));
                            });
                            return res;
                        });
                    };
                },
                transform:function (request, options) {
                    options = options || {};
                    var self = this;
                    return function dodqCall(fn){
                        options.allowStraightQueries = false;
                        options.resultType = "full";
                        return deep.when(self.get(request, options))
                        .done(function(r){
                            var res = [];
                            if(r)
                                r.forEach(function(item){
                                    var value = item;
                                    if(item._isDQ_NODE_)
                                        value = item.value;
                                    var res = fn(value);
                                    if(item.ancestor)
                                        item.ancestor.value[item.key] = res;
                                    res.push(res);
                                });
                            return res;
                        });
                    };
                },
                equal:function (request, options) {
                    options = options || {};
                    var self = this;
                    return function dodqEqual(compare){
                        options.allowStraightQueries = false;
                        options.resultType = null;
                        var res = [];
                        return deep.when(self.get(request, options))
                        .done(function(r){
                            var ok = true;
                            if(r)
                                ok = r.every(function(item){
                                    return deep.utils.deepEqual(item, compare);
                                });
                            return ok || new Error("sheet equality failed");
                        });
                    };
                }
        };
        deep.utils.bottom(deep.protocole.SheetProtocoles, deep.protocoles.dq);

        //______________________________________________________________________ CHAIN DECORATION
        deep.Chain.addHandle("store", function (name) {
            var self = this;
            var func = function (s, e) {
                //console.log("deep.Chain.store : ", name);
                if (typeof name === 'string') {
                    self._storeName = name;
                    self._store = null;

                } else {
                    self._storeName = name.name;
                    self._store = name;
                }
                deep.chain.position(self, self._storeName);
            };
            deep.Store.extendsChain(self);
            func._isDone_ = true;
            deep.chain.addInChain.apply(self, [func]);
            return this;
        });

        deep.Store.extendsChain = function (handler) {
            handler.range = function (arg1, arg2, query, options) {
                var self = this;
                var func = function (s, e) {
                    var doAction = function(storeHandler){
                        var store = storeHandler.store;
                        if (!store.range)
                            return deep.errors.Store("provided store doesn't have RANGE. aborting RANGE !");
                        return deep.when(store.range(arg1, arg2, query, options))
                        .done(function (success) {
                            self._nodes = [deep.Querier.createRootNode(success)];
                        });
                    };
                    return deep.getStoreHandler(self._store || self._storeName)
                    .done(doAction);
                };
                func._isDone_ = true;
                self.range = deep.Chain.range;
                deep.chain.addInChain.apply(this, [func]);
                return self;
            };
            handler.get = function (id, options) {
                var self = this;
                if (id == "?" || !id)
                    id = "";
                var func = function (s, e)
                {
                    var doAction = function(storeHandler){
                        var store = storeHandler.store;
                        if (!store.get)
                            return deep.errors.Store("provided store doesn't have GET. aborting GET !");
                        if(id[0] == "*")
                            id = id.substring(1);
                        return deep.when(store.get(id, options))
                        .done(function (success) {
                            console.log("success store get : ", success)
                            if(success._deep_range_)
                                self._nodes = [deep.Querier.createRootNode(success.results, null, { uri: id })];
                            else
                                self._nodes = [deep.Querier.createRootNode(success, null, { uri: id })];
                            self._success = success;
                        });
                    };
                    return deep.getStoreHandler(self._store || self._storeName)
                    .done(doAction);
                };
                func._isDone_ = true;
                deep.chain.addInChain.apply(this, [func]);
                self.range = deep.Chain.range;
                return self;
            };
            handler.post = function (object, options) {
                var self = this;
                var func = function (s, e) {
                    var doAction = function(storeHandler){
                        var store = storeHandler.store;
                        if (!store.post)
                            return deep.errors.Store("provided store doesn't have POST. aborting POST !");
                        return deep.when(store.post(object || deep.chain.val(self), options))
                        .done(function (success) {
                            self._nodes = [deep.Querier.createRootNode(success)];
                        });
                    };
                    return deep.getStoreHandler(self._store || self._storeName)
                    .done(doAction);
                };
                func._isDone_ = true;
                self.range = deep.Chain.range;
                deep.chain.addInChain.apply(this, [func]);
                return self;
            };
            handler.put = function (object, options) {
                var self = this;
                var func = function (s, e) {
                    var doAction = function(storeHandler){
                        var store = storeHandler.store;
                        if (!store.put)
                            return deep.errors.Store("provided store doesn't have PUT. aborting PUT !");
                        return deep.when(store.put(object || deep.chain.val(self), options))
                            .done(function (success) {
                            self._nodes = [deep.Querier.createRootNode(success)];
                        });
                    };
                    return deep.getStoreHandler(self._store || self._storeName)
                    .done(doAction);
                };
                func._isDone_ = true;
                self.range = deep.Chain.range;
                deep.chain.addInChain.apply(this, [func]);
                return self;
            };
            handler.patch = function (object, id, options) {
                var self = this;
                var func = function (s, e) {
                    var doAction = function(storeHandler){
                        var store = storeHandler.store;
                        if (!store.patch)
                            return deep.errors.Store("provided store doesn't have PATCH. aborting PATCH !");
                        return deep.when(store.patch(object || deep.chain.val(self), id, options))
                            .done(function (success) {
                            self._nodes = [deep.Querier.createRootNode(success)];
                        });
                    };
                    return deep.getStoreHandler(self._store || self._storeName)
                    .done(doAction);
                };
                func._isDone_ = true;
                self.range = deep.Chain.range;
                deep.chain.addInChain.apply(this, [func]);
                return self;
            };
            handler.del = function (id, options) {
                var self = this;
                var func = function (s, e) {
                    var doAction = function(storeHandler){
                        var store = storeHandler.store;
                        if (!store.del)
                            return deep.errors.Store("provided store doesn't have DEL. aborting DELETE !");
                        var val = deep.chain.val(self);
                        return deep.when(store.del(id || val.id, options))
                            .done(function (success) {
                            self._nodes = [deep.Querier.createRootNode(success)];
                        });
                    };
                    return deep.getStoreHandler(self._store || self._storeName)
                    .done(doAction);
                };
                func._isDone_ = true;
                self.range = deep.Chain.range;
                deep.chain.addInChain.apply(this, [func]);
                return self;
            };
            handler.rpc = function (method, body, uri, options) {
                var self = this;
                var func = function (s, e) {
                    var doAction = function (storeHandler) {
                        var store = storeHandler.store;
                        if (!store.rpc)
                            return deep.errors.Store("provided store doesn't have RPC. aborting RPC !");
                        return deep.when(store.rpc(method, body, uri, options))
                            .done(function (success) {
                            self._nodes = [deep.Querier.createRootNode(success)];
                        });
                    };
                    return deep.getStoreHandler(self._store || self._storeName)
                    .done(doAction);
                };
                func._isDone_ = true;
                self.range = deep.Chain.range;
                deep.chain.addInChain.apply(this, [func]);
                return self;
            };

            handler.bulk = function (arr, uri, options) {
                var self = this;
                var func = function (s, e) {
                    var doAction = function(storeHandler){
                        var store = storeHandler.store;
                        if (!store.bulk)
                            return deep.errors.Store("provided store doesn't have BULK. aborting BULK !");
                        return deep.when(store.bulk(arr, uri, options))
                        .done(function (success) {
                            self._nodes = [deep.Querier.createRootNode(success)];
                        });
                    };
                    return deep.getStoreHandler(self._store || self._storeName)
                    .done(doAction);
                };
                func._isDone_ = true;
                self.range = deep.Chain.range;
                deep.chain.addInChain.apply(this, [func]);
                return self;
            };
            return handler;
        };

        deep.Shared = function(datas)
        {
            //console.log("CREATE DEEPSHARED")
            datas._deep_shared_ = true;
            return datas;
        };

        deep.mediaCache = {
            cache:{},
            reloadablesUriDico : {},
            //reloadablesRegExpDico : [ /^(json::)/gi /* ,/(\.json)$/gi */ ],
            clearCache:function ()
            {
                this.cache = {};
            },
            remove:function (uri) {
                delete this.cache[uri];
            },
            manage:function (response, uri) {
                //console.log("manage cache : ", response, uri);
                this.cache[uri] = response;
                return response;
            }
        };


        deep.store.CachedSheet = {
            "dq.up::./get":deep.compose.around(function(old){
                return function(id, opt)
                {
                    opt = opt || {};
                    deep.utils.decorateUpFrom(this, opt, ["cache","cachePath"]);
                    if(opt.cache !== false)
                    {
                        opt.cacheName = opt.cacheName || (opt.cachePath+id);
                        //console.log("check cache : ", id, opt);
                        if(deep.mediaCache.cache[opt.cacheName])
                            return deep.mediaCache.cache[opt.cacheName];
                    }
                    var res = old.call(this, id, opt);
                    if(opt.cache !== false)
                        deep.mediaCache.manage(res, opt.cacheName);
                    return res;
                };
            }),
            "dq.up::./[post,put,patch]":deep.compose.around(function(old){
                return function(object, opt)
                {
                    opt = opt || {};
                    deep.utils.decorateUpFrom(this, opt, ["cache","cachePath"]);
                    opt.id = opt.id || object.id;
                    if(!opt.id)
                        return deep.errors.Post("node.fs store need id on post/put/patch : ", object);
                    opt.cacheName = opt.cacheName || (opt.cachePath+opt.id);
                    var res = old.call(this, object, opt);
                    if(opt.cache !== false)
                        deep.mediaCache.manage(res, opt.cacheName);
                    return res;
                };
            }),
            "dq.up::./del":deep.compose.around(function(old){
                return function(id, opt)
                {
                    opt = opt || {};
                    deep.utils.decorateUpFrom(this, opt, ["cache","cachePath"]);
                    opt.cacheName = opt.cacheName || (opt.cachePath+id);
                    deep.mediaCache.remove(opt.cacheName);
                    return old.call(this, id, opt);
                };
            })
        };

        deep.store.ObjectSheet = {
            "dq.up::./!":{
                methods:{
                    relation:function(handler, relationName){
                        return handler.relation(relationName);
                    }
                },
                patch:function (content, opt) {
                    opt = opt || {};
                    deep.utils.decorateUpFrom(this, opt, ["baseURI"]);
                    opt.id = opt.id || content.id;
                    if(!opt.id)
                        return deep.when(deep.errors.Patch("json stores need id on PATCH"));
                    //console.log("patch : ", content, opt);
                    var self = this;
                    return self.get(opt.id, opt)
                    .fail(function(error){
                        return deep.when(deep.errors.Patch("object doesn't exists : please POST in place of PATCH. path : "+opt.id, error));
                    })
                    .done(function(data){
                        data = deep.utils.copy(data);
                        if(opt.query)
                        {
                            deep.query(data, opt.query, { resultType:"full", allowStraightQueries:false })
                            .forEach(function(entry){
                                entry.value = deep.utils.up(content, entry.value);
                                if(entry.ancestor)
                                    entry.ancestor.value[entry.key] = entry.value;
                            });
                            delete opt.query;
                        }
                        else
                        {
                            deep.utils.up(content, data);
                        }
                        //console.log("patch will put : ", data, opt);
                        return self.put(data, opt);
                    });
                },
                rpc:function(method, args, id, options)
                {
                    var self = this;
                    options = options || {};
                    if(!this.methods[method])
                        return deep.when(deep.errors.RPC("no method found with : "+method+". Aborting rpc call !"));
                    return this.get(id)
                    .done(function(object){
                        object = deep.utils.copy(object);
                        args.unshift({
                            call:function (method, args) {
                                if(!self.methods[method])
                                    return deep.errors.RPC("no method found with : "+method+". Aborting rpc call !");
                                return self.methods[method].apply(object, args);
                            },
                            save:function(){
                                return self.put(object);
                            },
                            relation:function(relationName)
                            {
                                if(!self.schema)
                                    return deep.errors.Store("no schema provided for fetching relation. aborting rpc.getRelation : relation : "+relationName);

                                var link = deep.query(self.schema, "/links/*?rel="+relationName).shift();
                                if(!link)
                                    return deep.errors.Store("("+self.name+") no relation found in schema with : "+relationName);

                                var interpreted = deep.utils.interpret(link.href, object);
                                return deep.get(interpreted);
                            }
                        });
                        return self.methods[method].apply(object, args);
                    });
                },
                bulk:function(requests, opt){
                    opt = opt || {};
                   /*
                    example of bulk requests
                        [
                          {to:"2", method:"put", body:{name:"updated 2"}, id: 1},
                          {to:"3", method:"put", body:{name:"updated 3"}, id: 2}
                        ]

                    example of bulk responses
                        [
                          {"from":"2", "body":{"name":"updated 2"}, "id": 1},
                          {"from":"3", "body":{"name":"updated 3"}, "id": 2}
                        ]
                    */
                    var self = this;
                    var alls = [];
                    var noError = requests.every(function (req) {
                        if(!req.id)
                            req.id = "rpc-id"+new Date().valueOf();
                        if(!self[req.method])
                        {
                            alls.push(deep.errors.Store("method not found during buk update : method : "+req.method));
                            return false;
                        }
                        opt.id = req.to;
                        if(req.method === 'rpc')
                            alls.push(self.rpc(req.body.method, req.body.args, req.to, opt));
                        else if(req.method.toLowerCase() === 'get' || req.method.toLowerCase() === 'delete')
                            alls.push(self[req.method](req.to, opt));
                        else
                            alls.push(self[req.method](req.body, opt));
                        return true;
                    });
                    if(!noError)
                        return deep.when(alls.pop());
                    return deep.all(alls)
                    .done(function (results) {
                        var res = [];
                        var count = 0;
                        results.forEach(function (r) {
                            var req = requests[count++];
                            res.push({
                                from:req.to,
                                body:r,
                                id:req.id
                            });
                        });
                        return res;
                    });
                }
            },
            'dq.up::./post':deep.compose.around(function(old){
                return function (content, opt) {
                    opt = opt || {};
                    var schema = this.schema;
                    if(schema)
                    {
                        if(schema._deep_ocm_)
                            schema = schema("post");
                        var report = deep.validate(content, schema);
                        if(!report.valid)
                            return deep.when(deep.errors.PreconditionFail("post failed", report));
                    }
                    return old.call(this, content, opt);
                };
            })
        };
        deep.utils.sheet(deep.store.ObjectSheet, deep.store.Collection.prototype);
        deep.utils.sheet(deep.store.ObjectSheet, deep.store.Object.prototype);
        return deep;
    };
});





