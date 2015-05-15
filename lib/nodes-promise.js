/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */

if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "../deep", "deep-nodes/lib/chained-api"], function(require, deep, api) {

	var NodesPromise = deep.NodesPromise = deep.Classes(deep.Promise, function(state, options) {
			options = options || {};
			var obj = options.obj,
				schema = options.schema;
			if (obj || schema)
				this._init(obj, schema);
			this._identity = NodesPromise;
		}, {
			_init: function(obj, schema) {
				if (obj && obj._deep_query_node_) {
					if (schema)
						obj.schema = schema;
				} else if (obj && obj._deep_array_)
				;
				else if (schema)
					obj = nodes.root(obj, schema);
				this._state.success = obj;
			}
		},
		api);

	deep.nodes = NodesPromise.start = function(obj, schema, options) {
		// console.log("CHAIN START ", obj)
		options = options || {};
		var h = new NodesPromise(options._state || null, options),
			d;
		try {
			if (typeof obj === 'string')
				obj = deep.get(obj, options);

			if (typeof schema === 'string')
				schema = deep.get(schema, options);

			if (!schema && obj && (obj.then || obj.promise))
				d = deep.when(obj)
				.done(function(res) {
					h._init(res);
					h.resolve();
				});
			if (schema && (schema.then || schema.promise))
				if (obj && (obj.then || obj.promise))
					d = deep.all([obj, schema])
					.done(function(res) {
						h._init(res[0], res[1]);
						h.resolve();
					});
				else
					d = deep.when(schema)
					.done(function(res) {
						h._init(null, res);
						h.resolve();
					});
			if (d)
				d.fail(function(error) {
					h.reject(error);
				});
			else {
				h._init(obj, schema);
				h.resolve();
			}
		} catch (error) {
			//console.log("internal chain start error : ", error);
			h.reject(error);
		}
		return h;
	};

	deep.Promise._up({
		nodes: function(val, schema, options) {
			options = options || {};
			var h = new NodesPromise(this._state, options);
			var self = this;
			var func = function(s, e) {
				return NodesPromise.start(val || s, schema, options);
			};
			this._enqueue(h);
			h._enqueue(func, "done");
			return h;
		}
	});

	return NodesPromise;
});