## manage soustractive modelisation

the idea is to have a stack that goes from less to more restrictive API.
We remove capabilities.

```javascript
var myStore = deep.ocm({
	full:{
		post:function(object){
			return "full access to : "+JSON.stringify(object); // deep.store("something").mode("full").post(object);
		}
	},
	middle:{
		schema:{
			ownerRestriction:"userID"
		},
		backgrounds:["../full"],
		post:deep.compose.before(function(object){
			if(object.title != "hello")
				return deep.errors.PreconditionFailed();
		}),
		del:deep.Store.forbidden()
	},
	less:{
		backgrounds:["../middle"],
		post:deep.compose.before(function(object){
			if(object.userID !== "e12")
				return deep.errors.Owner();
		})
	},
	none:{
		post:deep.Store.forbidden
	}
});

myStore.flatten()
.modes({roles:"full"})
.done(function(myStore){
	return myStore.post({ title:"hello", userID:12 });
})
.logError();
```


## manage additive modelisation

... todo
