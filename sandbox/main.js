// main.js : load all first dependencies
require.config({
	baseUrl: "/libs/"
});
require([ "app.js", "deepjs/deep"], function( app, deep ) {
	app();
});