### OCM and stores

To define a store with a particular behaviour for particular mode(s) (e.g. current user role(s)),
you could define the OCM manager directky with a protocol. (or associate the manager to its protocol later with deep.protocol(name, obj))

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

