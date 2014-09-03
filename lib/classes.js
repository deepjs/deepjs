/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
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
						if(r)
						{
							console.warn("apply object from constructor")
							compiler.aup(r, this);
						}
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
					sheets.sheet(cl, prototype);
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
		}/*,
		ClassFactory : function(){
			var args = arguments;
			var Factory = function (modes){
				var mds = Prom.Promise.context.modes;
				if(modes)
					compiler.aup(modes, mds);
				var context = Prom.Promise.contextualise();
				return new Prom.Promise().resolve({})
				.modes(mds)
				.done(function(){
					return compiler.Classes.apply({}, args);
				})
				.done();
			};
			return Factory;
		}*/
	};
	return classes;
});