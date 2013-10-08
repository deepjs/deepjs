

deepjs is a set of tools for managing standard javascripts functions, objects and promises.

Based on Layered and/or Chained Programmation approach, it provides, uses and mixes : 

* Layered Aspect Oriented Programmation
* Query Based Programmation including Code Sheet
* Object Capabilities Management (or Model)
* full Promised and Chained asynch management
* homogeneous HTTP Rest compliant ressources management
* Modularisation by Protocole approach

It works both server side and browser side. Its aim is to be totaly unobstrusive, ergonomic as possible and usable with any other js lib/framework.

As jquery (that is highly unobstrusive and ergonomic) works on standard DOM objects, deepjs works on standard js objects and functions structures.

See [tutorials](./DOCS/tutorials.md) page for details.   

Nodejs simple example
=====
```javascript

var http = require('http');
var deep = require("deep");

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




