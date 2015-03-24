/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * TODO : introduce lazzy compilation through _deep_upper_ mecanism + re-compilation mecanism when classes change.
 * 	OK
 *  => will allow classes compositions through layers and native up/bottom 		OK
 *  ==> allow deep.compose familly on Constructor 					not OK
 *  ==> allow recompilation when linked classes change 				OK
 *
 * deep.Classes() : return a empty class with _deep_compiler_ mecanism. OK
 * 
 */
 
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "./compiler", "./sheet", "./errors", "./class-constructor"], function(require, compiler, sheets, errors, constructor){
	
	var compile = function(closure){
		var prototype = {};
		for(var i = 0, len = closure.args.length; i < len; ++i)
		{
			var cl = closure.args[i];
			if(!cl)
				throw errors.Error(500, "You try to compose Classes with something wrong : "+String(cl));
			if(cl._deep_sheet_)
			{
				// console.log("applying sheet on constructor : ", prototype, cl)
				sheets.sheet(prototype, cl);
				continue;
			}
			if(typeof cl === 'function')
			{
				closure.constructors.push(cl);
				if(cl.prototype)
				{
					if(cl._deep_class_)
					{
						if(!closure.firstCompilation)
						{
							closure.firstCompilation = true;
							cl._link(closure);
						}
						cl.compile();
					}
					prototype = compiler.aup(cl.prototype, prototype);
				}
			}
			else
				prototype = compiler.aup(cl, prototype);
		}
		return prototype;
	};
	constructor.compile = compile;
	return constructor;
});