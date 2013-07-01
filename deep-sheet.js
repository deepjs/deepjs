/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(["require"], function (require){

	return function(deep)
	{
        //_____________________________________________________________________ CODE SHEETS

        /**
         * A deep implementation of Deferred object (see promise on web)
         * @class deep.Sheet
         * @constructor
         */
        deep.Sheet = function ()
        {
            if (!(this instanceof deep.Sheet))
                return new deep.Sheet();
            this.context = deep.context;
            return this;
        };

        deep.Sheet.prototype = {
            _deep_sheet_:true,
            context:null
        };

        return deep;
	}
})
