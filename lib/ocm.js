/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * @stability 3 stable
 *
 * OCM : 
 * 	basics : http://en.wikipedia.org/wiki/Object-capability_model or http://en.wikipedia.org/wiki/Capability-based_security
 * 	more : Mark S. Miller, Ka-Ping Yee, Jonathan S. Shapiro (2003). ["Capability Myths Demolished"](http://srl.cs.jhu.edu/pubs/SRL2003-02.pdf) (PDF). Technical Report SRL2003-02. Systems Research Lab, Johns Hopkins University.
 *
 * 
 */

//________________________________________________________________________ OCM for the mass !!!
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "./utils/misc", "./promise", "./flatten", "./sheet", "./errors", "./protocol", "./compiler"],
	function(require, utils, prom, flattener, sheet, errors, protoc, compiler) {

	var argToArr = Array.prototype.slice;
	var generalModes = {};
	/**
     * OCM for the mass !!
     * @example 
     * var manager = ocm({
    	...
     },{  
        sensibleTo:"roles"
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
						return undefined;
					return res;
				}
			};
			var getM = function(key, modes){
				var mod;
				if ((prom.Promise.context.modes && (mod = prom.Promise.context.modes[key])) || (mod = generalModes[key]))
					true;
				if(mod === true)
					return modes.concat(key);
				else if(mod)
					return modes.concat(mod);
				return modes;
			}
			var m = function() {
				var modes = argToArr.call(arguments);
				if (modes.length === 0 /* || params.blocked*/ )
				{
					if (params.currentModes && params.currentModes.length > 0)
						modes = params.currentModes;
					else if (params.sensibleTo) {
						if (params.sensibleTo.forEach) {
							for (var i = 0, len = params.sensibleTo.length; i < len; ++i)
								modes = getM(params.sensibleTo[i], modes);
						} 
						else modes = getM(params.sensibleTo, modes);
					}
				}
				if (!modes || modes.length === 0)
					throw errors.OCM("You need to set a mode before using ocm objects.");
				if (!modes.forEach)
					modes = [modes];
				var joined = modes.join(".");
				if (typeof params.compiled[joined] !== 'undefined')
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
			m.layer = function(){ return params.layer; };
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

		var setModes = function(obj, arg, arg2){
			if (typeof arg === 'string')
					obj[arg] = arg2;
			else
			{	
				for (var i in arg)
					obj[i] = arg[i];
			}
		};

		ocm.Modes = function(arg, arg2) { // general MODES
			if (!arg)
				return generalModes;			
			setModes(generalModes, arg, arg2);
		};

		ocm.currentModes = function(arg) {
			var context = prom.Promise.context;
			if (arguments.length > 0 && (typeof arg === 'string' || arg.forEach)) {
				var modes = [],
					args = arguments;
				if (arg.forEach)
					args = arg;
				for (var i = 0, len = args.length; i < len; ++i) {
					var argi = args[i];
					if (context.modes && context.modes[argi])
						modes = modes.concat(context.modes[argi]);
					else if (generalModes[argi])
						modes = modes.concat(generalModes[argi]);
				}
				return modes;
			}
			var base = utils.copy(generalModes);
			if (context.modes)
				for (var i in context.modes)
					base[i] = context.modes[i];
			if (!arg)
				return base;
			for (var i in arg)
				base[i] = arg[i];
			return base;
		};

		/**
		 * set current context modes. See OCM docs and Asynch context management.
		 * @param  {String|Object} arg  if it's an object : will use it as a map. If it's a string : use it as key (need second arguments)
		 * @param  {String} arg2 (optional) the value for the key (if provided)
		 * @return {deep.NodesChain}        this
		 */
		prom.Promise._up({
			modes : function(arg, arg2, noContextualisation) {
				var self = this;
				//console.log("chain.mode : ", arg, arg2, Promise.context.modes);
				//console.log("chain.mode obj: ", arg);
				var func = function(s, e) {
					if(!noContextualisation && !self._contextualised)
						prom.Promise.contextualise(self);
					self._context.modes = self._context.modes || {};
					setModes(self._context.modes, arg, arg2);
					//console.log("Promise.context.mode setted : ",self._context.modes);
					return s;
				};
				func._isDone_ = true;
				return self._enqueue(func);
			}
		});

		return ocm;
	});