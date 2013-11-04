// main.js : load all first dependencies
require.config({
	 baseUrl: "/libs/"
});
require([ "app.js", "../deep.js"], function( app, deep ) {
	 console.log("deep ? ", deep);
  	app();
});