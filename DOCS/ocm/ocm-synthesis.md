When you want to modelise, by example, a store with different 'roles' (could be any other 'flag'), that have different restrictions between roles, you have two ways to achieve this. 

## Soustractive modelisation


The idea, often more suited and practical, is to have a stack that goes from less to more restrictive API.
So we define the less restrictive, and we remove capabilities depending on roles.

```javascript
var myStore = deep.ocm({
	full:{
		post:function(object){
			return "full access to : "+JSON.stringify(object); // deep.store("something").mode("full").post(object);
		}
	},
	middle:{
		backgrounds:["../full"],
		post:deep.compose.before(function(object){
			if(object.title != "hello")
				return deep.errors.PreconditionFailed();
		})
	},
	less:{
		backgrounds:["../middle"],
		post:deep.compose.before(function(object){
			if(object.userID !== "e12")
				return deep.errors.Owner();
		})
	},
	none:{
	}
});

deep(myStore)
.flatten()
.roles("full")
.done(function(myStore){
	return myStore().post({ title:"hello", userID:12 });
})
.log()
.roles("middle")
.logError();
```


## manage additive modelisation

... todo
