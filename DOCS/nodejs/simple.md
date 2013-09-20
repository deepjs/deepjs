node simple
=====


```javascript
var http = require('http'),
	deep = require("deep/deep");

deep.store.Collection("myobjects", []);

http.createServer(function (req, response) {
	deep
	.store("myobjects")
	.post({ title:"hello", date:new Date().valueOf() })
	.get(String(req.url).substring(1))
	.done(function(res){
		response.writeHead(200, {'Content-Type': 'application/json'});
		response.end(JSON.stringify(res));
	})
	.fail(function(error){
		response.writeHead(error.status || 500, {'Content-Type': 'application/json'});
		response.end(JSON.stringify(error));
	});
})
.listen(1337, '127.0.0.1');

console.log('Server running at http://127.0.0.1:1337/');
```
