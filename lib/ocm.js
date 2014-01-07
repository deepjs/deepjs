/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * @stability 3 stable
 */

//________________________________________________________________________ OCM for the mass !!!
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require"], function (require){

	return function(deep)
	{
        var genModes = {};

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

        deep.context = deep.context || {};
        deep.generalModes = function(arg){
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

        // deep mode management
        deep.modes = function(arg, arg2){
            return deep({}).modes(arg, arg2);
        };

        deep.setModes = function(arg, arg2){
            // console.log("generalMode : ", arguments)
            //if(!deep.context.generalModes)
             //   throw deep.errors.OCM("no general modes in context. your in a parano session. aborting.");
            return deep.generalModes(arg, arg2);
        };

    /**
         * OCM for the mass !!
         * return an Object Capabilities Manager
         * @param  {Object} layer (optional) initial layer
         * @param  {Object} options : { group:"string", init:Func, protocol:"string" }.  init = any function that will be fired on newly compiled object
         * @return {deep.OCM} an Object Capabilities Manager
         */
        deep.ocm = function(layer, options)
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
                    //console.log("compil modes : ",modes, deep.context);
                    var self = this;
                    var res = null;
                    if(!this.multiMode && modes.length === 1)
                        res = this.layer[modes[0]] || null;
                    else
                        modes.forEach(function (m) {
                            var r = self.layer[m];
                            if(r)
                               res = deep.utils.up(r, res);
                        });
                    if(res === null)
                    {
                        console.warn("OCM : no associate mode found with : ", modes, " for protocol : ", options.protocol);
                        return {};
                    }
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
                    else if ( deep.context.modes && deep.context.modes[params.group] )
                        modes = deep.context.modes[params.group];
                    else
                        throw deep.errors.OCM("You need to set a mode before using ocm objects : ", deep.context);
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
            //deep.ocm.instances.push(m);
            if(options.protocol)
            {
                m.name = options.protocol;
                deep.protocols[options.protocol] = m;
            }
            m._deep_ocm_ = true;
            m._deep_merger_ = true;
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
            m.flatten = function ()
            {
                console.log("ocm.flatten")
                if(params.blocked)
                    return deep.when(null);
                return deep(params.layer)
                .flatten()
                .done(function(){
                    return m;
                });
            };
            m.up = function()
            {
                var d = deep(params.layer);
                return d.up.apply(d,arguments);
            };
            m.bottom = function()
            {
                var d = deep(params.layer);
                return d.bottom.apply(d,arguments);
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
        deep.ocm.nocache = false;
        return deep;
	};
});


















