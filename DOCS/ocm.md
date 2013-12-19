[Back to tutorials](./tutorials.md)

# OCM made simple.

By example, just imagine that you want an object with methods that do something different depending on app current user role(s) (server side or browser side). You want those method to keep same signature, but you want to use them transparently under different roles.

e.g. You want to have a myObject.hello() method that behave differently if you're logged in or not. Let say that it return "hello. please login." if your not logged in, and "hello John" if your logged as John.

You could do something like this : 

```javascript

var myObject = {
	currentUser:null,
	hello:function(arg){
		if(this.currentUser)
			return "hello "+this.currentUser.name;
		return "hello. please login."
	},
	login : function(login){
		currentUser = { name:login };
	},
	logout:function(){
		currentUser = null;
	}
}

```

Sure...

But what so if you want to do more fine grained logic and don't know yet all application roles? 
Each time you will have a new 'role', or a role refactoring, you will need to change the dispatching logic.

What if you want to make it more general and not depending on current's app roles naming or conventions?
What if you want to do code that could be reused easily in other cases, with other logic....

Here comes OCM.

Keep in mind that OCM, here (in deepjs), means Object Capabilities Manager.

That's it. It's just a manager of object (OO meaning) capabilities.

Its aim is to provide facilities to manage objects capabilities depending on certain flags. Lets call those flags 'modes'.

When you design your object through such manager, this manager holds the different models of your object, associated to their own mode(s).So a manager is just a set of object identities associated to particular modes.

Through this manager, you ask for an object having different capabilities, depending on environnement state.

Keep also in mind that OCM is not exclusively related to security considerations.
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

myManager.flatten(); // seek after and apply backgrounds

console.log("mode1 : ", myManager("mode1"));			// output : mode1 : Object { test=1}
console.log("mode2 : ", myManager("mode2"));			// output : mode2 : Object { test=2, title="hello world"}
console.log("mode3 : ", myManager("mode3"));			// mode3 : Object { test=2, title="hello world", description="mode 3 description"}

// or set its current(s) mode(s) directly in it and use it further without knowing which mode is setted

myManager.mode("mode2");
...
console.log("current object : ", myManager());		// output : current object : Object { test=2, title="hello world"}

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

Remarque : 'Compilation' of resulted object is done only once and kept securely in closures.

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

Depending on what you want to obtain through protocol...

### Object store on ocm.

When you want to obtain a simple queriable object, which has a structure depending on a certain mode and usable from anywhere, you could simply use an OCM manager as root of an deep.store.Object store.

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
you could define the OCM manager directky with a protocol. (or associate the manager to its protocole later with deep.protocole(name, obj))

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

## Shared objects

First, you need to know that each result obtained from an OCM (when you ask it in certain mode(s)) is totaly independant at run time from others OCM results. They are different objects that don't know each others.

Sometimes, you will want to share objects between OCM instances produced in different modes (pay attention of nodejs clustering if you do so).

All you need to get that, something shared between OCM instances, is to set a flag _deep_shared_ in it. That's all.
Or you could use `deep.Shared( yourValue )` that do it for you (i.e. it return yourValue decorated with `_deep_shared_:true`).


```javascript

var obj = deep.ocm({
	mode1:{
		test:function(){
			console.log("this.shared : ", this.myShared);
		},
		myShared:deep.Shared([1,2,3])
	},
	mode2:{
		backgrounds:["this::../mode1"],
		myShared:[4,5]
	}
});

obj.flatten();

obj("mode1").test();				// [1, 2, 3, 4, 5]
obj("mode1").myShared.push(6,7);
obj("mode2").test();				// [1, 2, 3, 4, 5, 6, 7]

```

## Backgrounds classes instances and constructor/init considerations

example with deep.store.Collection.


## Classes composition with OCM

You could use OCM prototype/constructor to define classes compositions.

For that you use deep.compose.ClassFactory(arg, ...) that take mix of functions, objects, and OCM (so the same thing than deep.compose.Classes(...) + OCM) and return a factory. This factory produce Classes depending en currents or provided (ocm) modes.

example :

```javascript

var proto = deep.ocm({
	mode1:{
		//...
	},
	mode2:{
		//...
	}
})

var constructor = deep.ocm({
	mode1:function(){ /*....*/},
	mode2:function(){ /*....*/}
})


var MyClassFactory = deep.compose.ClassFactory(constructor, proto, ...);
...
proto.mode("mode2");			// or set it through groups.
constructor.mode("mode1");			// or set it through groups.
...
var MyClass = MyClassFactory();			// produce MyClass with current modes
var instance = new MyClass(); 			// MyClass has constructor.mode1 and proto.mode2

```

example 2 :


```javascript

var proto = deep.ocm({
	mode1:{
		//...
	},
	mode2:{
		//...
	}
}, { group:"example"})

var constructor = deep.ocm({
	mode1:function(){ /*....*/ },
	mode2:function(){ /*....*/ }
}, { group:"example"})

var MyClassFactory = deep.compose.ClassFactory(constructor, proto, ...);

...

/* you could provide modes map (see above) to factory (that will be merge (deep up) with currents ones (if any)) 
and used before using OCM. Rmq : it uses a local deep.context, so it's safe to use any mode here without changing current context.*/

var MyClass = new MyClassFactory({ example:"mode1" })(); // MyClass has constructor.mode1 and proto.mode1

...

```

## Security considerations : context, protocols and parano.

## when to use OCM

### example for a store (browser or server side)

### example in GUI