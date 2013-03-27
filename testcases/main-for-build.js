// main.js : load all first dependencies

require([ "testcases/app.js", "deep/deep"], function( app, deep ) {
	// console.log("deep ? ", deep);
	console.flags = {};
  	app();
});