

deepjs is a set of tools for managing standard javascripts functions, objects and promises.

Based on Layered and/or Chained Programmation approach, it provides, uses and mixes : 

* Layered Aspect Oriented Programmation
* Query Based Programmation including Code Sheet
* Object Capabilities Management (or Model)
* Full Promised and Chained asynch management
* Homogeneous HTTP Rest compliant ressources management
* Modularisation by Protocole approach

It works both server side and browser side. Its aim is to be totaly unobstrusive, ergonomic as possible and usable with any other js lib/framework.

As jquery (that is highly unobstrusive and ergonomic) works on standard DOM objects, deepjs works on standard js objects and functions structures.

See [tutorials](./DOCS/tutorials.md) page for details.   

Despite of the state of the documentations and too few tescases, deep has now achieved a certain kind of maturity and stability.
It is born through years of work and ideas, and has been named differently through its long history...

All that to say that we are now polishing last little things and working hard on documentation and testcases to provide, as quick as possible, a full, totaly new and almost battle ready, astonishing web 3.0 app plateform that we know you will really enjoy.

deepjs : simply made with love. 

Code is poetry.

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



Layered Aspect Oriented 
==========================

```javascript
	//-----------------Models
	var land = {
		location : "pls override this value with your own location",
		watering : function () {
			console.log("Water is applied on all the land");
		}
	};
	//-----------------Aspects
	var orchard = {
		plants : ["appletree"],
		watering : deep.compose.after(function () {
			console.log("We put some mulch after watering");
		})
	};

	var kitchenGarden = {
		plants : ["carrots"],
		watering : deep.compose.before(function () {
			console.log("We protect seedlings before watering");
		})
	};
	//-----------------Implement

	var myOwnLand = {
		location : "Sao Francisco do Guaporé",
		plants : ["grass"]
	};

	deep(myOwnLand).bottom(land).up(orchard,kitchenGarden);

	console.log("myOwnLand is : ", myOwnLand);
	myOwnLand.watering();
```





