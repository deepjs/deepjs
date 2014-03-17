/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */

"use strict";
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "deepjs/deep"], function(require, deep) {
    var schemaValidation = function(method) {
        return function(object, options) {
            //console.log("client-store schema validation", this.schema);
            var schema = this.schema;
            if (schema && schema._deep_ocm_)
                schema = schema(method);
            if (!schema)
                return deep.Arguments([object, options]);
            options = options || {};
            var id = options.id || object.id,
                query = null;
            if (id) {
                query = id.split("/");
                if (query.length > 1) {
                    id = query.shift();
                    query = "/" + query.join("/");
                } else
                    query = null;
            }
            var finalise = function(schema) {
                if (!query) {
                    var report = deep.validate(object, schema);
                    if (!report.valid)
                        return deep.errors.PreconditionFail(method + " failed", report);
                } else {
                    // what TODO here...? : if nothing : it will be validated by remote
                }
                return deep.Arguments([object, options]);
            };
            if (typeof schema === 'string')
                return deep.get(schema)
                    .done(finalise);
            return finalise(schema);
        };
    };
    var noBody = function(old) {
        return function(id, options) {
            //console.log("client-client nobody : ", options)
            //console.log("HTTP NOBODY : ", (deep.context.rootPath ||  deep.globals.rootPath || "norootPath") , this.baseURI , id);
            options = options || {};
            
            options.headers = deep.utils.compile(this.headers, deep.globalHeaders, options.headers || {});

            id = this.baseURI + id;
            if (deep.store.HTTP.decorateHeaders)
                deep.store.HTTP.decorateHeaders(options.headers);
            if (this.decorateHeaders)
                this.decorateHeaders(options.headers);
            //delete options.headers["Content-Type"];
            return old.call(this, id, options);
        };
    };
    var withBody = function(old) {
        return function(object, options) {
            //console.log("client-client withBody : ", object, options)
            if (!options)
                options = options ||  {};
            else if (typeof options !== 'object')
                options = {
                    id: options || ''
                };
            options.id = this.baseURI + (options.id || "");
            options.headers = deep.utils.compile(this.headers, deep.globalHeaders, options.headers || {});
            if (deep.store.HTTP.decorateHeaders)
                deep.store.HTTP.decorateHeaders(options.headers);
            if (this.decorateHeaders)
                this.decorateHeaders(options.headers);
            return old.call(this, (options.id || ""), object, options);
        };
    };
    var retrieveSchema = function(object, options) {
        //console.log("retrieve schema ", this.schema);
        var self = this;
        if (!this.schema)
            return deep.Arguments([object, options]);
        if (typeof this.schema == 'string') {

            this.schema = deep.Deferred();
            deep.get(this.schema)
                .done(function(schema) {
                    var def = self.schema;
                    self.schema = schema;
                    def.resolve(schema);
                })
                .fail(function(e) {
                    self.schema.reject(e);
                });
            //console.log("schema was loaded : ", this.schema)
            return this.schema.promise()
                .done(function() {
                    //console.log("schema is forwarded 1")
                    return deep.Arguments([object, options]);
                });
        }

        if (this.schema._deep_deferred_)
            return this.schema.promise()
                .done(function() {
                    //console.log("schema is forwarded 2")
                    return deep.Arguments([object, options]);
                });
        //console.log("schema was object")
        return deep.Arguments([object, options]);
    };

    var serveSchema = function(old) {
        return function(id, options) {
            if (id != "schema")
                return old.apply(this, [id, options]);
            var self = this;
            var schema = this.schema;
            if (!schema)
                return deep.errors.NotFound("this store has no schema.");
            if (typeof schema === 'string') {
                this.schema = deep.Deferred();
                deep.get(this.schema)
                    .done(function(schema) {
                        var def = self.schema;
                        self.schema = schema;
                        def.resolve(schema);
                    });
                return this.schema.promise();
            } else if (this.schema._deep_deferred_) {
                return this.schema.promise();
            }
            if (schema._deep_ocm_)
                schema = schema("get");
            return schema;
        };
    };
    var clientStoreProto = {
        headers: {
            "Accept": "application/json; charset=utf-8",
            "Content-Type": "application/json; charset=utf-8"
        },
        get: deep.compose.around(noBody).around(serveSchema)
        /*.around(function(old){
			return function(id, options){
				return deep.when(old.apply(this, [id, options]))
				.done(function(res){
					var schema = this.schema;
					if(options.noPrivates || !schema)
						return res;
					if(schema._deep_ocm_)
						schema = schema("get");
					if(id && id[0] == '?')
						deep.utils.remove(res, ".//!?_schema.private=true", { type:"array", items:schema });
					else
						deep.utils.remove(res, ".//!?_schema.private=true", schema);
					return res;
				});
			};
		})*/
        ,
        post: deep.compose.around(withBody).before(schemaValidation("post")).before(retrieveSchema), //.after(deep.store.filterPrivate("post")),
        put: deep.compose.around(withBody).before(schemaValidation("put")).before(retrieveSchema), //.after(deep.store.filterPrivate("put")),
        patch: deep.compose.around(withBody).before(schemaValidation("patch")).before(retrieveSchema), //.after(deep.store.filterPrivate("patch")),
        del: deep.compose.around(noBody),
        range: deep.compose.around(function(old) {
            return function(start, end, query, options) {
                options = options || {};
                options.headers = deep.utils.compile(this.headers, deep.globalHeaders, options.headers || {}, {
                    range: "items=" + start + "-" + end
                });
                if (deep.store.HTTP.decorateHeaders)
                    deep.store.HTTP.decorateHeaders(options.headers);
                if (this.decorateHeaders)
                    this.decorateHeaders(options.headers);
                query = query || "";
                console.log("client client range : ", this);
                query = (deep.context.rootPath ||  deep.globals.rootPath || "") + this.baseURI + (query || "");
                return deep.when(old.call(this, start, end, query, options))
                    .done(function(res) {
                        //res = { contentRange:"12-24", data:[...] }
                        var rangePart = null,
                            contentRange = res.contentRange,
                            totalCount = 0;
                        contentRange = contentRange.substring(6);
                        if (contentRange)
                            rangePart = contentRange.split('/');
                        if (contentRange && rangePart && rangePart.length > 0) {
                            var range = rangePart[0];
                            if (range == "0--1") {
                                totalCount = 0;
                                start = 0;
                                end = 0;
                            } else {
                                totalCount = parseInt(rangePart[1], 10);
                                var spl = range.split("-");
                                start = parseInt(spl[0], 10);
                                end = parseInt(spl[1], 10);
                            }
                        } else
                            return deep.errors.Range("CientStore.range : range header missing !! ");
                        return deep.utils.createRangeObject(start, end, totalCount, res.data.length, res.data, query);
                    });
            };
        }),
        rpc: deep.compose.around(function(old) {
            return function(method, params, id, options) {
                options = options || {};
                options.headers = deep.utils.compile(this.headers, deep.globalHeaders, options.headers || {});
                if (deep.store.HTTP.decorateHeaders)
                    deep.store.HTTP.decorateHeaders(options.headers);
                if (this.decorateHeaders)
                    this.decorateHeaders(options.headers);
                var callId = "call" + new Date().valueOf();
                var body = {
                    id: callId,
                    method: method,
                    params: params || []
                };
                options.headers["Content-Type"] = "application/json-rpc; charset=utf-8;";
                id = (deep.context.rootPath ||  deep.globals.rootPath || "") + this.baseURI + (id || "");
                return deep.when(old.call(this, id, body, options))
                    .done(function(data) {
                        if (data.error)
                            return deep.errors.RPC(data.error);
                        return data.result;
                    });
            };
        }),
        bulk: deep.compose.around(function(old) {
            return function(array, options) {
                options = options || {};
                options.headers = deep.utils.compile(this.headers, deep.globalHeaders, options.headers || {});
                if (deep.store.HTTP.decorateHeaders)
                    deep.store.HTTP.decorateHeaders(options.headers);
                if (this.decorateHeaders)
                    this.decorateHeaders(options.headers);
                options.headers["Content-Type"] = "message/json; charset=utf-8;";
                return old.call(this, (deep.context.rootPath ||  deep.globals.rootPath || "") + this.baseURI, array, options);
            };
        }),
        head: deep.compose.before(function(uri, options) {
            options = options || {};
            options.headers = deep.utils.compile(this.headers, deep.globalHeaders, options.headers || {});
            return deep.Arguments([uri, options]);
        }),
        options: deep.compose.before(function(uri, options) {
            options = options || {};
            options.headers = deep.utils.compile(this.headers, deep.globalHeaders, options.headers || {});
            return deep.Arguments([uri, options]);
        })
    };
    //deep.sheet(deep.store.HTTP.CachedStoreSheet, clientStoreProto);
    deep.store.HTTP = deep.compose.Classes(deep.Store, function(protocol, baseURI, schema, options) {
            //console.log("deep.store.HTTP : constructor : ", protocol, baseURI, schema, options);
            this.baseURI = baseURI || this.baseURI || "";
            if(this.baseURI[this.baseURI.length-1 != "/"])
            	this.baseURI += "/";
            schema = schema || this.schema || null;
            var self = this;
            if (schema)
                this.schema = schema;
            this.cache = false;
            if (options)
                deep.utils.up(options, this);
        },
        clientStoreProto);
    return deep.store.HTTP;
});