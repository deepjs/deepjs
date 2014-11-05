/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * TODO : introduce lazzy compilation through _deep_upper_ mecanism + re-compilation mecanism when classes change.
 * 
 *  => will allow classes compositions through layers and native up/bottom
 *  ==> allow deep.compose familly on Constructor
 *  ==> allow recompilation when linked classes change
 *
 * deep.Classes() : return a empty class with _deep_upper_ mecanism.
 *
 * Lazzy compilation and recompilation when changed.
 * Compilation mecanism : 
 * 	deep.SuperChain.stack = [deep.Promise, deep.Chain]
 *  
 * on compiled or on up (setted once) : 
 * 		deep.Promise.linked.push(deep.SuperChain)
 *   	deep.Chain.linked.push(deep.SuperChain)
 *
 * So, when : deep.up(deep.Promise, proto) ==> change deep.Promise
 * 	==> _compiled = false to all that inherit/specialise from deep.Promise
 * 	deep.Promise.linked.forEach(function(link){
 * 		link._compiled = false;
 * 	})
 * 
 */
 
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "./compiler", "./sheet", "./errors", "./utils/misc"], function(require, compiler, sheets, errors, utils){
	var classes = {
		Classes : function(){
			var args = arguments;
			var prototype = {}, constructors = [];
			function Constructor(){
				for(var i in this)
					if(this[i] && typeof this[i] === 'object' && !this[i]._deep_shared_)
						this[i] = utils.copy(this[i]);
				for(var i = 0, len = constructors.length; i < len; ++i)
				{
					var cl = constructors[i];
					// if(typeof cl === 'function')
					// {
						var r = cl.apply(this, arguments);
						/*if(r)
						{
							throw new Error("apply object from constructor : "+ JSON.stringify(r))
							compiler.aup(r, this);
						}*/
					// }
				}
			};
			for(var i = 0, len = args.length; i < len; ++i)
			{
				var cl = args[i];
				if(!cl)
					throw errors.Composition("You try to compose Classes with something wrong : "+String(cl));
				if(cl._deep_ocm_)
					args[i] = cl = cl();
				if(cl._deep_sheet_)
				{
					sheets.sheet(prototype, cl);
					continue;
				}
				if(typeof cl === 'function')
				{
					constructors.push(cl);
					if(cl.prototype)
						prototype = compiler.aup(cl.prototype, prototype);
				}
				else
					prototype = compiler.aup(cl, prototype);
			}
			Constructor.prototype = prototype;
			return Constructor;
		}
	};
	return classes;
});