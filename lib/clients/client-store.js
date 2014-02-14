"use strict";
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require","../../deep"],function (require, deep)
{
	var schemaValidation = function(method){
		return function(object, options)
		{
			var schema = this.schema;
			if(schema && schema._deep_ocm_)
				schema = schema(method);
			if(!schema)
				return deep.Arguments([object, options]);
			//console.log("client-store schema validation")
			options = options || {};
			var id = options.id || object.id, query = null;
			if(id)
			{
				query = id.split("/");
				if(query.length > 1)
				{
					id = query.shift();
					query = "/"+query.join("/");
				}
				else
					query = null;
			}
			var finalise = function(schema){
				if(!query)
				{
					var report = deep.validate(object, schema);
					if(!report.valid)
						return deep.errors.PreconditionFail(method+" failed", report);
				}
				else
				{
					// what TODO here...? : if nothing : it will be validated by remote
				}
				return deep.Arguments([object, options]);
			};
			if(typeof schema === 'string')
				return deep.get(schema)
				.done(finalise);
			return finalise(schema);
		};
	};
	var noBody = function(old){
		return function(id, options){
			//console.log("client-client nobody : ", options)
			options = options || {};
			options.headers = deep.utils.compile(this.headers, deep.globalHeaders, options.headers || {});
			//delete options.headers["Content-Type"];
			return old.call(this, this.baseURI+id, options);
		};
	};
	var withBody = function(old){
		return function(object, options){
			//console.log("client-client withBody : ", object, options)
			options = options || {};
			options.headers = deep.utils.compile(this.headers, deep.globalHeaders, options.headers || {});
			return old.call(this, this.baseURI+(options.id||""), object, options);
		};
	};

	var clientStoreProto = {
		headers:{
			"Accept" : "application/json; charset=utf-8",
			"Content-Type" : "application/json; charset=utf-8"
		},
		get:deep.compose.around(noBody)/*.around(function(old){
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
		})*/,
		post:deep.compose.around(withBody).before(schemaValidation("post")),//.after(deep.store.filterPrivate("post")),
		put:deep.compose.around(withBody).before(schemaValidation("put")),//.after(deep.store.filterPrivate("put")),
		patch:deep.compose.around(withBody).before(schemaValidation("patch")),//.after(deep.store.filterPrivate("patch")),
		del:deep.compose.around(noBody),
		range:deep.compose.around(function(old){
			return function(start, end, query, options){
				options = options || {};
				options.headers = deep.utils.compile(this.headers, deep.globalHeaders, options.headers || {}, {range:"items=" +start+"-"+end});
				query = query || "";
				console.log("client client range : ", this);
				return deep.when(old.call(this, start, end, this.baseURI+query, options))
				.done(function(res)
				{  
					//res = { contentRange:"12-24", data:[...] }
					var rangePart = null,
						contentRange = res.contentRange,
						totalCount = 0;
					contentRange = contentRange.substring(6);
					if(contentRange)
						rangePart = contentRange.split('/');
					if(contentRange && rangePart && rangePart.length > 0)
					{
						var range = rangePart[0];
						if(range == "0--1")
						{
							totalCount = 0;
							start = 0;
							end = 0;
						}
						else
						{
							totalCount = parseInt(rangePart[1], 10);
							var spl = range.split("-");
							start = parseInt(spl[0], 10);
							end = parseInt(spl[1], 10);
						}
					}
					else
						return deep.errors.Range("CientStore.range : range header missing !! ");
					return deep.utils.createRangeObject(start, end, totalCount, res.data.length, res.data, query);
				});
			};
		}),
		rpc:deep.compose.around(function(old){
			return function(method, params, id, options){
				options = options || {};
				options.headers = deep.utils.compile(this.headers, deep.globalHeaders, options.headers || {});
				var callId = "call"+new Date().valueOf();
				var body = {
					id:callId,
					method:method,
					params:params||[]
				};
				options.headers["Content-Type"] = "application/json-rpc; charset=utf-8;";
				return deep.when(old.call(this, this.baseURI+id, body, options))
				.done(function(data){
					if(data.error)
						return deep.errors.RPC(data.error);
					return data.result;
				});
			};
		}),
		bulk:deep.compose.around(function(old){
			return function(array, options){
				options = options || {};
				options.headers = deep.utils.compile(this.headers, deep.globalHeaders, options.headers || {});
				options.headers["Content-Type"] = "message/json; charset=utf-8;";
				return old.call(this, this.baseURI, array, options);
			};
		})
	};
	deep.client = deep.client || {};
	//deep.sheet(deep.client.CachedStoreSheet, clientStoreProto);
	deep.client.ClientStore = deep.compose.Classes(deep.Store, function(protocol, baseURI, schema, options){
		//console.log("deep.client.ClientStore : constructor : ", protocol, baseURI, schema, options);
		if(!this.baseURI && !baseURI)
			baseURI = "";
		if(typeof baseURI !== 'undefined')
			this.baseURI = baseURI;
		if(schema)
			this.schema = schema;
		this.cache = false;
		if(options)
			deep.utils.up(options, this);
	},
	clientStoreProto);
	return deep.client.ClientStore;
});
