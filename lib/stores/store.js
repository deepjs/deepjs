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

define(["require"], function (require) {

	return function(deep){

		//deep.extensions = [];
		deep.clients = deep.client || {};
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
			return deep(deep.protocol.parse(name).done(function(handler){ return handler.provider; }))//, { ignoreInit:true, ignoreOCM:true}))
			.store(name);
		};

		/**
		 * Empty class : Just there to get instanceof working (be warning with iframe issue in that cases).
		 * @class deep.Store
		 * @constructor
		 */
		deep.Store = function (protocol) {
			//console.log("deep.Store : protocol : ", protocol);
			if(protocol && typeof protocol === 'object')
				deep.utils.up(protocol, this);
			else
				this.protocol = protocol || this.protocol;
			
			if (this.protocol)
				deep.protocol(this.protocol, this);
			this._deep_store_ = true;
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
		
		deep.store.filterPrivate = function(method)
		{
			return function(result){
				//console.log("private check : ", this, result);
				if(!this.schema)
					return result;
				var schema = this.schema;
				if(schema._deep_ocm_)
					schema = schema(method);
				var res = deep.utils.remove(result, ".//!?_schema.private=true", this.schema);
				return result;
			};
		};

		return deep;
	};
});





