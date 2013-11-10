[Back to tutorials](./tutorials.md)

# OCM for the mass

Keep in mind that OCM, here (in deepjs), means Object Capabilities Manager.

That's it. It's just a manager of object (OO meaning) capabilities.

When you have designed your object through it's manager, you obtain an Object Capabilities Model (just a set of object identities associated to particular modes).

Then, you have the possibility, always through its manager, to get an object having different capabilities, depending on environnement state.

Keep also in mind that's OCM not exclusively related to security considerations.
You could easily manage, by example, GUI related object behaviours depending on production or developpement flags, or on current user roles, or any environnement flags of your choice.

## Simple example

```javascript

var myManager = deep.ocm({
	mode1:{
		test:1
	},
	mode2:{
		test:2,
		title:"hello world"
	},
	mode3:{
		backgrounds:["this::../mode2"],
		description:"mode 3 description"
	}
});

myManager.flatten(); // seek and apply backgrounds

console.log("mode1 : ", myManager("mode1"));
console.log("mode2 : ", myManager("mode2"));
console.log("mode3 : ", myManager("mode3"));


// or set its current mode and use it without knowing which mode is setted

myManager.mode("mode2");
...

console.log("current object : ", myManager());


```

output : 

```
mode1 : Object { test=1}
mode2 : Object { test=2, title="hello world"}
mode3 : Object { test=2, title="hello world", description="mode 3 description"}
current object : Object { test=2, title="hello world"}

```


## Mode collection

You could set multiple mode at once. It means that, in the order of provided modes, the different object identities are merged (deep up) and returned.

### Example

```javascript

var myManager = deep.ocm({
	mode1:{
		test:1
	},
	mode2:{
		title:"hello world"
	}
});

console.log("mode1 + mode2 : ", myManager("mode1", "mode2")); 
// => mode1 + mode2 : Object { test=1, title="hello world"}

console.log("mode2 + mode1 : ", myManager("mode2", "mode1")); 
// => mode1 + mode2 : Object { title="hello world", test=1 }

```


## Mode group, context and hierarchy

### Mode group

When you don't specify mich mode to use directly in OCM (manager), 
it will use the one accessible from current deep.context (see [context-management](./asynch/asynch-context-management.md)).

For that, you need to associate your manager to a modes group.
All OCMs of a certain group share same mode(s).
Current group's modes, (i.e. stored in deep.context), are 'local' to current promise/chain.

To set group's mode(s), you could use either deep.setModes( modeMap ) or deep.modes( modeMap ).

deep.setModes( modeMap ) set current groups mode(s) directly in current deep.context.
deep.modes( modeMap ) start a new deep.Chain with local deep.context.modes setted with rpovided map.

#### Example


```javascript

var myManager = deep.ocm({
	mode1:{
		test:1
	},
	mode2:{
		title:"hello world"
	}
});

myManager.group("myGroup");

...

deep.setModes({ "myGroup":["mode2", "mode1"]}); // set modes in current deep.context

...

deep.modes({ "myGroup":"mode1" }) // start a chain with provided modes
.delay(5)
.done(function(success){
	console.log("object under current chain mode : ", myManager()); 
	// => Object { test=1 }
})
.modes({ "myGroup":"mode2"} )
.delay(5)
.done(function(success){
	console.log("object under current chain mode : ", myManager()); 
	// => Object { title="hello world" }
})

console.log("object here : ", myManager()); 
// => Object { title="hello world", test=1 }

```

If you set and use different groups in deep.context, they are kept when you go deeper in call stack through promise/chain. It means that provided modeMaps are merged on previous one.

It permit to do : 

```javascript

//...

deep.modes({
	group1:"mode1"
})
.done(function(success){
    // deep.context.modes == { group1:"mode1" }
    return deep.modes({ group2:"mode2" })
    .delay(5)
    .done(function(success){
    	// deep.context.modes == { group1:"mode1", group2:"mode2" } 
	});
})
.delay(5)
.done(function(success){
    // deep.context.modes == { group1:"mode1" } 
});

console.log("deep.context.modes : ", deep.context.modes); // => {}

```

## Associate OCM with deep-protocol

Depending on what you want to obtain through protocol.

### Object store on ocm.

When you want to obtain a simple queriable object, which has a structure depending on a certain mode and usable from anywhere, you could simply use an OCM manager as root of an object store.

```javascript

var myManager = deep.ocm({
	mode1:{
		title:"hello mode1"
	},
	mode2:{
		title:"hello mode2"
	}
});

deep.store.Object.create("myprotoc", myManager);

//...

myManager.mode("mode1");

//...

deep("myprotoc::/title").log(); //=> "hello mode1"

```

### OCM store

To define a store with a particular behaviour for particular mode(s) (e.g. current user role(s)),
you could define the OCM manager as a protocol.

```javascript

var myManager = deep.ocm({
	mode1:{
		get:function(id, options)
		{
			return "mode1 result for id : "+id;
		}
	},
	mode2:{
		get:function(id, options)
		{
			return "mode2 result for id : "+id;
		}
	}
}, { protocol:"myprotoc" });

//...

myManager.mode("mode1");

//...

deep("myprotoc::my_id").log(); //=> "mode1 result for id : my_id"

```



## when to use OCM


## example for a store (browser or server side)


## example in GUI


# Security consideration