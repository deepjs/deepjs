/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}

define(["require", "../../deep", "./store", "./store-sheet"], function(require, deep) {

	//__________________________________________________________________________________ OBJECT store
	/**
	 * A store based on simple object
	 * @class deep.store.Object
	 * @constructor
	 * @param {Object} obj the root object to hold
	 * @param {Object} options could contain 'schema'
	 */
	deep.store.Object = deep.compose.Classes(deep.Store,
		function(protocol, root, schema, options) {
			//console.log("deep.store.Object : ", protocol, root, schema, options);
			if (root)
				this.root = root;
			if (schema && this.schema)
				deep.utils.up(schema, this.schema);
			else
				this.schema = schema || this.schema;
			if (options)
				deep.utils.up(options, this);
			this.root = this.root || {};
		}, {
			_deep_object_: true,
			validate: function(object, schema, options) {
				//console.log("object store validate : ", object, schema, options);
				var id = options.id || options.query;
				if (!id)
					return deep.validate(object, schema);
				if (options.path)
					id += options.path;
				return deep.validate(object, deep.utils.schemaByValuePath(schema, id, "/"));
			},
			applyTransformers: function(object, schema, options) {
				//console.log("object store validate : ", object, schema, options);
				schema = deep.utils.schemaByValuePath(schema, options.id + (options.path || ""), '/');
				deep.nodes.applyTransformers(object, schema);
			},
			uriParser: undefined,
			/**
			 *
			 * @method get
			 * @param  {String} id
			 * @return {deep.Chain} depending on first argument : return an object or an array of objects
			 */
			get: function(id, options) {
				if (id === "" || !id)
					id = "*";
				var root = this.root || this;
				if (root._deep_ocm_)
					root = root();
				var schema = this.schema;
				if (schema && schema._deep_ocm_)
					schema = schem("get");
				var r = null;
				if (id[0] == "." || id[0] == "/")
					r = deep.query(root, id, {
						fullOutput: options.fullOutput,
						schema: schema
					});
				else
					r = deep.query(root, "./" + id, {
						fullOutput: options.fullOutput,
						schema: schema
					});
				if (r === undefined)
					return deep.errors.NotFound();
				return r;
			},
			/**
			 * @method put
			 * @param  {[type]} object
			 * @param  {[type]} query
			 * @return {[type]}
			 */
			put: function(object, options) {
				var id = options.id || object.id;
				var root = this.root || this;
				if (root._deep_ocm_)
					root = root();
				if (id[0] !== '/')
					id = "/" + id;
				deep.utils.replace(root, id, object);
				return object;
			},
			/**
			 * @method put
			 * @param  {[type]} object
			 * @param  {[type]} query
			 * @return {[type]}
			 */
			patch: function(object, options) {
				var id = options.id || object.id;
				var root = this.root || this;
				if (root._deep_ocm_)
					root = root();
				if (id[0] !== '/')
					id = "/" + id;
				deep.utils.replace(root, id, object);
				return object;
			},
			/**
			 * @method post
			 * @param  {[type]} object
			 * @param  {[type]} path
			 * @return {[type]}
			 */
			post: function(object, options) {
				var root = this.root || this;
				if (root._deep_ocm_)
					root = root();
				var id = options.id || object.id;
				if (id == '/!')
					this.root = object;
				else {
					// console.log("deep.store.Object.post : ", object, id);
					id = "/" + id;
					if (options.path)
						id += options.path;
					var res = deep.query(root, id);
					if (res)
						return deep.errors.Conflict("deep.store.Object.post : An object has the same id before post : please put in place : object : ", object);
					deep.utils.toPath(root, id, object);
					// console.log("post after set : ", root);
				}
				return object;
			},
			/**
			 * @method del
			 * @param  {[type]} id
			 * @return {[type]}
			 */
			del: function(id, options) {
				//console.log("OBJECT STORE DEL : ", id, options)
				var root = this.root || this;
				if (root._deep_ocm_)
					root = root();
				var q = id;
				if (id[0] != "." && id[0] != "/")
					q = "./" + id;
				if (options.filter)
					q += options.filter;
				var removed = deep.utils.remove(root, q);
				//console.log("object store del : ", q, removed);
				if (!removed || removed.length === 0)
					return false;
				return true;
			},
			/**
			 * select a range in collection
			 * @method range
			 * @param  {Number} start
			 * @param  {Number} end
			 * @return {deep.Chain} a chain that hold the selected range and has injected values as success object.
			 */
			range: function(start, end, query) {
				//console.log("deep.store.Collection.range : ", start, end, query);
				var res = null;
				var total = 0;
				query = query || "";
				return deep.when(this.get(query))
					.done(function(res) {
						total = res.length;
						start = Math.min(start, total);
						res = res.slice(start, end + 1);
						end = start + res.length - 1;
						query += "&limit(" + (res.length) + "," + start + ")";
						return deep.utils.createRangeObject(start, end, total, res.length, deep.utils.copy(res), query);
					});
			},
			/**
			 * @method fluch
			 */
			flush: function() {
				this.root = {};
			}
		});

	deep.Object = deep.store.Object.create = function(protocol, root, schema, options) {
		return new deep.store.Object(protocol, root, schema, options);
	};

	deep.sheet(deep.store.fullSheet, deep.store.Object.prototype);
	deep.coreUnits = deep.coreUnits || [];
	deep.coreUnits.push("js::deepjs/units/object-store");
	return deep.store.Object;
});