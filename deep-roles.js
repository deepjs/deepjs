/**
 *
 *
 *  
 * @module deep
 * @submodule deep-roles
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(function(require)
{
	var deep = require("deep/deep");

	/**
	 * Just a namespace : where default and custom roles are mainly stored. 
	 * @class deep.roles
	 * @static
	 * @type {Object}
	 */
	deep.roles = {

	}

	/**
	 * @class Role
	 * @namespace deep
	 * @constructor
	 */
	var DeepRole = function(){

	}

	DeepRole.prototype = {
		/**
		 * @property _deep_role
		 * @private
		 * @type {Boolean}
		 */
		_deep_role_:true

	}

	/**
	 * @for deep.Chain
	 * @method role
	 * @param  {String*} arguments a list or arguments
	 * @return {deep.Chain} the chain hanlder
	 */
	deep.Chain.prototype.role = function () {
		
	}

	return deep;
});