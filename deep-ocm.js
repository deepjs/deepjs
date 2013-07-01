/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */

//________________________________________________________________________ OCM for the mass !!!
if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(["require"], function (require){

	return function(deep)
	{
    /**
         * OCM for the mass !!
         * return an Object Capabilities Manager
         * @param  {String} protocole the name of the protocole associated with this manager
         * @param  {Object} layer (optional) initial layer
         * @param  {Function} init any function that will be fired on newly compiled object
         * @return {deep.OCM} an Object Capabilities Manager
         */
        deep.ocm = function(protocole, layer, init)
        {
            var params = {
                layer:layer || {},
                currentModes:null,
                compiled:{},
                compileModes:function(modes, layer)
                {
                    //console.log("compil modes : ",modes);
                    var res = {};
                    modes.forEach(function (m) {
                        var r = layer[m];
                        if(r)
                            deep.utils.up(r, res);
                    });
                    return res;
                },
                init:init
            }
            var m = function()
            {
                var modes = Array.prototype.slice.apply(arguments);
                if(modes.length === 0 || params.blocked)
                    if(params.currentModes && params.currentModes.length > 0)
                        modes = params.currentModes;
                    else if ( deep.context.mode && deep.context.mode.length > 0 )
                        modes = deep.context.mode;
                    else
                        throw deep.errors.OCM("You need to set a mode before using ocm objects");
                var joined = modes.join(".");
                if(params.compiled[joined])
                    return params.compiled[joined];
                var compiled = params.compileModes(modes, params.layer);
                if(!deep.ocm.nocache)
                    params.compiled[joined] = compiled;
                if(params.init)
                    params.init.call(compiled);
                return compiled;
            }
            deep.ocm.instances.push(m);
            if(protocole)
            {
                m.name = protocole;
                deep.protocoles[protocole] = m;
            }
            m._deep_ocm_ = true;
            m.mode = function (arg)
            {
                if(params.blocked)
                    return m();
                if(arg == null)
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
                }
            };
            m.unblock = function(key){};
            m.flatten = function ()
            {
                if(params.blocked)
                    return deep.when(null);
                return deep(params.layer).flatten();
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
            return m;
        }
        deep.ocm.instances = [];
        deep.ocm.nocache = false;
        // deep mode management
        deep.mode = function(args){
            return deep({}).mode((args)?Array.prototype.slice.apply(arguments):null);
        }
        deep.Chain.addHandle("mode", function(arg)
        {
            var self = this;
            var args = arguments;
            var func = function(s,e)
            {
                deep.context = self.context = deep.utils.simpleCopy(deep.context);
                if(arg instanceof Array)
                    deep.context.mode = arg;
                else
                    deep.context.mode = (arg)?Array.prototype.slice.apply(args):null;
            }
            func._isDone_ = true;
            deep.chain.addInChain.apply(self,[func]);
            return this;
        });
        deep.generalMode = function(){
            deep.context = deep.utils.simpleCopy(deep.context);
            deep.context.mode = Array.prototype.slice.apply(arguments);
        }
        //_____________________________________________________________

        return deep;
	}
});
