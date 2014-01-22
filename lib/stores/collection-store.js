if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}

define(["require", "./stores"], function(require, deep) {

	return function(deep) {
		//_____________________________________________________________________ COLLECTION STORE
		/**
		 * A store based on simple array
		 * @class deep.store.Collection
		 * @constructor
		 * @param {Array} arr a first array of objects to hold
		 * @param {Object} options could contain 'schema'
		 */
		deep.store.Collection = deep.compose.Classes(deep.Store,
		function(protocol, collection, schema, options) {
			if (collection)
				this.collection = collection;
			if (schema)
				this.schema = schema;
			if (options)
				deep.utils.up(options, this);
		},
		{
			/**
			 * @method init
			 */
			init: deep.compose.after(function() {
				var self = this;
				//console.log("deep.store.Collection.init : this.collection : ", this.collection, " - this.schema : ", this.schema);
				this.collection = this.collection || [];
				if (typeof this.collection === 'string' || typeof this.schema === 'string')
					return deep(this)
						.query("./[collection,schema]")
						.load()
						.done(function(success) {
							return self;
						});
			}),
			/**
			 * @method get
			 * @param  {String} id the id of the object to retrieve. Could also be a (deep)query.
			 * @param {Object} options an options object (here there is no options)
			 * @return {Object} the retrieved object
			 */
			get: function(id, options) {
				options = options || {};
				//console.log("deep.store.Collection.get : ",id," - stock : ", this.collection)
				var q = "";
				var queried = false;
				if (!id) {
					q = "./*";
					queried = true;
				} else if (id[0] == "*") {
					q = "./" + id;
					queried = true;
				} else if (id[0] == "?") {
					q = "./*" + id;
					queried = true;
				} else
					q = "./*?id=" + id;
				if(options.filter)
					q += options.filter;
				//console.log("deep.store.Collection.get : q :",q);
				var col = this.collection;
				if (this.collection._deep_ocm_)
					col = this.collection();
				var r = deep.query(col, q);
				//console.log("deep.store.Collection.get : res :",r);
				if (!queried && r instanceof Array)
					r = r.shift();
				if (typeof r === 'undefined')
					return deep.errors.NotFound(q);
				return deep.utils.copy(r);
			},
			/**
			 * @method put
			 * @param  {Object} object the object to update
			 * @param  {Object} options an options object : could contain 'id'
			 * @return {Object} the updated object
			 */
			put: function(object, options) {
				var id = object.id || options.id;
				var col = this.collection;
				if (col._deep_ocm_)
					col = col();
				deep.utils.replace(col, "./*?id=" + id, object);
				return object;
			},
			/**
			 * @method patch
			 * @param  {Object} object  the update to apply to object
			 * @param  {Object} options  could contain 'id'
			 * @return {deep.Chain} a chain that hold the patched object and has injected values as success object.
			 */
			patch: function(object, options) {
				var id = object.id || options.id;
				var col = this.collection;
				if (col._deep_ocm_)
					col = col();
				deep.utils.replace(col, "./*?id=" + id, object);
				return object;
			},
			/**
			 * @method post
			 * @param  {Object} object
			 * @param  {Object} options (optional)
			 * @return {Object} the inserted object (decorated with it's id)
			 */
			post: function(object, options) {
				//console.log("deep.store.Collection.post : ", object, options);
				options = options || {};
				options.id = options.id || object.id;
				if (!options.id)
					object.id = options.id = "id" + new Date().valueOf(); // mongo styled id
				if (!object.id)
					object.id = options.id;
				var col = this.collection;
				if (this.collection._deep_ocm_)
					col = this.collection();
				var res = deep.query(col, "./*?id=" + object.id);
				if (res && res.length > 0)
					return deep.when(deep.errors.Conflict("deep.store.Collection.post : An object has the same id before post : please put in place : object : ", object));
				col.push(object);
				return object;
			},
			/**
			 * @method del
			 * @param  {String} id
			 * @param  {Object} options no options for the moment
			 * @return {Object} the removed object
			 */
			del: function(id, options) {
				var col = this.collection;
				if (this.collection._deep_ocm_)
					col = this.collection();
				if (!id)
					return deep.when(deep.errors.Delete("delete need an id or a query"));
				var q = null;
				if (id[0] == '?')
					q = "./*" + id;
				else
					q = "./*?id=" + id;
				//console.log("collection delete : ", q)
				var removed = deep.utils.remove(col, q);
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
				.done(function(res){
					total = res.length;
					start = Math.min(start,total);
					res = res.slice(start, end + 1);
					end = start + res.length - 1;
					query += "&limit(" + (res.length) + "," + start + ")";
					return deep.utils.createRangeObject(start, end, total, res.length, deep.utils.copy(res), query);
				});
			},
			flush: function() {
				this.collection = [];
			}
		});
		deep.store.Collection.create = function(protocol, collection, schema, options) {
			return new deep.store.Collection(protocol, collection, schema, options);
		};
		deep.sheet(deep.store.FullJSONStoreSheet, deep.store.Collection.prototype);
		return deep.store.Collection;
	};
});