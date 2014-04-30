[Back to tutorials](../tutorials.md)
node more complex example
==========================


```javascript
	var http = require('http'),
		deep = require("deepjs");
	require("deep-swig").createDefault();

	//______________________________________________________ schema

	var schema = {
		properties:{
			id:{ type:"string", indexed:true },
			title:{ type:"string", required:true },
			date:{ type:"number" },
			random:{ type:"number" }
		},
		additionalProperties:false
	};

	//______________________________________________________ OCM on store for mode prod and dev

	deep.ocm("myobjects", {
		prod:{
			backgrounds:["instance::autobahn/stores/mongodb"],
			dbURL:"mongodb://127.0.0.1:27017/test",
			collectionName:"items",
			schema:schema
		},
		dev:deep.store.Collection.create(null, [], schema)
	})
	.flatten()
	.done(function(store){
		// store.multiMode(false);
		store("prod").init();
	});

	deep.generalMode("prod");

	//________________________________________________________________ HTTP SERVER

	http.createServer(function (req, response) {

		deep
		.rest("myobjects")
		.post({ title:"hello", date:new Date().valueOf(), random:Math.random() })
		.get(req.url.substring(1))
		.each("swig::./items.tpl")
		.done(function(res){
			response.writeHead(200, {'Content-Type': 'text/html'});
			response.end((res instanceof Array)?res.join("\n"):res);
		})
		.fail(function(error){
			response.writeHead(error.status || 500, {'Content-Type': 'application/json'});
			response.end(JSON.stringify(error));
		});

	})
	.listen(1337, '127.0.0.1');

	//_____________________________________________________________________ REPL
	console.log('Server running at http://127.0.0.1:1337/');
```


[Back to tutorials](../tutorials.md)


