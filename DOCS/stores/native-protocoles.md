# Native protocoles and stores

Protocoles and stores are related but are not the same thing.

Stores are, basicaly, objects collections manager which provides standard HTTP/Restful API to do their jobs.

Protocoles are just a way to indicate, in ressources references, how and from where retrieve related ressources.
So protocoles are just sugar to tell which ressources provider use.

Stores and [simples functions](./custom-protocoles.md) could be such provider.


## core protocoles 

### js::

simple protocole that use requirejs (browser side) and nodejs require (of course server side) to load ASYNCHRONOUSLY javascript ressources (AMD module).
It use natively the requirejs/require cache system.

```javascript

deep("js::deep/deep-unit").done(function(Unit){
	Unit.run(deep.coreUnits);
})
.fail(function(e){
	console.warn("failed to get ressource : ", e);
});


```

### instance::


Same than js:: except that ressource need to be javascript Class (a function) that will be instanciate (with no arguments sent to constructor) before injection in promise.

```javascript

deep("instance::/path/to/your/class.js").done(function(instance){
	if(typeof instance === 'function')
		return new Error("instance was not an object");
})
.fail(function(e){
	console.warn("failed to get ressource : ", e);
});


```


### this::

Used in backgrounds only. (see [backgrounds and flatten](../backgrounds-and-flatten.md))

example :

```javascript

var obj2 = {
	a:{
		hello:"world"
	},
	b:{
		test:12
	},
	c:{
		backgrounds:["this::../a", "this::/b"]
	}
	//...
}

deep(obj2)
.flatten()
.logValues();

```

### dq family

#### Backgrounds usage : same as this:: (it's an alias) : 

```javascript

var obj2 = {
	a:{
		hello:"world"
	},
	b:{
		test:12
	},
	c:{
		backgrounds:["dq::../a", "dq::/b"]
	}
	//...
}

deep(obj2)
.flatten()
.logValues();

```

#### Sheets usage

```javascript

var sheet = {
    "dq.up::./!":{
        hello:"world",
        array:["from up"]
    },
    "dq.bottom::./!":{
        array:["from bottom"]
    },
    "dq.up::./a":{
        test:123,
        other:true
    }
};

var obj = {
    array:["base entry"],
    a:{
        test:1
    }
};

deep.utils.sheet(sheet, obj).log();

```


List of sheets related sub-protocoles :

* dq.up:: 	
* dq.bottom::
* dq.call::
* dq.transform::

More work on this should be done soon.

