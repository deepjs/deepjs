node simple
=====

[Back to tutorials](../tutorials.md)


```javascript

var http = require('http');
var deep = require('deep');

deep.store.Collection.create("myobjects", []);

var titles = ["hello", "deepjs", "world"];
var count = 0;

http.createServer(function (req, response) {
	deep
	.store("myobjects")
	.post({ title:titles[++count%3], count:count })
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

```
Then, open your browser, go to http://127.0.0.1:1337/, refresh few times, and try :

http://127.0.0.1:1337/_id_of_an_item_in_collection_

or

http://127.0.0.1:1337/?title=deepjs

or

http://127.0.0.1:1337/?count=lt=2

