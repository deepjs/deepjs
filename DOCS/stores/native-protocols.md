# Native protocols

[Back to tutorials](../tutorials.md)

Protocoles and stores are related but are not the same thing.

Stores are, basicaly, objects collections manager which provides standard HTTP/Restful API to do their jobs.

Protocoles are just a way to indicate, in ressources references, how and from where retrieve related ressources.
So protocols are just sugar to tell which ressources provider to use to get specific ressource(s).

Stores and [simples functions](./custom-protocols.md) could be such providers.


For a list of deepjs related stores and protocols extension, see [modules](../modules.md)


## core protocols 

### js::

simple protocol that use requirejs (browser side) and nodejs require (of course server side) to load ASYNCHRONOUSLY javascript ressources (AMD module).
It use natively the requirejs/require cache system.

```javascript

deep("js::deep/lib/unit").done(function(Unit){
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
		_backgrounds:["this::../a", "this::/b"]
	}
	//...
}

deep(obj2)
.flatten()
.logValues();  // will print : { hello:"world", test:12 }

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
		_backgrounds:["dq::../a", "dq::/b"]
	}
	//...
}

deep(obj2)
.flatten()
.logValues(); // will print : { hello:"world", test:12 }

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

deep.sheet(sheet, obj).log();

```

For more details on native sheet's protocol, see [sheets](../sheets.md)


