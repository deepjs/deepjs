/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */

/*
Priority : options.path > options.id > object.id
algo parsing string :

	if(str[0] == "?")
		options.query = str;
	else if(str[0] == "/")
		// parse path : /[s:id/?p:path,q:query]
	else {
		path = "/"+path;
		==> parsePath
	}
*/

if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}

define(["require", "../../deep", "./store"], function (require, deep, Store)
{

    var filterPrivate = Store.filterPrivate = function(method) {
        return function(old){
            return function(object, options) {
                //console.log("private check : ", this, result);
                var self = this;
                return deep.when(old.call(this, object, options))
                .done(function(result){
                    if (!self.schema)
                        return result;
                    var schema = self.schema;
                    if (schema._deep_ocm_)
                        schema = schema(method);
                    if(self._deep_object_)
                        schema = deep.utils.schemaByValuePath(schema, options.id+(options.path||""), '/');
                    else if(options.path)
                        schema = deep.utils.schemaByValuePath(schema, options.path, '/');
                    var res = deep.utils.remove(result, ".//!?_schema.private=true", schema);
                    return result; 
                });
            };
        };
    };

	var applyPut = function(item, query, object) {
		if(query)
		{
			deep.utils.replace(item, query, object);
			return item;
		}
		return object;
	};

	var applyPatch = function(item, query, object) {
		if(query)
		{
			var r = deep.query(item, query, { fullOutput:true, allowStraightQueries:false });
			r.forEach(function(entry){
				entry.value = deep.utils.up(object, entry.value);
				if(entry.ancestor)
					entry.ancestor.value[entry.key] = entry.value;
			});
		}
		else
			item = deep.utils.up(object, item);
		return item;
	};

	var putPatchHandler = function(method, handler){
		return function(object, options)
		{
			var id = options.id || object.id, query = options.path;
			if (!id)
				return deep.errors.Store("Store need id on " + method);
			var schema = this.schema,
				self = this;
			options.id = id;
			options.noPrivates = true;
			return deep.when(this.get(id, options)) // check ownership + filter at get
			.done(function(r)
			{
				var oldObject = deep.utils.copy(r);
				r = handler(r, query, object);	// APPLY PUT/PATCH on 'old' datas
				if(schema)
				{
					if(schema._deep_ocm_)
						schema = schema(method);
					//__________________________________________________ TRANSFORM FIELDS
					deep.nodes.applyTransformers(r, schema);
					//__________________________________________________ READONLY
					var check = self.checkReadOnly(oldObject, r, options, schema);
					if(check instanceof Error)
						return check;
					//__________________________________________________ VALIDATION
					var report = null;
					if(self.validate)
						report = self.validate(r, schema, options);
					else
						report = deep.validate(r, schema);
					if(!report.valid)
						return deep.errors.PreconditionFail("validation failed!", report);
				}
				return deep.Arguments([r, options]);
			});
		};
	};

	deep.store.fullSheet = {
		_deep_sheet_:true,
		"dq.up::./post":deep.compose.before(function (content, opt) {
			var schema = this.schema;
			if(schema)
			{
				if(schema._deep_ocm_)
					schema = schema("post");
				if(schema.ownerRestiction)
				{
					if(!deep.context || !deep.context.session || !deep.context.session.user)
						return deep.errors.Owner();
					if(!content[schema.ownerRestiction])
						content[schema.ownerRestiction] = deep.context.session.user.id;
					else if(content[schema.ownerRestiction] !== deep.context.session.user.id)
						return deep.errors.Owner();
				}
				if(this.applyTransformers)
					this.applyTransformers(content, schema, opt);
				else
					deep.nodes.applyTransformers(content, schema);
				var report = null;
				if(this.validate)
					report = this.validate(content, schema, opt);
				else
					report = deep.validate(content, schema);
				if(!report.valid)
					return deep.errors.PreconditionFail("post failed", report);
			}
			return deep.Arguments([content, opt]);
		})
		.around(filterPrivate("post"))
		.before(Store.managePathOptions),

		"dq.up::./put":deep.compose
		.before(putPatchHandler("put", applyPut))
		.around(filterPrivate("put"))
		.before(Store.managePathOptions),

		"dq.up::./patch":deep.compose
		.before(putPatchHandler("patch", applyPatch))
		.around(filterPrivate("patch"))
		.before(Store.managePathOptions),

		"dq.up::./get":deep.compose.around(function(old){
			return function(parsed, options){
				var id = parsed.id || parsed.query, self = this;
				var schema = this.schema;
				if (schema && schema._deep_ocm_)
					schema = schema("get");
				//___________________________________ SERVE SCHEMA
				if(id == "schema")
				{
					if(schema && schema.form)
					{
						schema = deep.utils.shallowCopy(schema);
						delete schema.form;
					}	
					return schema || {};
				}
				else if(id == "form")
				{
					if(schema && schema.form)
						return schema.form;
					return [];
				}
				else if(id == "schema+form")
					return schema || {};
				// __________________________________ CONSTRUCT FILTER
				var q = "";
				//console.log("Deep context session : ", deep.context.session);
				if (schema && schema.ownerRestriction)
					if (deep.context.session && deep.context.session.user)
						q += "&" + schema.ownerRestriction + "=" + deep.context.session.user.id;
					else
						return deep.errors.Owner("session doesn't provide info on your role");
				var filter = schema && schema.filter;
				if (filter)
					if(typeof filter === 'function')
						q += filter(id, options);
					else
						q += filter;
				options = options || {};
				options.filter = q;
				// __________________________________ CALL + filter privates + catch path
				return deep.when(old.call(this, id, options))
				.done(function(res){
					res = deep.utils.copy(res);
					if(!schema)
					{
						if(parsed.path)
							res = deep.utils.fromPath(res, parsed.path, "/");
						return res;
					}
					if(id && id[0] == '?')
					{
						if(self._deep_collection_)
						{
							if(!options.noPrivates)
								deep.utils.remove(res, ".//!?_schema.private=true",  { type:"array", items:schema });
							return res;
						}
						if(options.noPrivates)
							return res;
					}
					if(self._deep_object_)
						schema = deep.utils.schemaByValuePath(schema, parsed.id+(parsed.path||""), '/');
					else if(parsed.path)
                    	schema = deep.utils.schemaByValuePath(schema, parsed.path, '/');
					if(schema && !options.noPrivates)
						deep.utils.remove(res, ".//!?_schema.private=true", schema);
					if(parsed.path)
						res = deep.utils.fromPath(res, parsed.path, "/");
					return res;
				});
			};
		}).before(Store.manageRestPath),
		"dq.up::./del":deep.compose.around(function(old){
			return function(parsed, options)
			{
				if(parsed.path)
				{
					return deep.when(this.patch(deep.collider.remove(parsed.path), parsed.id))
					.done(function(object){
						return true;
					});
				}
				options = options || {};
				var id = parsed.id || parsed.query,
					schema = this.schema;
				if(schema)
				{
					if(schema._deep_ocm_)
						schema = schema("del");
					filter = schema.filter || "";
					if(schema.ownerRestriction)
					{
						if(!deep.context.session || !deep.context.session.user)
							return deep.errors.Owner();
						filter += "&"+schema.ownerRestriction+"="+deep.context.session.user.id;
					}
					options.filter = filter;
				}
				return old.call(this, id, options);
			};
		}).before(Store.manageRestPath),
		"dq.bottom::./!":{
			methods:{
				relation:function(handler, relationName){
					return handler.relation(relationName);
				}
			},
			checkReadOnly:function(object, data, options, schema){

				if(!schema)
					return true;
				if(this._deep_object_)
                    schema = deep.utils.schemaByValuePath(schema, options.id+(options.path||""), '/');
				var nodes = deep.query(data, ".//?_schema.readOnly=true", { fullOutput:true, schema:schema });
				if(!nodes || nodes.length === 0)
					return true;
				var ok = nodes.every(function(e){
					var toCheck = deep.query(object, e.path);
					if(!toCheck)
						return true;
					return deep.utils.deepEqual(toCheck, e.value);
				});
				if(!ok)
					return deep.errors.PreconditionFail("readonly fields.");
				return true;
			},
			rpc:function(method, args, id, options){
				var self = this;
				options = options || {};
				//var parsed = deep.utils.parseRestPath(id);
				var handler = this.methods[method];// || this.prototype[method];
				if(!handler)
					return deep.when(deep.errors.MethodNotAllowed("no method found with : "+method+". Aborting rpc call !"));
				return deep.when(this.get(id))
				.done(function(object){
					object = deep.utils.copy(object);
					args.unshift({
						call:function (method, args) {
							var handler = self.methods[method];// || self.prototype[method];
							if(!handler)
								return deep.errors.MethodNotAllowed("no method found with : "+method+". Aborting rpc call !");
							return handler.apply(object, args);
						},
						save:function(){
							return self.put(object, id);
						},
						relation:function(relationName)
						{
							var schema = self.schema;
							if(!schema)
								return deep.errors.Store("no schema provided for fetching relation. aborting rpc.getRelation : relation : "+relationName);

							if(schema._deep_ocm_)
								schema = schema("rpc");

							var link = deep.query(schema, "/links/*?rel="+relationName).shift();
							if(!link)
								return deep.errors.Store("("+self.name+") no relation found in schema with : "+relationName);

							var interpreted = deep.utils.interpret(link.href, object);
							return deep.get(interpreted);
						}
					});
					return handler.apply(object, args);
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
				var self = this,
					alls = [];
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
	return deep.store.fullSheet;
});