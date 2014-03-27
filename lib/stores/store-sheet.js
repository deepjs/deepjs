/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */

if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}

define(["require", "deepjs/deep", "./store"], function (require, deep) {

	deep.store.fullSheet = {
		"dq.up::./post":deep.compose.before(function (content, opt) {
			opt = opt || {};
			if(typeof opt === "string")
				opt = { id:opt };
			var schema = this.schema;
			if(schema)
			{
				if(schema._deep_ocm_)
					schema = schema("post");
				if(opt.ownerRestiction || schema.ownerRestiction)
				{
					if(!deep.context || !deep.context.session || !deep.context.session.user)
						return deep.errors.Owner();
					if(!content[opt.ownerRestiction || schema.ownerRestiction])
						content[opt.ownerRestiction || schema.ownerRestiction] = deep.context.session.user.id;
					else if(content[opt.ownerRestiction || schema.ownerRestiction] !== deep.context.session.user.id)
						return deep.errors.Owner();
				}
				deep.nodes.applyTransformers(content, schema);
				var report = deep.validate(content, schema);
				if(!report.valid)
					return deep.errors.PreconditionFail("post failed", report);
			}
			return deep.Arguments([content, opt]);
		})
		.after(deep.store.filterPrivate("post")),
		"dq.up::./put":deep.compose.before(function (object, options)
		{
			//console.log("store.put : ", object, options);
			options = options || {};
			if(typeof options === "string")
				options = { id:options };
			var id = options.id || object.id, query = null;
			if (!id)
				return deep.errors.Put("JSON store need id on put");
			query = id.split("/");
			if(query.length > 1)
			{
				if(query[0] === '')
					query.shift();
				id = query.shift();
				query = "/"+query.join("/");
			}
			else
				query = null;
			//console.log("store put : query : ", query);
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
					deep.nodes.applyTransformers(r, schema);
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
		.after(deep.store.filterPrivate("put")),
		"dq.up::./patch":deep.compose.before(function (content, opt) {
			//console.log("ObjectSheet patch : ", content, opt);
			opt = opt || {};
			if(typeof opt === "string")
				opt = { id:opt };
			var id = opt.id || content.id, query = null;
			if(!id)
				return deep.errors.Patch("json stores need id on PATCH");
			var self = this, schema = this.schema;
			query = id.split("/");
			if(query[0] === "")
				query.shift();
			//console.log("id splitted : ", query, id);
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
				//console.log("has receive datas : ",id ," - ",  datas)
				var data = deep.utils.copy(datas);
				if(query)
				{
					//console.log("has query on patch : ", query);
					var r = deep.query(data, query, { resultType:"full", allowStraightQueries:false });
					if(r.length > 0)
						r.forEach(function(entry){
							entry.value = deep.utils.up(content, entry.value);
							if(entry.ancestor)
								entry.ancestor.value[entry.key] = entry.value;
						});
					else
						deep.utils.setValueByPath(data, query, content, "/");
				}
				else
					deep.utils.up(content, data);
				if(!data.id)
					data.id = id;

				//console.log("wil patch : ", data);

				if(schema)
				{
					if(schema._deep_ocm_)
						schema = schema("patch");
					deep.nodes.applyTransformers(data, schema);
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
		.after(deep.store.filterPrivate("patch")),
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
					if(!deep.context.session || !deep.context.session.user)
						return deep.errors.Owner();
					id += "&"+schema.ownerRestriction+"="+deep.context.session.user.id;
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
	return deep.store.fullSheet;
});