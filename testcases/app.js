/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
define(function(require){
	console.flags = { 
		"none":false
		//, "layer-factory": true
		//, "request-factory":true
		, "form-controller":true
		//, "view-controller":true
		//,"list-controller":true
		//,"list-item-controller":true
	};
	console.log("start app");
	deep = require("deep/deep");
	var init = function()
	{	
		console.log("app intialised");
	}
	return init;
})
