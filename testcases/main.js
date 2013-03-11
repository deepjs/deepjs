// main.js : load all first dependencies


console.flags = {}
console.flog = function(flag, message)
{
	if(console.flags[flag])
		console.log(flag+" : "+message);
}

require.config({
	 baseUrl: "/common/js-lib",
    "packages": [{"name":"deep", "main":"deep.js"}]
});
require([ "app.js", "deep", "/common/js-lib/swig/swig.pack.min.js"], function( app, deep ) {
	// console.log("deep ? ", deep);
  	app();
});