#deepjs

<b>deepjs core</b> (this lib) gathers a bunch of atomic and generic tools for better programming.
Each module could be used independently or together.

Above all, it will help you in <b>design</b>, <b>architecture</b> and <b>concurrent run-time management</b> of your OWN app.

Based on Layered and Chained Programmation approach, it provides, uses and mixes : 

It works both server side and browser side. Its aim is to be totaly unobstrusive, ergonomic as possible and usable with any other js lib/framework. It wants also to be absolutly homogeneous (isomorphic) between server and browser sides.

As jquery (that is highly unobstrusive and ergonomic) works on standard DOM objects, deepjs works with any standard js objects and functions, and has a minimal footprint.

Real huge thanks, amoung others, to [Kris Zyp](https://github.com/kriszyp) and all his incredible work on promises, json-schema, compositions, RQL, OCM, Persvr, etc.
Thanks also a lot to his bunch of articles on Thin-Server, No-SQL, mVC, etc. and all those realy smart architecural considerations that lead us trough our research...

deepjs : made with love. 


## Nodejs simple example

```javascript

var http = require('http');
var deep = require('deepjs'); // the core
require('deep-restful'); // homogeneous restful API
require('deep-restful/lib/collection'); // simple memory collection

new deep.Collection("myobjects", []);

var titles = ["hello", "deepjs", "world"];
var count = 0;

http.createServer(function (req, response) {
	deep
	.restful("myobjects")
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

http://127.0.0.1:1337/_an_id_of_an_item_in_collection_
or
http://127.0.0.1:1337/?title=deepjs
or
http://127.0.0.1:1337/?count=lt=2


## Layered Aspect Oriented and Query Based programmation

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
		plants : [{uri:"appletree",growSpeed:10}],
		watering : deep.compose().after(function () {
			console.log("We put some mulch after watering");
		})
	};

	var kitchenGarden = {
		plants : [{uri:"carrots",growSpeed:6}],
		watering : deep.compose().before(function () {
			console.log("We protect seedlings before watering");
		})
	};
	//-----------------Implement

	var myOwnLand = {
		location : "Sao Francisco do Guaporé",
		plants : [{uri:"grass",growSpeed:2}]
	};

	deep.nodes(myOwnLand)
	.bottom(land)
	.up(orchard,kitchenGarden)
	//Query based object modelisation
	.find("/plants/*").up({
		size : 0,
		grow : function () {
			this.size += this.growSpeed;
		},
		prune : function (heightpruned) {
			this.size -= heightpruned;
		}
	});


	console.log("myOwnLand is : ", myOwnLand);
	myOwnLand.watering();

	//Query based object manipulation
	deep.nodes(myOwnLand)
	.query("/plants/*")
	.run("grow")
	.find("/plants/*?size=gt=5")
	.run("prune",[2]);

	console.log("myOwnLand is : ", myOwnLand);

```

## Licence

The [MIT](http://opensource.org/licenses/MIT) License

Copyright (c) 2015 Gilles Coomans <gilles.coomans@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.



