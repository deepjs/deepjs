//________________________________________________________________________ OCM for the mass !!!
if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(["require"], function (require){

	return function(deep)
	{
/**
	 * OCM for the mass !!
	 * return an Object Capabilities Manager
	 * @param  {String} protocoleName the protocole associated with this manager
	 * @return {deep.OCM} an Object Capabilities Manager
	 */
	deep.ocm = function(protocoleName)
	{
		var params = {
			currentModes:null,
			stores:{},
			objects:{},
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
			}
		};
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
			var obj = {};
			if(!deep.ocm.nocache)
				params.compiled[joined] = obj;
			// compile stores
			var storesLayer = params.compileModes(modes, params.stores)
			obj.store =  function(storeName, direct)
			{
				if(storesLayer[storeName])
					if(direct)
						return storesLayer[storeName];
					else
						return deep.store(storesLayer[storeName]);
				return deep(deep.errors.Store("no stores found with : "+joined));
			}
			// compile objects
			for(var i in params.objects)
			{
				var compiledLayer = params.compileModes(modes, params.objects[i])
				obj[i] = compiledLayer;
			}
			return obj;
		}
		deep.ocm.instances.push(m);
		m.name = protocoleName;
		deep.protocoles[protocoleName] = m;
		m.add = function (name, protocole, layer)
		{
			if(params.blocked)
				return m;
			if(!layer)
			{
				layer = protocole;
				protocole = null;
			}
			else
				deep.protocoles[protocole] = function(path, options)
				{
					if(typeof path === 'object')
						path = path.uri;
					return deep.query(m()[name], path, options);
				}
			params.objects[name] = layer;
			return m;
		};
		m.flatten = function () {
			if(params.blocked)
				return deep.when(null);
			var alls = [];
			deep(params.stores).pushHandlerTo(alls).flatten();
			for(var i in params.objects)
				deep(params.objects[i]).pushHandlerTo(alls).flatten();
			return deep.all(alls);
		}
		m.stores = function(){
			if(params.blocked)
				return null;
			return deep(params.stores);
		};
		m.object = function(name){
			if(params.blocked)
				return null;
			return deep(params.objects[name]);
		};
		m._deep_ocm_ = true;
		m.mode = function (arg) {
			if(params.blocked)
				return m();
			if(arg == null)
				params.currentModes = null;
			else
				params.currentModes = Array.prototype.slice.apply(arguments);
			return m();
		};
		m.block = function(key){
			params.block = true;
			m.unblock = function(ukey){
				if(ukey === key)
					params.blocked = false;
			}
		};
		m.unblock = function(key){}
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
		addInChain.apply(self,[func]);
		return this;
	});
	deep.generalMode = function(){
		deep.context = deep.utils.simpleCopy(deep.context);
		deep.context.mode = Array.prototype.slice.apply(arguments);
	}
	return deep;
	}
});
