[Back to tutorials](./tutorials.md)

# OCM for the mass

Keep in mind that OCM, here (in deepjs), means Object Capabilities Manager.

That's it. It's just a manager of object (OO meaning) capabilities.

When you have designed your object through it's manager, you obtain an Object Capabiliies Model (just a set of object identities associated to particular modes).

THen you have the possibility, always through its manager, to get an object having different capabilities, depending on environnement state.

Keep also in mind that's OCM not exclusively related to security considerations.
You could easily manage, by example, GUI related object behaviours depending on production or developpement flags, or on current user roles.

## Example

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


