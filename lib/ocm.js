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
define(["require"], function (require){

        var genModes = {};
/*
        deep.paranos = function(full)
        {
            if(full)
                delete deep.context.protocols;
            if(deep.context.protocols)
            {
                deep.context.protocols = deep.utils.simpleCopy(deep.context.protocols);
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
     * return an Object Capabilities Manager
     * @param  {Object} layer (optional) initial layer
     * @param  {Object} options : { group:"string", init:Func, protocol:"string" }.  init = any function that will be fired on newly compiled object
     * @return {deep.OCM} an Object Capabilities Manager
     */
    var ocm = function(layer, options)
    {
        //console.log("deep.ocm : ", layer, options);
        //console.log("deep.context : ", deep.context)
        options = options || {};
        var params = {
            group:options.group,
            layer:layer || {},
            currentModes:null,
            compiled:{},
            multiMode:true,
            compileModes:function(modes, layer)
            {
                var self = this, res = null, sheetsPromises = [];
                if(!this.multiMode && modes.length === 1)
                    res = this.layer[modes[0]] || null;
                else
                    modes.forEach(function (m) {
                        var r = self.layer[m];
                        if(typeof r !== 'undefined')
                        {
                            if(options.applySheets && r._deep_sheet_ && res)
                                sheetsPromises.push(deep.sheet(r, res));
                            else
                                res = deep.utils.up(r, res || {});
                        }
                    });
                if(res === null)
                {
                    console.warn("OCM : no associate mode found with : ", modes, " for protocol : ", options.protocol);
                    return {};
                }
                if(sheetsPromises.length > 0)
                    res._deep_sheets_ = deep.all(sheetsPromises);
                return res;
            },
            init:options.init
        };
        var m = function()
        {
            var modes = Array.prototype.slice.apply(arguments);
            if(modes.length === 0 || params.blocked)
                if(params.currentModes && params.currentModes.length > 0)
                    modes = params.currentModes;
                else if(params.group)
                {
                    var checkIn = deep.context.modes || deep.Modes();
                    if(params.group.forEach)
                    {
                        modes = [];
                        for(var i = 0, len = params.group.length; i<len; ++i)
                            if(checkIn[params.group[i]])
                                modes = modes.concat(checkIn[params.group[i]]);
                    }
                    else
                        modes = checkIn[params.group];
                }
            if(!modes || modes.length === 0)
                throw deep.errors.OCM("You need to set a mode before using ocm objects.");
            if(!modes.forEach)
                modes = [modes];
            var joined = modes;
            if(typeof modes.join === 'function')
                joined = modes.join(".");
            if(params.compiled[joined])
                return params.compiled[joined];
            var compiled = params.compileModes(modes, params.layer);
            if(!deep.ocm.nocache)
                params.compiled[joined] = compiled;
            if(params.init)
                params.init.call(compiled);
            return compiled;
        };
        if(options.protocol)
        {
            m.name = options.protocol;
            deep.protocols[options.protocol] = m;
        }
        m._deep_ocm_ = true;
        m._deep_compiler_ = true;
        m._deep_flattener_ = true;
        m.multiMode = function(yes){
            params.multiMode = yes;
        };
        m.group = function (arg)
        {
            if(params.blocked)
                return m();
            params.group = arg;
            return m;
        };
        m.mode = function (arg)
        {
            if(params.blocked)
                return m();
            if(arg === null)
                params.currentModes = null;
            else
                params.currentModes = Array.prototype.slice.apply(arguments);
            return m();
        };
        m.block = function(key)
        {
            params.block = true;
            m.unblock = function(ukey){
                if(ukey === key)
                    params.blocked = false;
            };
        };
        m.unblock = function(key){};
        m.flatten = function (entry)
        {
            if(params.blocked)
                return deep.when(null);
            if(entry)
            {
                entry.value = params.layer;
                if(entry.ancestor)
                    entry.ancestor.value[entry.key] = params.layer;
            }
            return deep.flatten(entry || params.layer)
            .done(function(){
                if(entry)
                {
                    entry.value = m;
                    if(entry.ancestor)
                        entry.ancestor.value[entry.key] = m;
                }
                return m;
            });
        };
        m.up = function()
        {
            for(var i = 0; i <  arguments.length; ++i)
                params.layer = deep.utils.up(arguments[i],params.layer);
            return params.layer;
        };
        m.bottom = function()
        {
            for(var i = 0; i <  arguments.length; ++i)
                params.layer = deep.utils.bottom(arguments[i],params.layer);
            return params.layer;
        };
        m.clone = function(){
            var o = null;
            if(typeof protocol === 'string')
                o = deep.ocm(deep.utils.copy(params.layer), options);
            else
                o = deep.ocm(deep.utils.copy(params.layer), options);
            o.multiMode(params.multiMode);
            if(params.currentModes)
                o.mode(params.currentModes);
            return o;
        };
        return m;
    };
    ocm.Roles = function(roles){
        if(!roles)
            return genMode.roles;
        return output.Modes({roles:roles});
    }
    ocm.Modes = function(arg, arg2){
        if(arguments.length === 0)
            return genModes;
        if(typeof arg === 'string')
        {
            var obj = {};
            obj[arg] = arg2;
            arg = obj;
        }
        for(var i in arg)
            genModes[i] = arg[i];

    };

    // deep chain's mode management
    ocm.modes = function(name, modes){
        return deep({}).modes(name, modes);
    };

    // deep chain's roles management
    ocm.roles = function(){
        return deep({}).roles(Array.prototype.slice.call(arguments));
    };
    ocm.nocache = false;
    return ocm;
});


















