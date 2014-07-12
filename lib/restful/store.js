/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 *
 * TODO :
 *     - files extensions matching optimisation
 *     - add optimised mode that do not return deep chain handle for any HTTP verb (to be used when stores are used from within a chain)
 *     - check range object usage in chain
 *
 *
 *
 * - CLONE STORES : reset and initialised = false
 */

if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}

define(["require", "../../deep"], function(require, deep) {

	/**
	 * Empty class : Just there to get instanceof working (be warning with iframe issue in that cases).
	 * @class Store
	 * @constructor
	 */
	var Store = function(protocol) {
		//console.log("Store : protocol : ", protocol);
		if (protocol && typeof protocol === 'object')
			deep.utils.up(protocol, this);
		else
			this.protocol = protocol || this.protocol;

		if (this.protocol)
			deep.protocol(this.protocol, this);
		this._deep_store_ = true;
	};



	Store.prototype = {
		_deep_restrictable_: ["get", "range", "post", "put", "patch", "del", "rpc", "bulk"]
	};


	deep.utils.parseRestPath = function(path, parser) {
		if (path == '/')
			return {};
		if (parser) {
			var opt = parser.match(path);
			if (parser._deep_route_)
				opt = opt.output;
			return opt;
		}
		var options = {},
			splitted = path.split("/");
		if (path[0] === "/")
			splitted.shift();
		if (path[path.length - 1] == "/")
			splitted.pop();
		if (splitted[0][0] == "?")
			options.query = path;
		else {
			options.id = splitted.shift();
			if (splitted.length)
				options.path = "/" + splitted.join("/");
		}
		return options;
	};

	Store.manageRestPath = function(arg, options) {
		if (!arg || arg == '/')
			return deep.Arguments([arg, options]);
		return deep.Arguments([deep.utils.parseRestPath(arg, this.route), options]);
	};

	Store.managePathOptions = function(arg, options) {
		if (!options || options == '/')
			return deep.Arguments([arg, {}]);
		var str = null;
		if (typeof options !== 'string')
			str = options.path;
		else {
			str = options;
			options = {};
		}
		if (str) {
			var opt = deep.utils.parseRestPath(str, this.route);
			deep.utils.up(opt, options);
		}
		return deep.Arguments([arg, options]);
	};

	//deep.extensions = [];
	/**
     * start chain setted with a certain store
     * @example
     *
     * Store("json").get("/campaign/").log();
     
     *  ...
     *  Store("campaign").get("?").log()
     *
     *
     * @class Store
     * @constructor
     */
	Store.start = function(store) {
		//console.log("Store(name) : ", name)
		return deep(store || {})
			.done(function() {
				if (!this._storeDef)
					this.rest(store);
			})
			.done(function(s) {
				//console.log("store init trough chain : ", handler.provider);
				this._state.nodes = [deep.nodes.root(s)];
			});
	};

	deep.Store = Store;
	deep.client = {};
	deep.store = {};

	return Store;
});