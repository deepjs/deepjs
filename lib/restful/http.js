/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * HTTP Client API. is there to get homogeneous Restful API and mimics deepjs restful collection API.
 * It manages headers, schema (remote or not).
 * It could manage cache.
 * API : get, post, put, patch, del, range, rpc, bulk 
 */

if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "../../deep", "./store", "./cache-sheet"], function(require, deep, Store, cacheSheet) {
	"use strict";

	/**
	 * Validate sended body against schema associated to the store (if any).
	 * Could load schema before use (if provided schema is a "string" (i.e. an uri).
	 * Internal use only. Should never be called directly.
	 */
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
				if (!query) { // validate whole object
					var report = deep.validate(object, schema);
					if (!report.valid)
						return deep.errors.PreconditionFail(method + " failed", report);
				} else { // partial validation : could be unrelevant as it could depend of whole item structure
					// what TODO here...? : if nothing : it should be validated remotely
				}
				return deep.Arguments([object, options]);
			};
			if (typeof schema === 'string')
				return deep.get(schema)
					.done(finalise);
			return finalise(schema);
		};
	};

	// internal use only. decorate headers and manipulate URI. http method with no body (get, head, options, del)
	var noBody = function(old) {
		return function(id, options) {
			//console.log("client-client nobody : ", options)
			//console.log("HTTP NOBODY : ", (deep.context.rootPath ||  deep.globals.rootPath || "norootPath") , this.baseURI , id);
			options = options || {};

			options.headers = deep.bottom(deep.globalHeaders, this.headers, options.headers, {});

			id = this.baseURI + id;
			if (deep.store.HTTP.decorateHeaders)
				deep.store.HTTP.decorateHeaders(options.headers);
			if (this.decorateHeaders)
				this.decorateHeaders(options.headers);
			//delete options.headers["Content-Type"];
			return old.call(this, id, options);
		};
	};
	// internal use only. decorate headers and manipulate URI. http method with body (post, put, patch)
	var withBody = function(old) {
		return function(object, options) {
			//console.log("client-client withBody : ", object, options)
			if (!options)
				options = options ||  {};
			else if (typeof options === 'string')
				options = {
					id: options || ''
				};
			options.id = this.baseURI + (options.id || "");
			options.headers = deep.bottom(deep.globalHeaders, this.headers, options.headers, {});
			if (deep.store.HTTP.decorateHeaders)
				deep.store.HTTP.decorateHeaders(options.headers);
			if (this.decorateHeaders)
				this.decorateHeaders(options.headers);
			return old.call(this, (options.id || ""), object, options);
		};
	};

	/**
	 * retrieve Schema if
	 * @param  {[type]} object  [description]
	 * @param  {[type]} options [description]
	 * @return {[type]}         [description]
	 */
	var retrieveSchema = function(object, options) {
		var self = this;
		if (!this.schema)
			return deep.Arguments([object, options]);
		if (typeof this.schema == 'string') {
			var schema = this.schema;
			this.schema = new deep.Promise();
			return deep.get(schema)
				.done(function(schema) {
					var promise = self.schema;
					self.schema = schema;
					promise.resolve(schema);
				})
				.fail(function(e) {
					self.schema.reject(e);
				});
		}
		if (this.schema._deep_promise_)
			return deep.when(this.schema)
			.done(function() {
				return deep.Arguments([object, options]);
			});
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
		get: deep.compose.around(noBody).around(serveSchema),
		post: deep.compose.around(withBody).before(schemaValidation("post")).before(retrieveSchema), //.after(deep.store.filterPrivate("post")),
		put: deep.compose.around(withBody).before(schemaValidation("put")).before(retrieveSchema), //.after(deep.store.filterPrivate("put")),
		patch: deep.compose.around(withBody).before(schemaValidation("patch")).before(retrieveSchema), //.after(deep.store.filterPrivate("patch")),
		del: deep.compose.around(noBody),
		range: deep.compose.around(function(old) {
			return function(start, end, query, options) {
				//console.log("STORE HTTP ", start, end, query);
				options = options || {};
				options.headers = deep.bottom(this.headers, deep.globalHeaders, options.headers || {}, {
					range: "items=" + start + "-" + end
				});
				if (deep.store.HTTP.decorateHeaders)
					deep.store.HTTP.decorateHeaders(options.headers);
				if (this.decorateHeaders)
					this.decorateHeaders(options.headers);
				query = query || "";
				//console.log("client client range : ", this);
				if (this.baseURI[this.baseURI.length - 1] != "/")
					query = "/" + query;
				query = this.baseURI + (query || "");

				return deep.when(old.call(this, start, end, query, options))
					.done(function(res) {
						//console.log("****** HTTP RES ", res);
						if (res.status >= 300)
							return deep.errors.Range("You have a " + res.status + " response so no range !");
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
				options.headers = deep.bottom(this.headers, deep.globalHeaders, options.headers || {}, {});
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
				options.headers = deep.bottom(this.headers, deep.globalHeaders, options.headers || {},{});
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
			options.headers = deep.bottom(this.headers, deep.globalHeaders, options.headers || {}, {});
			return deep.Arguments([uri, options]);
		}),
		options: deep.compose.before(function(uri, options) {
			options = options || {};
			options.headers = deep.bottom(this.headers, deep.globalHeaders, options.headers || {}, {});
			return deep.Arguments([uri, options]);
		})
	};
	deep.store.HTTP = deep.compose.Classes(deep.Store, function(protocol, baseURI, schema, options) {
			//console.log("deep.store.HTTP : constructor : ", protocol, baseURI, schema, options);
			if(typeof protocol === "object" && arguments.length == 1)
			{
				options = protocol;
				protocol = null;
			}
			this.baseURI = baseURI || this.baseURI || "";
			if (this.baseURI[this.baseURI.length - 1 != "/"])
				this.baseURI += "/";
			if (schema && this.schema)
				deep.up(schema, this.schema);
			else
				this.schema = schema || this.schema;
			if (schema)
				this.schema = schema;
			if (options)
				deep.up(options, this);
		},
		clientStoreProto,
		cacheSheet);
	return deep.store.HTTP;
});