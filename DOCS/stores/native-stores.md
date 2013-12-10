# Native stores

[Back to tutorials](../tutorials.md)

deepjs come bundled with two memory stores.
One for collection management (deep.store.Collection), and the other to object management (deep.store.Object)

Both provides the same standard HTTP/Restful API (get, post, put, patch, delete).
And deep.store.Collection has additional standard restful compliant API : range, bulk and rpc.

Queries are done :
* for collection stores : in pure RQL (see Kris Zyp : [https://github.com/persvr/rql](https://github.com/persvr/rql)), 
* for object stores : with [deep-queries](../deep-queries.md).

They provides base homogeneous API to manage dummies objects as well as real databases or remote files or..., 
or to be the base classe for certain stores (as [deep-local-storage](https://github.com/deepjs/deep-local-storage)).

All collection-stores should respect exactly the same standard API and behaviour.

Docs on object-stores (deep.store.Object) will come quickly.

## Collection Store API

* get
* post
* put
* patch
* del
* query
* range
* rpc
* bulk

See also [privates](./constraints/privates.md), [readOnly](./constraints/readonly.md), [filters](./constraints/filters.md), [sanitize](./constraints/filters.md) and [ownership](./constraints/ownership.md) constraints from schema.

### Simple usage

```javascript

deep.store.Collection.create("myprotocole");  // native collection-memory-store

//...

deep.store("myprotocole")
.post( { title:"hello" } )
.post( { title:"deepjs" } )
.post( { title:"tools" } )
.log();

//...

deep("myprotocole::?title=deepjs")
.each(function(element){
	console.log("element from 'myprotocole' : ", element);
})
.fail(function(e){
	console.log("something were wrong : ", e.toString() );
});

```

### JSON schema usage

```javascript

var schema = {
	properties:{
		id:{ type:"string", indexed:true, readOnly:true },
		title:{ type:"string", required:true }
	},
	additionalProperties:false
}

deep.store.Collection.create("myprotocole", [], schema);

deep.store("myprotocole")
.post( { title:"hello", other:1 } )
.done(function(success){
	console.log("you should never se this, because schema isn't matched.")
})
.fail(function(e){
	console.log("something were wrong : ", e.toString() );
});


```


### Patch and put

```javascript

deep.store.Collection.create("myprotocole", [{ id:"e1", title:"hello", other:true }]);

//...

deep.store("myprotocole")
.patch( { title:"deepjs" }, { id:"e1"} )
.log() // ==> { id:"e1", title:"deepjs", other:true }
.put( { id:"e1", title:"deepjs" } )
.log(); // ==> { id:"e1", title:"deepjs" }


```


### JSON-RPC example

```javascript

deep.store.Collection.create("myprotocole", [{ id:"e1", title:"hello" }], null, {
	methods:{
		myProcedure:function(handler, arg1, arg2)
		{
			console.log("rpc call : myProcedure : this : ", this); // ==> { id:"e1", title:"hello" }
			console.log("args : ", arg1, arg2);  // => true, 123
			this.test = "from rpc call";
			return handler.save()
			.done(function(s){
			     return "yeah";
			});
		}
	}
});

//...

deep.store("myprotocole")
.rpc("myProcedure", [ true, 123 ], "e1")
.log("rpc result : ")
.log() // ==> "yeah"
.get("e1")
.log("object e1 after rpc : ")
.log(); // ==> { id:"e1", title:"hello", test:"from rpc call" }

```

### BULK updates

```javascript

deep.store.Collection.create("myprotocole", [{ id:"e1", title:"hello" }, { id:"e2", title:"world" }]);

//...

deep.store("myprotocole")
.bulk([
  {to:"e1", method:"put", body:{title:"updated 2"}, id: 1},
  {to:"e2", method:"put", body:{title:"updated 3"}, id: 2}
])
.log(); 
/*
output
[
  {"from":"e1", "body":{ <put response body> }, "id": 1},
  {"from":"e2", "body":{ <put response body> }, "id": 2}
]
*/

```

### Range

```javascript

deep.store.Collection.create("myprotocole", [
	{ id:"e1", title:"hello" }, 
	{ id:"e2", title:"deepjs" }, 
	{ id:"e3", title:"restful" },
	{ id:"e4", title:"tools" },
]);

//...

deep.store("myprotocole")
.range(1,2)
.logValues() 	// => two nodes : { id:"e2", title:"deepjs" } and { id:"e3", title:"restful" }
.log(); 		

```

the result injected in chain (that you could see with .log()) is an RangeResult object
 i.e. : 

 ```javascript

var res = {
	total:4,
	start:1,
	end:2,
	count:2
	hasNext:true,
	hasPrevious:true
};

 ```












