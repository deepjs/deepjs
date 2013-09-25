/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 *
 * TODO : 
 *     - files extensions matching optimisation
 *     - add optimised mode that do not return deep chain handle for any HTTP verb (to be used when stores are used from within a chain)
 *     - check range object usage in chain
 */
if (typeof define !== 'function')
    var define = require('amdefine')(module);

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
        deep.store = function (name) {
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
            _deep_store_: true,
            init:function(){
                this.initialised = true;
                if(this.protocole)
                  deep.protocole(this.protocole, this);
            },
            wrap:function(){
                var self = this;
                return function(){
                    return self;
                }
            }
        };

        deep.extensions = [];

        //_____________________________________________________________________ COLLECTION STORE
        /**
         * A store based on simple array
         * @class deep.store.Collection
         * @constructor
         * @param {Array} arr a first array of objects to hold
         * @param {Object} options could contain 'schema'
         */
        deep.store.Collection = function (protocole, collection, schema) {
            if (!(this instanceof deep.store.Collection))
                return new deep.store.Collection(protocole, collection, schema);
            deep.Store.call(this);
            deep.utils.bottom(deep.Store.prototype, this);
            if(typeof protocole !== "string" && protocole !== null)
            {
                schema = collection;
                collection = protocole;
            }
            if (collection)
                this.collection = collection;
            if(schema)
                this.schema = schema;
            if (protocole)
                deep.protocole(protocole, this);
            return this;
        };

        deep.store.Collection.prototype = {
            /**
             *
             */
            init: deep.compose.parallele(function () {
                if (typeof this.collection === 'string' || typeof this.schema === 'string')
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
                    return deep(deep.errors.NotFound());
                return deep(r).store(this);
            },
            /**
             * @method put
             * @param  {Object} object the object to update
             * @param  {Object} options an options object : could contain 'id'
             * @return {Object} the updated object
             */
            put: function (object, options) {
                options = options || {};
                var schema = options.schema || this.schema;
                if (schema) {
                    var report = deep.validate(object, schema);
                    if (!report.valid)
                        return  deep(deep.errors.PreconditionFail("Failed to put on collection : validation failed.", report));
                }
                var id = options.id || object.id;
                if (!id)
                    return deep(deep.errors.Store("Collection store need id on put"));
                var col = this.collection;
                if(this.collection._deep_ocm_)
                    col = this.collection();

                var r = deep.query(col, "./*?id=" + id, {
                    resultType: "full"
                });
                if (!r)
                    return deep(deep.errors.NotFound("no items found in collection with : " + id));
                r = r.shift();
                
                r.value = object;
                if (r.ancestor)
                    r.ancestor.value[r.key] = r.value;
                return deep(r.value).store(this);
            },
            /**
             * @method post
             * @param  {Object} object
             * @param  {Object} options (optional)
             * @return {Object} the inserted object (decorated with it's id)
             */
            post: function (object, options) {
                options = options || {};
                var schema = options.schema || this.schema;
                 if (schema) 
                 {
                    var report = deep.validate(object, schema);
                    if (!report.valid)
                        return deep(deep.errors.PreconditionFail("Failed to put on collection : validation failed.", report));
                }
                if (!object.id)
                    object.id = "D"+new Date().valueOf() + ""; // mongo styled id
                var col = this.collection;
                if(this.collection._deep_ocm_)
                    col = this.collection();
                var res = deep.query(col, "./*?id=" + object.id);
                if (res && res.length > 0)
                    return deep(deep.errors.Store("deep.store.Collection.post : An object has the same id before post : please put in place : object : ", object));
               
                col.push(object);
                return deep(object).store(this);
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
                return deep(removed);
            },
            /**
             * @method patch
             * @param  {Object} object  the update to apply to object
             * @param  {Object} options  could contain 'id'
             * @return {deep.Chain} a chain that hold the patched object and has injected values as success object.
             */
            patch: function (object, options) {
                options = options || {};
                var schema = options.schema || this.schema;
                if (schema) {
                    var report = deep.validate(object, schema);
                    if (!report.valid)
                        return  deep(deep.errors.PreconditionFail("Failed to put on collection : validation failed.", report));
                }
                var id = options.id || object.id;
                if (!id)
                    return deep(deep.errors.Store("Collection store need id on patch"));
                var col = this.collection;
                if(this.collection._deep_ocm_)
                    col = this.collection();
                var r = deep.query(col, "./*?id=" + id, {
                    resultType: "full"
                });
                if (!r)
                    return deep(deep.errors.NotFound("no items found in collection with : " + id));
                r = r.shift();
                var val = deep.utils.copy(r.value);
                deep.utils.up(object, val);
                r.value = val;
                if (r.ancestor)
                    r.ancestor.value[r.key] = val;
                return deep(r.value).store(this);
            },
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
                return deep(col).range(start, end).store(this);
            }
        }
        //__________________________________________________________________________________ OBJECT store
        /**
         * A store based on simple object
         * @class deep.store.Object
         * @constructor
         * @param {Object} obj the root object to hold
         * @param {Object} options could contain 'schema'
         */
        deep.store.Object = function (protocole, root, schema) {
            if (!(this instanceof deep.store.Object))
                return new deep.store.Object(protocole, root, schema);
            deep.Store.call(this);
            deep.utils.bottom(deep.Store.prototype, this);
            if (root)
                this.root = root;
            if(schema)
                this.schema = schema;
            if (protocole)
                deep.protocole(protocole, this);
            return this;
        }

        deep.store.Object.prototype = {
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
                    return deep(deep.query(root, id)).store(this);
                return deep(deep.query(root, "./" + id)).store(this);
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
                var id = options.id;
                if (!id)
                    return deep(deep.errors.Store("QuerierStore need id on put"));
                var r = deep.query(root, id, {
                    resultType: "full"
                });
                if (!r)
                    return deep(deep.errors.NotFound("QuerierStore.put : no items found in collection with : " + id));
                r = r.shift();
                var schema = options.schema || this.schema;
                if (schema) {
                    var report = deep.validate(object, schema);
                    if (!report.valid)
                        return deep(deep.errors.PreconditionFail("Failed to put on QuerierStore : validation failed.", report));
                }
                r.value = object;
                if (r.ancestor)
                    r.ancestor.value[r.key] = object;
                return deep(r.value).store(this);
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
                var schema = options.schema || this.schema;
                var res = deep.query(root, id);
                if (res && res.length > 0)
                    return deep(deep.errors.Store("deep.store.Object.post : An object has the same id before post : please put in place : object : ", object));
                if (schema) {
                    var report = deep.validate(object, schema);
                    if (!report.valid)
                        return deep(deep.errors.PreconditionFail("Failed to put on deep.store.Object : validation failed.", report));
                }
                deep(root).setByPath(id, object);
                return deep(object).store(this);
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
                    return res.shift();
                return deep(res).store(this);
            },
            /**
             * @method patch
             * @param  {[type]} object
             * @param  {[type]} id
             * @return {[type]}
             */
            patch: function (object, id) {
                var root = this.root || this;
                if(root._deep_ocm_)
                    root = root();
                var r = null;
                if (id[0] == "." || id[0] == "/")
                    r = deep(root).query(id).up(object).done();
                else
                    r = deep(root).query("./" + id).up(object).done();
                return deep(r).store(this);
            }
        }

        //________________________________________________________________________________________ SELECTORS

        deep.Chain.addHandle("selector", function chainSelector(condition, name) {
            var self = this;
            var func = function chainSelectorHandle(s, e) {
                 var res = deep.selector(deep.chain.val(self), condition, name);
                //console.log("res : ",res)
                return res;
            }
            func._isDone_ = true;
            deep.chain.addInChain.call(self, func);
            return this;
        });

        deep.store.Selector = function SelectorStoreConstructor(protocole, root, selector) {
            if (!(this instanceof deep.store.Selector))
                return new deep.store.Selector(protocole, root, selector);
            deep.Store.call(this);
            deep.utils.bottom(deep.Store.prototype, this);
            if (root)
                this.root = root;
            if(selector)
                this.selector = selector;
            if (protocole)
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
            get: function selectorStoreGet(id, options) {
                var root = this.root || this;
                options = options || {};
                if(root._deep_ocm_)
                    root = root();
                var res = deep.selector(root, id, this.selector);
                return deep(res).store(this);
            }
        };

        deep.selector = function deepSelector(root, query, selectorName)
        {
            var queries = deep.store.Selector.parse(query);
            var q = queries.shift(), selected = [], current = [], cur = root;
            if(cur.push)
            {
                current = cur;
                cur = current.shift();
            }
            while(q)
            {
                var func = new Function("return " + q + ";");
                while(cur)
                {
                    var nodes = deep.Querier.objectsWithProperty(cur, selectorName, true);
                    var n = nodes.shift();
                    while(n)
                    {
                        var o = {}, sel = n[selectorName], len = sel.length;
                        for(var i = 0; i < len; ++i)
                            o[sel[i]] = true;
                        o.___func___ = func;
                        if (o.___func___())
                            selected.push(n);
                        n = nodes.shift();
                    }
                    cur = current.shift();
                }
                if(selected.length === 0)
                    break;
                q = queries.shift();
                if(q)
                {
                    current = selected;
                    cur = current.shift();
                    selected = [];
                }
            }
            return selected;
        }

        deep.store.Selector.parse = function parseSelector(selector)
        {
            var chars = selector[0];
            var res = [];
            var finalString = "";
            var index = 0;
            while (chars) {
                switch (chars) {
                case '|':
                case '&':
                case '(':
                case ')':
                case ' ':
                case '!':
                    finalString += chars;
                    chars = selector[++index];
                    break;
                case '>' :
                    res.push(finalString);
                    chars = selector[++index];
                    finalString = "";
                    break;
                default:
                    finalString += "this.";
                    var count = index;
                    while (chars) {
                        var shouldBreak = false;
                        switch (chars) {
                            case '|':
                            case '&':
                            case '(':
                            case ')':
                            case ' ':
                            case '>':
                            case '!':
                                shouldBreak = true;
                                break;
                        }
                        if (shouldBreak) {
                            finalString += selector.substring(index, count);
                            index = count;
                            break;
                        }
                        chars = selector[++count];
                        if (!chars)
                            finalString += selector.substring(index, count);
                    }
                }
            }
            if(finalString.length > 0)
                res.push(finalString);
            return res;
        }
        //_______________________________________________________________________________ GET/GET ALL  REQUESTS

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
            var subproto = null;
            if (protoIndex > -1) {
                protoc = request.substring(0, protoIndex);
                uri = request.substring(protoIndex + 2);
            }

            //var queryThis = false;
            if (request[0] == '#' || protoc == "first" || protoc == "last" || protoc == "this") {
                store = deep.protocoles.dq;
              //  queryThis = true;
            } else if (!protoc) {
                //console.log("no protocole : try extension");
                deep.extensions.some(function (storez)
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
            }
            else
            {
                var splitted = protoc.split(".");
                if (splitted.length == 2) 
                {
                    store = deep.protocoles.store(splitted.shift());
                    subproto = splitted.shift();
                    // console.log("parse request : got subproto ", store, subproto);
                }
                else
                    store = deep.protocoles.store(protoc);
            }
            //console.log("parseRequest : protocole used : ",protoc, " - uri :",uri);
            //console.log("parseRequest : store : ", store);
            var res = {
                _deep_request_: true,
                request: request,
                subproto:subproto,
              //  queryThis: queryThis,
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
            if (!request)
                return request;
            if (typeof request !== "string" && !request._deep_request_)
                return request;
            options = options || {};
            var infos = request;
            if (typeof infos === 'string')
                infos = deep.parseRequest(request, options);
            options.parsedRequest = infos;
            var res = null;
            //console.log("deep.get : infos : ", infos);
            if (!infos.store)
            {
                if (!infos.protocole)
                    return request;
                else
                    return deep.errors.Store("no store found with : " + request, infos);
            }
            else
            {
                // console.log("________________ deep.get : will do call on store : ", infos, infos.store[infos.subproto])
                //if(infos.store._deep_ocm_)
                  //  res = deep.query(infos.store(),infos.uri);
                if(infos.subproto && typeof infos.store[infos.subproto] === 'function')
                    res = infos.store[infos.subproto](infos.uri, options);
                else if (typeof infos.store.get === 'function')
                    res = infos.store.get(infos.uri, options);
                else if (typeof infos.store === 'function')
                    res = infos.store(infos, options);
                else
                    return deep.errors.Store("no store found with : " + request, infos);
            }
            //console.log("deep.get "+infos.request+" result : ",res)
            if (options.wrap)
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

            return res;
        };
        // ___________________________________________________________________________ BASICAL PROTOCOLES
        deep.protocoles = {
            sheet:{
                get:function(request, options){
                    if(!options)
                    {
                        
                    }
                }
            },
            /**
             * options must contain the entry from where start query
             * @param  {[type]} request [description]
             * @param  {[type]} options [description]
             * @return {[type]}         [description]
             */
            up:{
                get:function(request, options){
                    if(!options || !options.parsedRequest || !options.parsedRequest.subproto)
                        return deep.errors.Store("Up protocole need avaiable sub proto to be executed. Request : " + request, options.parsedRequest);
                    var store = deep.protocoles.store(options.parsedRequest.subproto);
                    if(!store)
                        return deep.errors.Store("Up protocole couldn't find sub protocole. Request : " + request, options.parsedRequest);
                    var res = null;
                    options.allowStraightQueries = false;
                    if(typeof store === 'function')
                        res = store(request, options);
                    else if(typeof store.get === 'function')
                        res = store.get(request, options);
                    return function(layer, options){
                        return deep.when(res).done(function(r){
                            if(r)
                                r.forEach(function(item){
                                    deep.utils.up(layer, item, options.shema);
                                });
                        });
                    };
                }
            },
            bottom:{
                get:function(request, options){
                    if(!options || !options.parsedRequest || !options.parsedRequest.subproto)
                        return deep.errors.Store("Bottom protocole need avaiable sub proto to be executed. Request : " + request, options.parsedRequest);
                    var store = deep.protocoles.store(options.parsedRequest.subproto);
                    if(!store)
                        return deep.errors.Store("Bottom protocole couldn't find sub protocole. Request : " + request, options.parsedRequest);
                    var res = null;
                    options.allowStraightQueries = false;
                    if(typeof store === 'function')
                        res = store(request, options);
                    else if(typeof store.get === 'function')
                        res = store.get(request, options);
                    return function(layer, options){
                        return deep.when(res).done(function(r){
                            if(r)
                                r.forEach(function(item){
                                    deep.utils.bottom(layer, item, options.shema);
                                });
                        });
                    };
                }
            },
            dq:{
                //________________________________________ SHEET PROTOCOLES
                up:function (request, options) {
                    options = options || {};
                    var self = this;
                    return function dodqUP(layer){
                        options.allowStraightQueries = false;
                        options.resultType = "full";
                        var r = self.get(request, options);
                        if(r)
                            r.forEach(function(item){
                                var f = deep.utils.up(layer, item.value, options.shema);
                                if(item.ancestor)
                                    item.ancestor.value[item.key] = f;
                            });
                    };
                },
                bottom:function (request, options) {
                    options = options || {};
                    var self = this;
                    return function dodqBottom(layer){
                        options.allowStraightQueries = false;
                        options.resultType = "full";
                        var r = self.get(request, options);
                        if(r)
                            r.forEach(function(item){
                                var f = deep.utils.bottom(layer, item.value, options.shema);
                                if(item.ancestor)
                                    item.ancestor.value[item.key] = f;
                            });
                    };
                },
                series:function (request, options) {
                    options = options || {};
                    var self = this;
                    return function dodqSeries(fn){
                        options.allowStraightQueries = false;
                        options.resultType = "full";
                        var r = self.get(request, options);
                        var results = [];
                        if(r && r.length > 0)
                        {
                            var def = deep.Deferred();
                            var cycle =function(){
                                var item = r.shift();
                                var output = null;
                                if(typeof fn === 'string')
                                {
                                    if(typeof item[fn] === 'function')
                                        output = item[fn]();
                                }
                                else
                                    output = fn.apply(item);
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
                            }
                            var end = function(){
                                def.resolve(results);
                            }
                            cycle();
                            return def.promise();
                        }
                        return results;
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
                        options.resultType = "full";
                        var res = [];
                        var r = self.get(request, options);
                        if(r)
                            r.forEach(function(item){
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
                    };
                },
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
            store: function (path, options) {
                //console.log("deep.protocoles.store : ", path, options);
                if (typeof path === 'object')
                    path = path.uri;
                var proto = null;
                if (deep.protocoles[path])
                    proto =  deep.protocoles[path];
                if (proto && proto._deep_ocm_)
                    proto = proto();
                if (!proto)
                    return deep.errors.Protocole("no store found with : " + path);
                if(proto._deep_store_ && !proto.initialised && proto.init)
                {
                    var ini = proto.init();
                    if(ini && (ini.then || ini.promise))
                        return deep.when(ini).done(function(){
                            return proto;
                        });
                    return proto;
                }   
                return proto;
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
            aspect: function (path, options) {
                return deep.protocoles.js(path, options)
                    .done(function (res) {
                    return res.aspect;
                });
            },
            instance: function (path, options) {
                return deep.protocoles.js(path, options)
                    .done(function (cl) {
                    if (typeof cl === 'function')
                        return new cl();
                    //console.log("deep.stores.instance  : could not instanciate : "+JSON.stringify(id));
                    return deep.errors.Internal("deep.protocoles.instance  : could not instanciate : " + JSON.stringify(id));
                });
            }
        }

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
        }

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
            }

            deep.Store.extendsChain(self);
            func._isDone_ = true;
            deep.chain.addInChain.apply(self, [func]);
            return this;
        });

        deep.Store.extendsChain = function (handler) {
            //console.log("store decoration");
            handler.range = function (arg1, arg2, uri, options) {
                var self = this;
                var func = function (s, e) {
                    var store = self._store || deep.protocoles.store(self._storeName);

                    if (store instanceof Error)
                        return store;
                    if (!store)
                        return deep.errors.Store("no store declared in chain. aborting RANGE !");
                    if(store._deep_ocm_)
                        store = store();
                    if (!store.range)
                        return deep.errors.Store("provided store doesn't have RANGE. aborting RANGE !");
                    
                    return deep.when(store.range(arg1, arg2, uri, options))
                    .done(function (success) {
                        self._nodes = [deep.Querier.createRootNode(success)];
                    });
                };
                func._isDone_ = true;
                self.range = deep.Chain.range;
                deep.chain.addInChain.apply(this, [func]);
                return self;
            };
            if(handler.get && handler.post)
                return;
            handler.get = function (id, options) {
                var self = this;
                if (id == "?" || !id)
                    id = "";
                var func = function (s, e) 
                {
                    var store = self._store || deep.protocoles.store(self._storeName);
                    
                    //console.log("deep(...).store : get : store : ", store);
                    
                    if (store instanceof Error)
                        return store;
                    if (!store)
                        return deep.errors.Store("no store declared in chain. aborting GET !");
                    if(store._deep_ocm_)
                        store = store();
                    if (!store.get)
                        return deep.errors.Store("provided store doesn't have GET. aborting GET !");

                    var func = "get";
                    if(id[0] == "*")
                        id = id.substring(1);

                    if(id[0] == '?' && store.query)
                    {
                        id = id.substring(1);
                        func = "query";
                    }

                    if(!id && store.query)
                        func = "query";
                    return deep.when(store[func](id, options))
                        .done(function (success) {
                        //console.log("deep(...).store : get : success : ", success);
                        self._success = success;
                        self._nodes = [deep.Querier.createRootNode(success, null, {
                                uri: id
                            })]
                        //return success;
                    });
                };
                func._isDone_ = true;
                deep.chain.addInChain.apply(this, [func]);
                self.range = deep.Chain.range;
                return self;
            };
            handler.post = function (object, id, options) {
                var self = this;
                var func = function (s, e) {
                    var store = self._store || deep.protocoles.store(self._storeName);
                    //console.log("chain post : store getted : ", store, deep.context);
                    if (store instanceof Error)
                        return store;
                    if (!store)
                        return deep.errors.Store("no store declared in chain. aborting POST !");
                    if(store._deep_ocm_)
                        store = store();
                    if (!store.post)
                        return deep.errors.Store("provided store doesn't have POST. aborting POST !");
                    
                    //console.log("deep.Chain.post : got store : ",store);
                    return deep.when(store.post(object || deep.chain.val(self), id, options))
                    .done(function (success) {
                        //console.log("chain.post done : ", success);
                        self._nodes = [deep.Querier.createRootNode(success)];
                    });
                };
                func._isDone_ = true;
                self.range = deep.Chain.range;
                deep.chain.addInChain.apply(this, [func]);
                return self;
            };
            handler.put = function (object, options) {
                var self = this;
                //console.log("deep.chain.put : add in chain : ", object, id);
                var func = function (s, e) {
                    var store = self._store || deep.protocoles.store(self._storeName);
                    if (store instanceof Error)
                        return store;
                    if (!store)
                        return deep.errors.Store("no store declared in chain. aborting PUT !");
                    if(store._deep_ocm_)
                        store = store();
                    if (!store.put)
                        return deep.errors.Store("provided store doesn't have PUT. aborting PUT !");

                    return deep.when(store.put(object || deep.chain.val(self), options))
                        .done(function (success) {
                        self._nodes = [deep.Querier.createRootNode(success)];
                    });
                };
                func._isDone_ = true;
                self.range = deep.Chain.range;
                deep.chain.addInChain.apply(this, [func]);
                return self;
            };
            handler.patch = function (object, id, options) {
                var self = this;
                var func = function (s, e) {
                    var store = self._store || deep.protocoles.store(self._storeName);
                    if (store instanceof Error)
                        return store;
                    if (!store)
                        return deep.errors.Store("no store declared in chain. aborting PATCH !");
                    if(store._deep_ocm_)
                        store = store();
                    if (!store.patch)
                        return deep.errors.Store("provided store doesn't have PATCH. aborting PATCH !");
                    return deep.when(store.patch(object || deep.chain.val(self), id, options))
                        .done(function (success) {
                        self._nodes = [deep.Querier.createRootNode(success)];
                    });
                };
                func._isDone_ = true;
                self.range = deep.Chain.range;
                deep.chain.addInChain.apply(this, [func]);
                return self;
            };
            handler.del = function (id, options) {
                var self = this;
                var func = function (s, e) {
                    var store = self._store || deep.protocoles.store(self._storeName);
                    if (store instanceof Error)
                        return store;
                    if (!store)
                        return deep.errors.Store("no store declared in chain. aborting DELETE !");
                    if(store._deep_ocm_)
                        store = store();
                    if (!store.del)
                        return deep.errors.Store("provided store doesn't have DEL. aborting DELETE !");
                    var val = deep.chain.val(self);
                    return deep.when(store.del(id || val.id, options))
                        .done(function (success) {
                        self._nodes = [deep.Querier.createRootNode(success)];
                    });
                };
                func._isDone_ = true;
                self.range = deep.Chain.range;
                deep.chain.addInChain.apply(this, [func]);
                return self;
            }
            handler.rpc = function (method, body, uri, options) {
                var self = this;
                var func = function (s, e) {
                    var store = self._store || deep.protocoles.store(self._storeName);
                    if (store instanceof Error)
                        return store;
                    if (!store)
                        return deep.errors.Store("no store declared in chain. aborting RPC !");
                    if(store._deep_ocm_)
                        store = store();
                    if (!store.rpc)
                        return deep.errors.Store("provided store doesn't have RPC. aborting RPC !");
                    return deep.when(store.rpc(method, body, uri, options))
                        .done(function (success) {
                        self._nodes = [deep.Querier.createRootNode(success)];
                    });
                };
                func._isDone_ = true;
                self.range = deep.Chain.range;
                deep.chain.addInChain.apply(this, [func]);
                return self;
            };

            handler.bulk = function (arr, uri, options) {
                var self = this;
                var func = function (s, e) {
                    var store = self._store || deep.protocoles.store(self._storeName);
                    if (store instanceof Error)
                        return store;
                    if (!store)
                        return deep.errors.Store("no store declared in chain. aborting BULK !");
                    if(store._deep_ocm_)
                        store = store();
                    if (!store.bulk)
                        return deep.errors.Store("provided store doesn't have BULK. aborting BULK !");
                    return deep.when(store.bulk(arr, uri, options))
                    .done(function (success) {
                        self._nodes = [deep.Querier.createRootNode(success)];
                    });
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
            reloadablesRegExpDico : [ /^(json::)/gi /* ,/(\.json)$/gi */ ],
            clearCache:function ()
            {
                this.cache = {};
            },
            manage:function (response, uri) {
                //console.log("manage cache : ", response, uri);
                if(this.reloadablesUriDico[uri])
                    return;
                var count = 0;
                reg = this.reloadablesRegExpDico[count];
                while(reg && !(reg.test(uri)))
                    reg = this.reloadablesRegExpDico[++count];
                if(count == this.reloadablesRegExpDico.length)
                {
                    this.cache[uri] = response;
                    //console.log("deep-ui : deep.mediaCache.manage : retain !!!")
                }
            }
        };

        return deep;
    }
});