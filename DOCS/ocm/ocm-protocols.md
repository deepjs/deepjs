
## Associate OCM with protocol

Depending on what you want to obtain through protocol...

### Object store on ocm.

When you want to obtain a simple queriable object, which has a structure depending on a certain mode and usable from anywhere, you could simply use an OCM manager as root of a deep.store.Object.

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

myManager.modes("mode1");

//...

deep("myprotoc::/title").log(); //=> "hello mode1"

```
