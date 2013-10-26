var http = require('http');
var deep = require('deep');

deep.store.Collection.create("myobjects", []);

var titles = ["hello", "deepjs", "world"];
var count = 0;

http.createServer(function (req, response) {
	deep
	.store("myobjects")
	.post({ title:titles[++count%3], date:new Date().valueOf(), count:count })
	.get(String(req.url).substring(1))
	.done(function(res){
		response.writeHead(200, {'Content-Type': 'application/json'});
		response.end(JSON.stringify(res));
	})
	.fail(function(error){
		console.log("error : ", error.toString());
		response.writeHead(error.status || 500, {'Content-Type': 'application/json'});
		response.end(JSON.stringify(error));
	});
})
.listen(1337, '127.0.0.1');

console.log('Server running at http://127.0.0.1:1337/');

