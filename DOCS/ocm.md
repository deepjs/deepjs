[Back to tutorials](./tutorials.md)

# OCM made simple.

OCM means Object Capability Model.

To fully understand what is it : imagine that you want a method that do something different depending on certain variables.

Let's compare...

- Example through classical approach : 
```javascript
var user = null;
var myFunc = function(){
	if(user)
		return "hello "+user.name;
	return "hello. please login."
}

myFunc(); 		// => output "hello. please login."
currentUser = { name:"John" };
myFunc(); 		// => output "hello John.": 

```

- Example through OCM approach :
```javascript
var user = null;
var myFunc = deep.ocm({
	"public":function(){
		return "hello. please login.";
	},
	"user":function(){
		return "hello "+user.name;
	}
});

var mode = "public";
myFunc(mode)(); 	// => output "hello. please login."
currentUser = { name:"John" };
mode = user;
myFunc(mode)(); 		// => output "hello John.": 

```

Keep in mind that OCM, here (in deepjs), means Object Capabilities Manager.
Its aim is to provide facilities to manage objects capabilities depending on certain flags. Lets call those flags 'modes'.

When you design your object through such manager, this manager holds the different models/aspects of your object, associated to their own mode(s).So a manager is just a set of object/method/identities/capacities/aspects associated to particular modes.
The place where manager keeps those models is called here 'inner layer'. (it's safely holded in local closure)

Ok. Now, compared to first conditionnal example : you didn't gain to much and you need to manage a second variable (i.e. the 'mode'). 
We agree...

But imagine now that you need to add another mode, as 'admin'.

With the conditionnal example : you will need to modifiy your code and do something like : 
```javascript
var myFunc = function(){
	if(!user)
		return "hello. please login.";
	else if(user.admin)
		return "hello admin";
	else
		return "hello " + user.name;
}
currentUser = { name:"John", admin:true };
...
myFunc(); 		// => output "hello admin": 
```
(i.e. you need to dive into conditionnal braching modelisation).

With OCM : you simply do this :
```javascript
var myFunc = deep.ocm({
	"public":function(){
		return "hello. please login.";
	},
	"user":function(){
		return "hello "+user.name;
	},
	"admin":function(){
		return "hello admin";
	}
});
currentUser = { name:"John", admin:true };
mode = 'admin';
...
myFunc(mode)(); // => output "hello admin"

```

You could start to see what benefits OCM gives : code stills clear and separated, and you could easily add or modify mode(s).
Each time you need to refactor or add more capabilities/aspects, you never need to change all conditionnal checks in all related functions.
You only need to define particular mode(s).

Now, you asking you : Ok, it seems to be cool. but...
- what if you have common code used by different modes?
- it's not really modular, and could be error prone, if you need to always provides the modes to the manager
- what if you want to use method or objects without needing to know if it's an OCManager or current modes?
- How could you make the difference?
- etc.

Ok. Lots of questions... 
So let's continue... but slowly.

## Sharing code between modes

As you work with deepjs and aspects, you could obviously use internal inheritance and backgrounds/flatten
to manage common behaviours (or datas) between ocm modes.

```javascript
var myManager = deep.ocm({
	mode1:{
		test:1
	},
	mode2:{
		backgrounds:["this::../mode1"],
		title:"hello world"
	},
	mode3:{
		backgrounds:["this::../mode2"],
		description:"mode 3 description"
	}
});
myManager.flatten(); // seek after and apply any backgrounds in inner layer (see deep.flatten docs)
...
console.log("mode1 : ", myManager("mode1"));			// output : mode1 : Object { test=1}
console.log("mode2 : ", myManager("mode2"));			// output : mode2 : Object { test=1, title="hello world"}
console.log("mode3 : ", myManager("mode3"));			// mode3 : Object { test=1, title="hello world", description="mode 3 description"}
```

## Modes collection

You could get multiple mode at once. It means that, in the order of provided modes, the different object identities are merged (deep up) and returned.

```javascript

var myManager = deep.ocm({
	mode1:{
		test:1
	},
	mode2:{
		title:"hello world",
		test:2
	}
});

console.log("mode1 + mode2 : ", myManager("mode1", "mode2")); 		// be careful to the order
// => mode1 + mode2 : Object { test=2, title="hello world"}

console.log("mode2 + mode1 : ", myManager("mode2", "mode1")); 		// be careful to the order
// => mode1 + mode2 : Object { title="hello world", test=1 }

```
Remarque : 'compilation' of resulted object is done only once and cached securely in manager's local closure.


The mode collection is really useful to do something like this :   (see deep.store docs )

```javascript
var myManager = deep.ocm({
	dev:deep.store.Collection.create(...),
	prod:deep.store.Mongo.create(...),
	"public":deep.store.Restrictions("del","post"),
	admin:{}
});

...

// try to delete something in local developpement store (a memory collection here) as "public" => return error 405  
myManager("dev","public").del("my_id");  

...

// try to delete something in production store (a mongo here) as "admin" => do the 'del' and return no error
myManager("prod","admin").del("my_id");  

```
## Strict compilation

Here, if you have well understoud the previous trick, you could have seen that 'admin' entry isn't necessary :
```javascript
myManager("prod","admin").del("my_id"); 
```
is equivalent to :

```javascript
myManager("prod").del("my_id"); 
```
You could even gives any unknown mode after 'prod' (or 'dev'), it will do the same :

```javascript
myManager("prod","bloup").del("my_id"); 
```

It's because the manager isn't <b>'strict'</b>. It compiles what it could find... without warning if there is no associated entries for certain of provided modes (it warns only it finds nothing at all). 

To disallow this behaviour, simply provide an options object to OCM constructor with `'strict':true` in it.

```javascript
var myManager = deep.ocm({
	dev:deep.store.Collection.create(...),
	prod:deep.store.Mongo.create(...),
	"public":deep.store.Restrictions("del","post"),
	admin:{}
}, { strict:true });

...

myManager("prod", "bloup").del("my_id");  // => will warn and return an empty object as there is no 'bloup' entry in ocm layer.
```
Remarque : even if strict : `myManager("prod","admin").del("my_id");`  and `myManager("prod").del("my_id");`  are equivalent in our case.
(i.e. in the example : admin is just an empty oject that doesn't modify the compiled result)

## multiModes or not.

Sometimes, you want that OCM manage only single mode. (so you want to not allow to mix different modes together)

```javascript
// you don't want to allow to mix 'public' and 'user' modes (there is no sens here to do so)
var myManager = deep.ocm({
	'public':deep.store.Collection.create(...),
	'user':deep.store.Mongo.create(...)
}, { multiModes:false });

...

myManager("public","user").get(...); // => will warn and return an empty object

```


## Mode groups, context and hierarchy

So... In deep.ocm, there is 4 ways to manage modes.

### Through direct usage of your manager (the two first ways)

First, the way that you've already seen here : just provides mode(s) as arguments when you ask ocm compilation.
```javascript
var manager =  deep.ocm({ ... });
...
var compiled = manager("mode1", "mode2");
...
```

Secondly, you could set its current mode(s) in manager itself, and use them 'blindly' after.
```javascript
var manager =  deep.ocm({ ... });
manager.modes("mode1");			// manager will hold provided mode(s) in it's local closure
...
var compiled = manager();		// it will use the internal mode previously defined (here : 'mode1').

```

### Through groups, deep.Modes and deep.modes

If you want to define once a mode somewhere that could be shared between different managers, 
you need to set, in your managers, the name(s) of the variable(s) that contain(s) your current mode(s).
You set it through 'groups' property or method : 
```javascript
var manager = deep.ocm({ ... }, { groups:"roles" });
```
or 
```javascript
var manager = deep.ocm({ ... });
...
manager.groups("roles");
...
```

Then, when you'll ask to your manager to return something, deep OCM will look in 3 namespaces after related 'group(s)' modes.
Lets explain the hierarchy between those namespaces:

<b>deep.Modes(mode1, mode2, ...)</b>  			: The more general but less hierarchicaly high : it holds global modes accessible from anywhere. 


<b>deep.modes(mode1, mode2, ...)</b>			: it start a chain that holds provided modes in its current deep.context  (see [docs on deep.context](./asynch/asynch-context-management.md) and chains)


<b>myOCManager.modes(mode1, mode2, ...)</b>	: The less general but more hierarchicaly high: it holds provided modes in the local ocm closure.


So, when you do ```var a = manager();```, deepjs will look first in manager itself after current modes.
If there is no current mode setted in manager, but there is a 'groups' property, deepjs will look in current deep.context.modes after the 'group(s)' modes, and apply it if any.
Finally, if there is no deep.context.modes that could be find with 'group(s)', it will look in deep.Modes namespace after it, and apply it if any.

If deepjs finds nothing : it will warn and return an empty object.

For full informations on deep.context and how tu use it : see [docs](./asynch/asynch-context-management.md).

Resumed : 
```javascript
var manager = deep.ocm({ 'public':'hello public',  'user':'hello user' }, { groups:"roles" });
...
deep.Modes("roles","public");
...
manager(); // will return 'hello public'  (it has found 'roles' in deep.Modes)
...
manager("user"); // will return : 'hello user' (it has used direct provided mode, that hides deep.Modes one)
...
manager.modes("user");
...
manager(); // will return : 'hello user' (it has used manager local current mode(s), that hides deep.Modes one)
...
deep.modes("roles", "user") // this start a chain with its own context containing modes:{ roles:'user' }
.done(function(){	
	console.log(manager()); // will return : 'hello user' (it has used deep.context.modes.roles, that hides deep.Modes().roles);
	...
	console.log(manager("public")); // will return : 'hello public' (it has used direct provided mode, that hides deep.context.modes and deep.Modes)
});
...
manager(); // will return 'hello public'  (it has found 'roles' in deep.Modes - because deep.context.modes is empty : only the chain has modified it)
```

## modes to null

When you want to remove a modes in one of the 3 namespaces (manager.modes(), deep.modes(), deep.Modes()) : just set it to null.
```javascript
deep.Modes("roles", "public");

var manager = deep.ocm(...);	// containing a 'user' and a 'public' entry

manager.groups("roles");
manager.modes("user");

manager()...; // => return 'user' entry (it has use manager current mode(s))

manager.modes(null);

manager()...; // => return 'public' entry (it has use deep.Modes().roles)

deep.Modes("roles", null);

manager()...; // => warn and produce an empty object because no modes are set to use OCM.
```

## Modes map

When you manipulate modes through deep.Modes or deep.modes, you could provide a modes map : 
```javascript
deep.Modes({
	roles:["user", "otherRole"],
	env:"dev"
});
...
```

If you do it twice, the namespace are merged at first level only.
It means :
```javascript
deep.Modes({
	roles:["user", "otherRole"],
	env:"dev"
});

...

deep.Modes({
	roles:["public"],
});

console.log(deep.Modes()); // => { roles:["public"], env:"dev" }

```

Resumed : when modes map are merged with a namespace (either deep.Modes or deep.context.modes (through deep.modes)), it does :
```javascript
for(var i in modesMap)
	namespace[i] = modesMap[i];
```
So you conserve OTHER groups that those gives in modesMap.


## Multi groups

You could also use a groups collection in your manager.

```javascript
var manager = deep.ocm({
	dev:deep.store.Collection.create(...),
	prod:deep.store.Mongo.create(...),
	'public':deep.store.AllowOnly("get", "range"),
	user:deep.store.Restrictions("del")
}, { groups:["env", "roles"] });

deep.Modes({
	roles:"user",
	env:"dev"
});

manager()...; // will compile local memory collection (dev entry) with 'user' restrictions 
```


## Shared objects

First, you need to know that each result obtained from an OCM (when you ask it in certain mode(s)) is totaly independant at run time from others OCM results. They are different objects that don't know each others.

Sometimes, you really want to share objects between OCM instances produced in different modes. 
Pay attention : you could get here a true multithreaded process with shared memory pattern (as deepjs could do concurrent asynch stuffs). But there is no mecanism to lock shared memory while using it. So no possible deadlock... but weird behaviours if you miss something).

All you need to obtain that, something shared between OCM instances, is to set a flag _deep_shared_ in it. That's all.
Or you could use `deep.Shared( yourValue )` that do it for you (i.e. it just return yourValue decorated with `_deep_shared_:true`).


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
## OCM deeply in layers.

You could place OCM objects at any level of your objects and use deepjs tools on it without worring.
```javascript
var a = {
	myProperty:{
		myValue:deep.ocm({ "public":"hello.", "user":"hello John." })
	},
	myOtherProperty:{
		backgrounds:["this::../myProperty"],
		myValue:{
			"user":"Hello John Doe."
		}
	}
};

deep(a)
.up({
	myProperty:{
		user:"Hello Johny."
	}
})
.flatten();

a.myProperty.myValue("user") // => will return "Hello Johny."
a.myOtherProperty.myValue("user") // => will return "Hello John Doe."
```
If you place 'backgrounds' in OCM (at any depth in objects), they will also be flattened transparently.

## Sheets in OCM

You could, by default, obviously define a deep.sheet through OCM.

```javascript
var mySheet = deep.ocm({
	"public":{
		"dq.bottom::./!":{ hello:"world" }
	},
	"user":{
		backgrounds:["this::../public"],
		"dq.bottom::./!":{ isUser:true }
	}
});

mySheet.flatten();

mySheet("user"); 
/* 
	=> will return 
	{
		"dq.bottom::./!":{ 
			hello:"world",
			isUser:true
		}
	}
*/
```
But you could also use them at compilation time (apply sheets while your ocmanager compiles).
For this : simply add an applySheets:true in ocm options

```javascript
var myObject = deep.ocm({
	"mySheet":{
		_deep_sheet_:true,
		"dq.bottom::./!":{ 
			hello:"world",
			isUser:true
		}
	},
	"public":{
		test:true
	},
	"user":{
		backgrounds:["this::../public"],
		test:false
	}
},{ applySheets:true });

myObject.flatten();

myObject("user", "mySheet"); 	// be careful to the order : the sheet is applyied after 
/* 
	=> will return 
	{
		hello:"world",
		isUser:true,
		test:false
	}
*/
```


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
});

var constructor = deep.ocm({
	mode1:function(){ /*....*/ },
	mode2:function(){ /*....*/ }
});

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
}, { group:"example"});

var constructor = deep.ocm({
	mode1:function(){ /*....*/ },
	mode2:function(){ /*....*/ }
}, { group:"example"});

var MyClassFactory = deep.compose.ClassFactory(constructor, proto, ...);s
...
var MyClass = new MyClassFactory({ example:"mode1" })(); // MyClass has constructor.mode1 and proto.mode1
...
```
you could provide 'modes map' (see above) to factory (that will be merge (deep up) with currents ones (from the 3 namespaces - if any)) 
and used before using OCM. Rmq : it uses a local deep.context, so it's safe to use any mode here without changing current context.

## Initialisation afterCompilation

You could provide a function that will be used just after a mode(s) combination is compiled through an ocmanager.
As compilation is done only once by mode's combination, the provided function will only be called once by mode(s) combination.
It means : 
```javascript
var manager = deep.ocm({
	mode1:{
		name:"John",
		familly:"Doe"
	},
	mode2:{
		name:"Herbert",
		familly:"Laevus"
	}
}, {
	afterCompilation:function(result){
		console.log("compiled : ", result.name, result.familly);
	}
});

manager("mode1"); // will log "compiled : John Doe"
manager("mode1"); // any later call will log nothing
manager("mode1"); // any later call will log nothing

manager("mode1", "mode2"); // will log "compiled : Herbert Laevus"
manager("mode1", "mode2"); // any later call will log nothing
manager("mode1", "mode2"); // any later call will log nothing

manager("mode2", "mode1"); // will log "compiled : John Doe"
manager("mode1", "mode2"); // any later call will log nothing
manager("mode1", "mode2"); // any later call will log nothing

manager("mode1"); // always no log
...
``` 

If 'afterCompilation' return a promise or anything else it will be the result returned by the ocm call :
```javascript
var manager = deep.ocm({
	mode1:{
		name:"John",
		familly:"Doe"
	},
	mode2:{
		name:"Herbert",
		familly:"Laevus"
	}
}, {
	afterCompilation:function(result){
		console.log("compiled : ", result.name, result.familly);
		return deep.when(result)
		.done(function(res){
			return "hello";
		});
	}
});

var promise = manager("mode1");
promise.log(); // will log : 'hello'

``` 

[Back to tutorials](./tutorials.md)

or you could read further on OCM :

* [Additive vs restrictive](./ocm/ocm-synthesis.md)
* [ocm and protocols](./ocm/ocm-protocols.md)
* [ocm and stores](./ocm/ocm-stores.md)
* [Delegation](./ocm/ocm-delegate.md)

