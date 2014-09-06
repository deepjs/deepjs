/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * @stability 3 stable
 *
 *
 *
 * TODO : refactor 'group' in 'modes'
 *
 *
 */

//________________________________________________________________________ OCM for the mass !!!
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "./utils", "./promise", "./flatten", "./sheet", "./errors", "./protocol", "./compiler"],
	function(require, utils, prom, flattener, sheet, errors, protoc, compiler) {

		var argToArr = Array.prototype.slice;
		var generalModes = {};
		/**
     * OCM for the mass !!
     * @example 
     * var manager = ocm({
    
     },{  
        sensibleTo:"roles",
        protocol:"myGeneralProtoc",
        afterCompilation:function(){
            return this;
        },
        mode:"public"
     })
     * return an Object Capabilities Manager
     * @param  {Object} layer (optional) initial layer
     * @param  {Object} options : { sensibleTo:"string", afterCompilation:Func, protocol:"string" }.  afterCompilation = any function that will be fired on newly compiled object
     * @return {ocm} an Object Capabilities Manager
     */
		var ocm = function(layer, options) {
			//console.log("deep.ocm : ", layer, options);
			//console.log("prom.Promise.context : ", prom.Promise.context)
			options = options || {};
			var params = {
				nocache: options.nocache ||  false,
				sensibleTo: options.sensibleTo|| null,
				flattened: options.flattened || false,
				strict: options.strict || false,
				layer: layer || {},
				currentModes: options.modes || null,
				compiled: {},
				multiModes: (typeof options.multiModes !== 'undefined') ? options.multiModes : true,
				afterCompilation: options.afterCompilation ||  null,
				compile: function(modes, layer) {
					var self = this,
						res = null,
						sheetsPromises = [];
					if (this.multiModes === false && modes.length > 1) {
						deep.warn("OCM : no mulitMode allowed : provided modes : ", modes, " (protocol : ", options.protocol, ")");
						return res;
					}
					var ok = modes.every(function(m) {
						var r = self.layer[m];
						if (typeof r === 'undefined') {
							if (self.strict) {
								deep.warn("OCM : no associate entry found with : ", modes, " (protocol : ", options.protocol, ")");
								return false;
							}
							return true;
						}
						if(res && r && r._deep_sheet_)
							deep.sheet(res, r);
						else
							res = compiler.aup(r, res);
						return true;
					});
					if (!ok)
						return {};
					return res;
				}
			};
			var m = function() {
				var modes = argToArr.call(arguments);
				if (modes.length === 0 /* || params.blocked*/ )
				{
					if (params.currentModes && params.currentModes.length > 0)
						modes = params.currentModes;
					else if (params.sensibleTo) {
						if (params.sensibleTo.forEach) {
							modes = [];
							for (var i = 0, len = params.sensibleTo.length; i < len; ++i) {
								var groupi = params.sensibleTo[i];
								if (prom.Promise.context.modes && prom.Promise.context.modes[groupi])
									modes = modes.concat(prom.Promise.context.modes[groupi]);
								else if (generalModes[groupi])
									modes = modes.concat(generalModes[groupi]);
							}
						} else if (prom.Promise.context.modes && prom.Promise.context.modes[params.sensibleTo])
							modes = modes.concat(prom.Promise.context.modes[params.sensibleTo]);
						else if (generalModes[params.sensibleTo])
							modes = modes.concat(generalModes[params.sensibleTo]);
					}
				}
				if (!modes || modes.length === 0)
					throw errors.OCM("You need to set a mode before using ocm objects.");
				if (!modes.forEach)
					modes = [modes];
				var joined = modes.join(".");
				if (params.compiled[joined])
					return params.compiled[joined];
				var compiled = params.compile(modes, params.layer);
				if (!ocm.nocache &&  !params.nocache)
					params.compiled[joined] = compiled;
				if (params.afterCompilation)
					return params.afterCompilation(compiled) || compiled;
				return compiled;
			};
			if (options.protocol) {
				m.name = options.protocol;
				protoc.protocol(options.protocol, m);
			}
			m._deep_ocm_ = true;
			m._deep_compiler_ = true;
			m._deep_flattener_ = true;
			m.multiModes = function(yes) { // allow multiple modes : i.e. : allow ["xxx","yyy", ...] (default : true)
				params.multiModes = yes;
			};
			m.sensibleTo = function(arg) { // define OCM group(s) on what 
				if (params.blocked)
					return m;
				params.sensibleTo = arg;
				return m;
			};
			m.modes = m.mode = function(arg) { // set current (local to this manager) mode(s)
				if (params.blocked)
					return m;
				if (arg === null)
					params.currentModes = null;
				else
					params.currentModes = argToArr.call(arguments);
				return m;
			};
			/*m.block = function(key) {                   // block current modes
            params.block = true;
            m.unblock = function(ukey) {
                if (ukey === key)
                    params.blocked = false;
            };
        };
        m.unblock = function(key) {};*/
			m.flatten = function(entry, force) { // flatten inner-layer
				// console.log("trying flatten ocm : ", prom.Promise.context.modes, params.blocked, params.flattened)
				if (params.blocked)
					return prom.when(null);
				if (!force && params.flattened)
					return params.flattened.promise();
				params.compiled = {};
				if (entry) {
					entry.value = params.layer;
					if (entry.ancestor)
						entry.ancestor.value[entry.key] = params.layer;
				}
				var def = params.flattened = prom.Deferred();
				flattener
					.flatten(entry || params.layer)
					.always(function() {
						if (entry) {
							entry.value = m;
							if (entry.ancestor)
								entry.ancestor.value[entry.key] = m;
						}
					})
					.done(function(res) {
						//console.log("ocm flten res : ", res);
						params.layer = res;
						def.resolve(m);
					}).fail(function(error) {
						def.reject(error);
					});
				return def.promise();
			};
			m._up = function() { // apply arguments (up) on inner-layer
				params.flattened = false;
				for (var i = 0; i < arguments.length; ++i)
					params.layer = compiler.aup(arguments[i], params.layer);
				return params.layer;
			};
			m._bottom = function() { // apply arguments (bottom) on inner-layer
				params.flattened = false;
				for (var i = 0; i < arguments.length; ++i)
					params.layer = compiler.abottom(arguments[i], params.layer);
				return params.layer;
			};
			m._clone = function() {
				var o = null;
				options.flattened = params.flattened;
				if (typeof protocol === 'string')
					o = ocm(utils.copy(params.layer), options);
				else
					o = ocm(utils.copy(params.layer), options);
				o.multiModes(params.multiModes);
				if (params.currentModes)
					o.modes(params.currentModes);
				return o;
			};
			return m;
		};
		ocm.nocache = false;

		//______________________________ OCM MODES MODIFIERS

		ocm.Roles = function(roles) { // general ROLES
			if (!roles)
				return generalModes.roles;
			return ocm.Modes({
				roles: roles
			});
		}
		ocm.Modes = function(arg, arg2) { // general MODES
			if (!arg)
				return generalModes;
			if (typeof arg === 'string') {
				if (arg2)
					generalModes[arg] = arg2;
				else
					return generalModes[arg];
			} else
				for (var i in arg)
					generalModes[i] = arg[i];
		};

		ocm.getModes = function(arg) {
			if (arguments.length > 0 && (typeof arg === 'string' || arg.forEach)) {
				var modes = [],
					args = arguments;
				if (arg.forEach)
					args = arg;
				for (var i = 0, len = args.length; i < len; ++i) {
					var argi = args[i];
					if (prom.Promise.context.modes && prom.Promise.context.modes[argi])
						modes = modes.concat(prom.Promise.context.modes[argi]);
					else if (generalModes[argi])
						modes = modes.concat(generalModes[argi]);
				}
				return modes;
			}
			var base = utils.copy(generalModes);
			if (prom.Promise.context.modes)
				for (var i in prom.Promise.context.modes)
					base[i] = prom.Promise.context.modes[i];
			if (!arg)
				return base;
			for (var i in arg)
				base[i] = arg[i];
			return base;
		}

		// deep chain's mode management
		ocm.modes = function(name, modes) { // local roles (i.e. in chain's context)
			return deep({}).modes(name, modes);
		};

		// deep chain's roles management
		ocm.roles = function() { // local modes (i.e. in chain's context)
			return deep({}).roles(argToArr.call(arguments));
		};
		return ocm;
	});