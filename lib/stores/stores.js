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

define(["require", "../protocol", "../sheet"], function (require) {

    return function(deep){

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
            //console.log("deep.store(name) : ",name)
            return deep(deep.protocol.getStoreHandler(name))//, { ignoreInit:true, ignoreOCM:true}))
            .transform(function(handler){
                //console.log("store getted : ", handler.store);
                return handler.store;
            })
            .store(name);
        };

        /**
         * Empty class : Just there to get instanceof working (be warning with iframe issue in that cases).
         * @class deep.Store
         * @constructor
         */
        deep.Store = function (protocol) {
            this.protocol = protocol;
            if (protocol)
                deep.protocol(protocol, this);
            this._deep_store_ = true;
            //console.log("deep.Store : protocol : ", protocol);
        };
        deep.Store.prototype = {
            _deep_store_: true
        };
        deep.Store.forbidden = function(message){
            return function(any, options)
            {
                return deep.when(deep.errors.Forbidden(message));
            };
        };
        deep.store.Restrictions = function()
        {
            var restrictions = {};
            for(var i in arguments)
                restrictions[arguments[i]] = deep.Store.forbidden();
            return restrictions;
        };
        deep.store.AllowOnly = function()
        {
            var restrictions = {
                get:deep.Store.forbidden(),
                range:deep.Store.forbidden(),
                post:deep.Store.forbidden(),
                put:deep.Store.forbidden(),
                patch:deep.Store.forbidden(),
                del:deep.Store.forbidden(),
                rpc:deep.Store.forbidden(),
                bulk:deep.Store.forbidden()
            };
            for(var i in arguments)
                delete restrictions[arguments[i]];
            return restrictions;
        };
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
                    return deep.protocol.getStoreHandler(self._store || self._storeName)
                    .done(function(storeHandler){
                        var store = storeHandler.store;
                        if (!store.range)
                            return deep.errors.Store("provided store doesn't have RANGE. aborting RANGE !");
                        return deep.when(store.range(arg1, arg2, query, options))
                        .done(function (success) {
                            if(success._deep_range_)
                                self._nodes = [deep.utils.createRootNode(success.results)];
                            else
                                self._nodes = [deep.utils.createRootNode(success)];
                        });
                    });
                };
                func._isDone_ = true;
                //self.range = deep.Chain.prototype.range;
                deep.chain.addInChain.apply(this, [func]);
                return self;
            };
            handler.get = function (id, options) {
                var self = this;
                if (id == "?" || !id)
                    id = "";
                var func = function (s, e)
                {
                    return deep.protocol.getStoreHandler(self._store || self._storeName)
                    .done(function(storeHandler){
                        var store = storeHandler.store;
                        if (!store.get)
                            return deep.errors.Store("provided store doesn't have GET. aborting GET !");
                        if(id[0] == "*")
                            id = id.substring(1);
                        return deep.when(store.get(id, options))
                        .done(function (success) {
                            if(success && success._deep_range_)
                                self._nodes = [deep.utils.createRootNode(success.results, null, { uri: id })];
                            else
                                self._nodes = [deep.utils.createRootNode(success, null, { uri: id })];
                            self._success = success;
                        });
                    });
                };
                func._isDone_ = true;
                deep.chain.addInChain.apply(this, [func]);
                //self.range = deep.Chain.prototype.range;
                return self;
            };
            handler.post = function (object, options) {
                var self = this;
                var func = function (s, e) {
                    return deep.protocol.getStoreHandler(self._store || self._storeName)
                    .done(function(storeHandler){
                        var store = storeHandler.store;
                        if (!store.post)
                            return deep.errors.Store("provided store doesn't have POST. aborting POST !");
                        return deep.when(store.post(object || deep.chain.val(self), options))
                        .done(function (success) {
                            self._nodes = [deep.utils.createRootNode(success)];
                        });
                    });
                };
                func._isDone_ = true;
                //self.range = deep.Chain.prototype.range;
                deep.chain.addInChain.apply(this, [func]);
                return self;
            };
            handler.put = function (object, options) {
                var self = this;
                var func = function (s, e) {
                    return deep.protocol.getStoreHandler(self._store || self._storeName)
                    .done(function(storeHandler){
                        var store = storeHandler.store;
                        if (!store.put)
                            return deep.errors.Store("provided store doesn't have PUT. aborting PUT !");
                        return deep.when(store.put(object || deep.chain.val(self), options))
                            .done(function (success) {
                            self._nodes = [deep.utils.createRootNode(success)];
                        });
                    });
                };
                func._isDone_ = true;
                //self.range = deep.Chain.prototype.range;
                deep.chain.addInChain.apply(this, [func]);
                return self;
            };
            handler.patch = function (object, id, options) {
                var self = this;
                var func = function (s, e) {
                    return deep.protocol.getStoreHandler(self._store || self._storeName)
                    .done(function(storeHandler){
                        var store = storeHandler.store;
                        if (!store.patch)
                            return deep.errors.Store("provided store doesn't have PATCH. aborting PATCH !");
                        return deep.when(store.patch(object || deep.chain.val(self), id, options))
                        .done(function (success) {
                            self._nodes = [deep.utils.createRootNode(success)];
                        });
                    });
                };
                func._isDone_ = true;
                //self.range = deep.Chain.prototype.range;
                deep.chain.addInChain.apply(this, [func]);
                return self;
            };
            handler.del = function (id, options) {
                var self = this;
                var func = function (s, e) {
                    return deep.protocol.getStoreHandler(self._store || self._storeName)
                    .done(function(storeHandler){
                        var store = storeHandler.store;
                        if (!store.del)
                            return deep.errors.Store("provided store doesn't have DEL. aborting DELETE !");
                        var val = deep.chain.val(self);
                        return deep.when(store.del(id || val.id, options))
                            .done(function (success) {
                            self._nodes = [deep.utils.createRootNode(success)];
                        });
                    });
                };
                func._isDone_ = true;
                //self.range = deep.Chain.prototype.range;
                deep.chain.addInChain.apply(this, [func]);
                return self;
            };
            handler.rpc = function (method, body, uri, options) {
                var self = this;
                var func = function (s, e) {
                    return deep.protocol.getStoreHandler(self._store || self._storeName)
                    .done(function (storeHandler) {
                        var store = storeHandler.store;
                        if (!store.rpc)
                            return deep.errors.Store("provided store doesn't have RPC. aborting RPC !");
                        return deep.when(store.rpc(method, body, uri, options))
                            .done(function (success) {
                            self._nodes = [deep.utils.createRootNode(success)];
                        });
                    });
                };
                func._isDone_ = true;
                //self.range = deep.Chain.prototype.range;
                deep.chain.addInChain.apply(this, [func]);
                return self;
            };
            handler.bulk = function (arr, uri, options) {
                var self = this;
                var func = function (s, e) {
                    return deep.protocol.getStoreHandler(self._store || self._storeName)
                    .done(function(storeHandler){
                        var store = storeHandler.store;
                        if (!store.bulk)
                            return deep.errors.Store("provided store doesn't have BULK. aborting BULK !");
                        return deep.when(store.bulk(arr, uri, options))
                        .done(function (success) {
                            self._nodes = [deep.utils.createRootNode(success)];
                        });
                    });
                };
                func._isDone_ = true;
                //self.range = deep.Chain.prototype.range;
                deep.chain.addInChain.apply(this, [func]);
                return self;
            };
            return handler;
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
                this.cache[uri] = response;
                return response;
            }
        };

        deep.store.CachedStoreSheet = {
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

        deep.store.FullJSONStoreSheet = {
            "dq.up::./post":deep.compose.before(function (content, opt) {
                opt = opt || {};
                var schema = this.schema;
                if(schema)
                {
                    if(schema._deep_ocm_)
                        schema = schema("post");
                    if(opt.ownerRestiction || schema.ownerRestiction)
                    {
                        if(!deep.context || !deep.context.session || !deep.context.session.remoteUser)
                            return deep.errors.Owner();
                        if(!content[opt.ownerRestiction || schema.ownerRestiction])
                            content[opt.ownerRestiction || schema.ownerRestiction] = deep.context.session.remoteUser.id;
                        else if(content[opt.ownerRestiction || schema.ownerRestiction] !== deep.context.session.remoteUser.id)
                            return deep.errors.Owner();
                    }
                    var report = deep.validate(content, schema);
                    if(!report.valid)
                        return deep.errors.PreconditionFail("post failed", report);
                }
                return deep.Arguments([content, opt]);
            })
            .after(function(result){
                //console.log("private check : ", this, result);
                if(!this.schema)
                    return result;
                var schema = this.schema;
                if(schema._deep_ocm_)
                    schema = schema("post");
                var res = deep.utils.remove(result, ".//!?_schema.private=true", this.schema);
                return result;
            }),
            "dq.up::./put":deep.compose.before(function (object, options)
            {
                options = options || {};
                var id = options.id || object.id, query = null;
                if (!id)
                    return deep.errors.Put("JSON store need id on put");
                query = id.split("/");
                if(query.length > 1)
                {
                    id = query.shift();
                    query = "/"+query.join("/");
                }
                else
                    query = null;
                options.id = id;
                if(!query)
                    object.id = id;
                var schema = this.schema;
                var self = this;
                options.noPrivates = true;
                return deep.when(this.get(id, options)) // check ownership + filter at get
                .done(function(r)
                {
                    var old = deep.utils.copy(r);
                    if(query)
                        deep.utils.replace(r, query, object);
                    else
                        r = object;
                    if(!r.id)
                        r.id = id;
                    if(schema)
                    {
                        if(schema._deep_ocm_)
                            schema = schema("put");
                        var check = self.checkReadOnly(old, r, options);
                        if(check instanceof Error)
                            return check;
                        var report = deep.validate(r, schema);
                        if(!report.valid)
                            return deep.errors.PreconditionFail("", report);
                    }
                    return deep.Arguments([r, options]);
                });
            })
            .after(function(result){
                //console.log("private check : ", this, result);
                if(!this.schema)
                    return result;
                var schema = this.schema;
                if(schema._deep_ocm_)
                    schema = schema("put");
                var res = deep.utils.remove(result, ".//!?_schema.private=true", this.schema);
                return result;
            }),
            "dq.up::./patch":deep.compose.before(function (content, opt) {
                //console.log("ObjectSheet patch : ", content, opt);
                opt = opt || {};
                var id = opt.id || content.id, query = null;
                if(!id)
                    return deep.errors.Patch("json stores need id on PATCH");
                var self = this, schema = this.schema;
                query = id.split("/");
                if(query.length > 1)
                {
                    id = query.shift();
                    query = "/"+query.join("/");
                }else
                    query = null;
                opt.id = id;
                if(!query)
                    content.id = id;
                opt.noPrivates = true;
                return deep.when(this.get(id, opt)) // check ownership + filter at get
                .done(function(datas){
                    var data = deep.utils.copy(datas);
                    if(query)
                    {
                        deep.query(data, query, { resultType:"full", allowStraightQueries:false })
                        .forEach(function(entry){
                            entry.value = deep.utils.up(content, entry.value);
                            if(entry.ancestor)
                                entry.ancestor.value[entry.key] = entry.value;
                        });
                    }
                    else
                        deep.utils.up(content, data);
                    if(!data.id)
                        data.id = id;
                    if(schema)
                    {
                        if(schema._deep_ocm_)
                            schema = schema("patch");
                        var check = self.checkReadOnly(datas, data, opt);
                        if(check instanceof Error)
                            return check;
                        var report = deep.validate(data, schema);
                        if(!report.valid)
                            return deep.errors.PreconditionFail(report);
                    }
                    return deep.Arguments([data,opt]);
                });
            })
            .after(function(result){
                if(!this.schema)
                    return result;
                var schema = this.schema;
                if(schema._deep_ocm_)
                    schema = schema("patch");
                var res = deep.utils.remove(result, ".//!?_schema.private=true", this.schema);
                return result;
            }),
            "dq.up::./get":deep.compose.around(function(old){
                return function(id, options){
                    var schema = this.schema;
                    if (schema && schema._deep_ocm_)
                        schema = schema("get");
                    if(id == "schema")
                    {
                        if(!schema)
                            return deep.errors.NotFound("this store has no schema.");
                        return schema;
                    }
                    var q = "";
                    if (schema && schema.ownerRestriction)
                        if (deep.context.session && deep.context.session.remoteUser)
                            q += "&" + schema.ownerRestriction + "=" + deep.context.session.remoteUser.id;
                        else
                            return deep.errors.Owner();
                    var filter = schema && schema.filter;
                    if (filter)
                        q += filter;
                    options = options || {};
                    options.filter = q;
                    return deep.when(old.apply(this, [id, options]))
                    .done(function(res){
                        //console.log("private check : ", schema, res);
                        if(options.noPrivates || !schema)
                            return res;
                        if(id && id[0] == '?')
                            deep.utils.remove(res, ".//!?_schema.private=true", { type:"array", items:schema });
                        else
                            deep.utils.remove(res, ".//!?_schema.private=true", schema);
                        return res;
                    });
                };
            }),
            "dq.up::./del":deep.compose.before(function(id, options)
            {
                var schema = this.schema;
                if(schema && schema._deep_ocm_)
                    schema = schema("del");
                var filter = null;
                if(id[0] !== '?')
                    id = "?id="+id;
                if(schema)
                {
                    filter = schema.filter;
                    if(schema.ownerRestriction)
                    {
                        if(!deep.context.session || !deep.context.session.remoteUser)
                            return deep.errors.Owner();
                        id += "&"+schema.ownerRestriction+"="+deep.context.session.remoteUser.id;
                    }
                }
                if(filter)
                    id += filter;
                return deep.Arguments([id, options]);
            }),
            "dq.bottom::./!":{
                config:{
                    //ownerRestiction:"userID"
                },
                methods:{
                    relation:function(handler, relationName){
                        return handler.relation(relationName);
                    }
                },
                checkReadOnly:function(object, data){
                    if(!this.schema)
                        return true;
                    var nodes = deep.query(data, ".//?_schema.readOnly=true", { resultType:'full', schema:this.schema });
                    if(!nodes || nodes.length === 0)
                        return true;
                    var ok = nodes.every(function(e){
                        var toCheck = deep.query(object, e.path);
                        if(!toCheck)
                            return true;
                        return deep.utils.deepEqual(toCheck, e.value);
                    });
                    if(!ok)
                        return deep.errors.PreconditionFail();
                    return true;
                },
                rpc:function(method, args, id, options){
                    var self = this;
                    options = options || {};
                    if(!this.methods[method])
                        return deep.when(deep.errors.MethodNotAllowed("no method found with : "+method+". Aborting rpc call !"));
                    return deep.when(this.get(id))
                    .done(function(object){
                        object = deep.utils.copy(object);
                        args.unshift({
                            call:function (method, args) {
                                if(!self.methods[method])
                                    return deep.errors.MethodNotAllowed("no method found with : "+method+". Aborting rpc call !");
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
            }
        };
        return deep;
    };
});





