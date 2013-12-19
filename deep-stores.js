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

define(["require", "./deep", "./deep-protocol", "./deep-sheet"], function (require) {

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
            return deep(deep.protocole.getStoreHandler(name))//, { ignoreInit:true, ignoreOCM:true}))
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
                    var doAction = function(storeHandler){
                        var store = storeHandler.store;
                        if (!store.range)
                            return deep.errors.Store("provided store doesn't have RANGE. aborting RANGE !");
                        return deep.when(store.range(arg1, arg2, query, options))
                        .done(function (success) {
                            if(success._deep_range_)
                                self._nodes = [deep.Querier.createRootNode(success.results)];
                            else
                                self._nodes = [deep.Querier.createRootNode(success)];
                        });
                    };
                    return deep.protocole.getStoreHandler(self._store || self._storeName)
                    .done(doAction);
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
                    var doAction = function(storeHandler){
                        var store = storeHandler.store;
                        if (!store.get)
                            return deep.errors.Store("provided store doesn't have GET. aborting GET !");
                        if(id[0] == "*")
                            id = id.substring(1);
                        //console.log("deep-stores : chain.get : store : ", store);
                        return deep.when(store.get(id, options))
                        .done(function (success) {
                            //console.log("success store get : ", success)
                            if(success && success._deep_range_)
                                self._nodes = [deep.Querier.createRootNode(success.results, null, { uri: id })];
                            else
                                self._nodes = [deep.Querier.createRootNode(success, null, { uri: id })];
                            self._success = success;
                        });
                    };
                    return deep.protocole.getStoreHandler(self._store || self._storeName)
                    .done(doAction);
                };
                func._isDone_ = true;
                deep.chain.addInChain.apply(this, [func]);
                //self.range = deep.Chain.prototype.range;
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
                    return deep.protocole.getStoreHandler(self._store || self._storeName)
                    .done(doAction);
                };
                func._isDone_ = true;
                //self.range = deep.Chain.prototype.range;
                deep.chain.addInChain.apply(this, [func]);
                return self;
            };
            handler.put = function (object, options) {
                var self = this;
                var func = function (s, e) {
                    var doAction = function(storeHandler){
                        //console.log("deep.context on chain put : ", deep.context);
                        var store = storeHandler.store;
                        if (!store.put)
                            return deep.errors.Store("provided store doesn't have PUT. aborting PUT !");
                        return deep.when(store.put(object || deep.chain.val(self), options))
                            .done(function (success) {
                            self._nodes = [deep.Querier.createRootNode(success)];
                        });
                    };
                    return deep.protocole.getStoreHandler(self._store || self._storeName)
                    .done(doAction);
                };
                func._isDone_ = true;
                //self.range = deep.Chain.prototype.range;
                deep.chain.addInChain.apply(this, [func]);
                return self;
            };
            handler.patch = function (object, id, options) {
                var self = this;
                var func = function (s, e) {
                    var doAction = function(storeHandler){
                        //console.log("deep.context on chain patch : ", deep.context);
                        var store = storeHandler.store;
                        if (!store.patch)
                            return deep.errors.Store("provided store doesn't have PATCH. aborting PATCH !");
                        return deep.when(store.patch(object || deep.chain.val(self), id, options))
                        .done(function (success) {
                            self._nodes = [deep.Querier.createRootNode(success)];
                        });
                    };
                    return deep.protocole.getStoreHandler(self._store || self._storeName)
                    .done(doAction);
                };
                func._isDone_ = true;
                //self.range = deep.Chain.prototype.range;
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
                    return deep.protocole.getStoreHandler(self._store || self._storeName)
                    .done(doAction);
                };
                func._isDone_ = true;
                //self.range = deep.Chain.prototype.range;
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
                    return deep.protocole.getStoreHandler(self._store || self._storeName)
                    .done(doAction);
                };
                func._isDone_ = true;
                //self.range = deep.Chain.prototype.range;
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
                    return deep.protocole.getStoreHandler(self._store || self._storeName)
                    .done(doAction);
                };
                func._isDone_ = true;
                //self.range = deep.Chain.prototype.range;
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

        /*
         *  
         */

        deep.store.ObjectSheet = {
            "dq.up::./[post,put,patch]":deep.compose.after(function(result){
                //console.log("private check : ", this.schema, result);
                if(!this.schema)
                    return result;
                var res = deep.utils.remove(result, ".//!?_schema.private=true", this.schema);
                //console.log("res : ", res);
                return result;
            }),
            "dq.up::./get":deep.compose.around(function(old){
                return function(id, options){
                    var schema = this.schema;

                    if(schema && schema.ownerRestriction === true)
                        if(!deep.context.session || !deep.context.session.remoteUser)
                            return deep.when(deep.errors.Owner());

                    return deep.when(old.apply(this, [id, options]))
                    .done(function(res){
                        //console.log("private check : ", schema, res);
                        if(!schema)
                            return res;
                        if(id && id[0] == '?')
                        {
                            if(schema.ownerRestriction === true)
                                deep.utils.remove(res, './*?userID='+deep.context.session.remoteUser.id);
                            deep.utils.remove(res, ".//!?_schema.private=true", { type:"array", items:schema });
                        }
                        else {
                            if(schema.ownerRestriction === true && res.userID !== deep.context.session.remoteUser.id)
                                return deep.errors.Owner();
                            deep.utils.remove(res, ".//!?_schema.private=true", schema);
                        }
                        //console.log("res : ", res);
                        return res;
                    });
                };
            }),
            /*"dq.up::./del":deep.compose.before(function(id, options)
            { 
                if(this.schema && this.schema.ownerRestriction)
                {
                    if(!deep.context.session || !deep.context.session.remoteUser)
                        return deep.when(deep.errors.Owner());
                    if(id[0] == '?')
                        id += "&userID="+deep.context.session.remoteUser.id;
                    else
                        id = "?id="+id+"&userID="+deep.context.session.remoteUser.id;
                }
                return [id, options];
            }),*/
            "dq.bottom::./!":{
                config:{
                    //ownerRestiction:true
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
                    //console.log("nodes :", nodes);
                    if(!nodes || nodes.length === 0)
                        return true;
                    var ok = nodes.every(function(e){
                        var toCheck = deep.query(object, e.path);
                        //console.log("check readOnly : ", toCheck, e.path, e.value)
                        if(!toCheck)
                            return true;
                        return deep.utils.deepEqual(toCheck, e.value);
                    });
                    if(!ok)
                        return deep.errors.PreconditionFail();
                    return true;
                },
                checkOwnership:function(object){
                    if(!this.schema)
                        return true;
                    if(this.schema.ownerRestriction === true)
                        if(deep.context.session && deep.context.session.remoteUser)
                        {
                            //console.log("check owner on session : ", object.userID, deep.context.session.remoteUser.id)
                            if(object.userID !== deep.context.session.remoteUser.id)
                                return deep.errors.Owner();
                        }
                        else
                            return deep.errors.Owner();
                    return true;
                },
                checkForUpdate:function(object, data){
                    //console.log("check for update : ", object, data, deep.context);
                    return this.checkOwnership(object, data) && this.checkReadOnly(object, data);
                },
                getForUpdate:function(id, opt){
                    var data = null;
                    if(opt.retrievedValue)
                        data = opt.retrievedValue;
                    else
                        data = this.get(id, opt);
                    return data;
                },
                patch:function (content, opt) {
                    //console.log("ObjectSheet patch : ", content, opt);
                    opt = opt || {};
                    var self = this;
                    deep.utils.decorateUpFrom(this, opt, ["baseURI"]);
                    opt.id = opt.id || content.id;
                    if(!opt.id)
                        return deep.when(deep.errors.Patch("json stores need id on PATCH"));
                    return deep.when(this.getForUpdate(opt.id, opt))
                    .done(function(datas){
                        //console.log("patch : get object : ", datas);
                        var data = deep.utils.copy(datas);
                        
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
                        opt.retrievedValue = datas;
                        return self.put(data, opt);
                    })
                    .fail(function(error){
                        return deep.when(error);
                    });
                },
                rpc:function(method, args, id, options)
                {
                    var self = this;
                    options = options || {};
                    if(!this.methods[method])
                        return deep.when(deep.errors.MethodNotAllowed("no method found with : "+method+". Aborting rpc call !"));
                    return this.get(id)
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
            },
            'dq.up::./post':deep.compose.around(function(old){
                return function (content, opt) {
                    opt = opt || {};
                    var schema = this.schema || opt.schema;
                    if(schema)
                    {
                        if(schema._deep_ocm_)
                            schema = schema("post");

                        if(schema.ownerRestiction === true)
                        {
                            if(!deep.context || !deep.context.session || !deep.context.session.remoteUser)
                                return deep.when(deep.errors.Owner());
                            if(content.userID !== deep.context.session.remoteUser.id)
                                return deep.when(deep.errors.Owner());
                        }
                        var report = deep.validate(content, schema);
                        if(!report.valid)
                            return deep.when(deep.errors.PreconditionFail("post failed", report));
                    }
                    return old.call(this, content, opt);
                };
            })
        };
        return deep;
    };
});





