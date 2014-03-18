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
define(["require", "./utils", "./promise", "./flatten", "./sheet", "./errors", "./protocol"], 
    function(require, utils, prom, flattener, sheet, errors, protoc) {

    var argToArr = Array.prototype.slice;
    var generalModes = {};
    /*
        deep.paranos = function(full)
        {
            if(full)
                delete deep.context.protocols;
            if(deep.context.protocols)
            {
                deep.context.protocols = utils.simpleCopy(deep.context.protocols);
                for(var i in deep.context.protocols)
                    if(deep.context.protocols[i]._deep_ocm_)
                       deep.context.protocols[i] = deep.context.protocols[i]();
            }
//          delete deep.context.generalModes;
            delete deep.context.modes;
        };
*/


    /**
     * OCM for the mass !!
     * @example 
     * var manager = ocm({
    
     },{  
        groups:"roles",
        protocol:"myGeneralProtoc",
        afterCompilation:function(){
            return this;
        },
        mode:"public"
        applySheets:true
     })
     * return an Object Capabilities Manager
     * @param  {Object} layer (optional) initial layer
     * @param  {Object} options : { group:"string", afterCompilation:Func, protocol:"string" }.  afterCompilation = any function that will be fired on newly compiled object
     * @return {ocm} an Object Capabilities Manager
     */
    var ocm = function(layer, options) {
        //console.log("deep.ocm : ", layer, options);
        //console.log("deep.context : ", deep.context)
        options = options || {};
        var params = {
            groups: options.groups || options.group || null,
            flattened : options.flattened || false,
            strict: options.strict || false,
            layer: layer || {},
            currentModes: options.modes || null,
            compiled: {},
            multiModes: (typeof options.multiModes !== 'undefined')?options.multiModes:true,
            applySheets:options.applySheets || false,
            afterCompilation: options.afterCompilation || null,
            compile: function(modes, layer) {
                var self = this,
                    res = null,
                    sheetsPromises = [];
                if (this.multiModes === false && modes.length > 1)
                {
                    console.warn("OCM : no mulitMode allowed : provided modes : ", modes, " for protocol : ", options.protocol);
                    return {};
                } 
                var ok = modes.every(function(m) {
                    var r = self.layer[m];
                    if(typeof r === 'undefined')
                    {
                        if(self.strict)
                        {
                            console.warn("OCM : no associate entry found with : ", modes, " for protocol : ", options.protocol);
                            return false;
                        }
                        return true;
                    }
                    if (self.applySheets && r._deep_sheet_ && res)
                        sheetsPromises.push(sheet.sheet(r, res));
                    else
                        res = utils.up(r, res || {});
                    return true;
                });
                if(!ok)
                    return {};
                if (res === null) {
                    console.warn("OCM : no associate entries found with : ", modes, " for protocol : ", options.protocol);
                    return {};
                }
                if (sheetsPromises.length > 0)
                    res._deep_sheets_ = prom.all(sheetsPromises);
                return res;
            }
        };
        var m = function() {
            var modes = argToArr.call(arguments);
            if (modes.length === 0 || params.blocked)
                if (params.currentModes && params.currentModes.length > 0)
                    modes = params.currentModes;
                else if (params.groups) {
                    if (params.groups.forEach) {
                        modes = [];
                        for (var i = 0, len = params.groups.length; i < len; ++i)
                            if (deep.context.modes && deep.context.modes[params.groups[i]])
                                modes = modes.concat(deep.context.modes[params.groups[i]]);
                            else if (deep.Modes()[params.groups[i]])
                                modes = modes.concat(deep.Modes()[params.groups[i]]);
                    } 
                    else
                    {
                        if (deep.context.modes && deep.context.modes[params.groups])
                            modes = modes.concat(deep.context.modes[params.groups]);
                        else if (deep.Modes()[params.groups])
                            modes = modes.concat(deep.Modes()[params.groups]);
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
            if (!ocm.nocache)
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
        m.multiModes = function(yes) {               // allow multiple modes : i.e. : allow ["xxx","yyy", ...] (default : true)
            params.multiModes = yes;
        };
        m.groups = m.group = function(arg) {                   // define OCM group(s) on what 
            if (params.blocked)
                return m();
            params.groups = arg;
            return m;
        };
        m.modes = m.mode = function(arg) {                    // set current (local to this manager) mode(s)
            if (params.blocked)
                return m();
            if (arg === null)
                params.currentModes = null;
            else
                params.currentModes = argToArr.call(arguments);
            return m();
        };
        m.block = function(key) {                   // block current modes
            params.block = true;
            m.unblock = function(ukey) {
                if (ukey === key)
                    params.blocked = false;
            };
        };
        m.unblock = function(key) {};
        m.flatten = function(entry) {       // flatten inner-layer
            if (params.blocked)
                return prom.when(null);
            if(params.flattened)
                return params.flattened.promise();
            if (entry) {
                entry.value = params.layer;
                if (entry.ancestor)
                    entry.ancestor.value[entry.key] = params.layer;
            }
            var def = params.flattened = prom.Deferred();
            flattener.flatten(entry || params.layer)
            .done(function() {
                if (entry) {
                    entry.value = m;
                    if (entry.ancestor)
                        entry.ancestor.value[entry.key] = m;
                }
                def.resolve(m);
            });
            return def.promise();
        };
        m.up = function() {                 // apply arguments (up) on inner-layer
            params.flattened = false;
            for (var i = 0; i < arguments.length; ++i)
                params.layer = utils.up(arguments[i], params.layer);
            return params.layer;
        };
        m.bottom = function() {             // apply arguments (bottom) on inner-layer
            params.flattened = false;
            for (var i = 0; i < arguments.length; ++i)
                params.layer = utils.bottom(arguments[i], params.layer);
            return params.layer;
        };
        m.clone = function() {
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

    ocm.Roles = function(roles) {               // general ROLES
        if (!roles)
            return generalModes.roles;
        return ocm.Modes({
            roles: roles
        });
    }
    ocm.Modes = function(arg, arg2) {           // general MODES
        if (arguments.length === 0)
            return generalModes;
        if (typeof arg === 'string') {
            var obj = {};
            obj[arg] = arg2;
            arg = obj;
        }
        for (var i in arg)
            generalModes[i] = arg[i];
    };

    // deep chain's mode management
    ocm.modes = function(name, modes) {         // local roles (i.e. in chain's context)
        return deep({}).modes(name, modes);
    };

    // deep chain's roles management
    ocm.roles = function() {                    // local modes (i.e. in chain's context)
        return deep({}).roles(argToArr.call(arguments));
    };
    return ocm;
});