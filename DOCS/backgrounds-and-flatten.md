# Backgrounds and flatten

Even that is the more cpu consuming method provided by deep to fetch and apply inheritance between objects, it is realy useful in many cases.

## Simple example

```javascript

var a = {
	myVar:1
}

var obj = {
	hello:"world",
	test:function(arg){
		console.log("arg : ",arg);
		return "yes";
	},
	otherVar:{
		backgrounds:[a]
	}
}

var obj2 = {
	backgrounds:[obj],
	test:deep.compose.after(function(arg){
		console.log("arg after : ",arg);
	})
}

deep(obj2)
.flatten()
.logValues()
.done(function(flattened){
    flattened.test("no");
});

```


## Externals files example

```javascript

var obj2 = {
	backgrounds:["js::path/to/my/object/to/inherit", "instance::path/to/class/to/instanciate/then/applied"],
	//...
}

deep(obj2)
.flatten()
//...

```

Remarque : Any protocole that provide js objects should work. (as json:: if you load a related store - see [protocoles](./stores/native-protocoles-and-stores.md))


## Internal inheritance examples

```javascript

var obj2 = {
	a:{
		hello:"world"
	},
	b:{
		backgrounds:["this::../a"]
	}
	//...
}

deep(obj2)
.flatten()
//...

```

You could obviously mix objects, externals and internals refrences.

