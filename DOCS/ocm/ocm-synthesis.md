When you want to modelise, by example, a store with different 'roles' (could be any other 'flag'), that have different restrictions between roles, you have two ways to achieve this. 

## Soustractive modelisation


The idea, often more suited and practical, is to have a stack that goes from less to more restrictive API.
So we define the less restrictive API (here 'full'), and we remove capabilities depending on roles.

```javascript
var myStore = deep.ocm({
	full:{
		post:function(object){
			return "full access to : "+JSON.stringify(object); // deep.rest("something").mode("full").post(object);
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


deep
.roles("full")
.rest(myStore)
.post({ title:"hello", userID:"e12" })
.log()	// log success
.roles("middle")
.post({ title:"world", userID:"e12" })
.log()	// log error 412 (precondition)
.roles("less")
.post({ title:"hello", userID:"e13" })
.log()	// log error 403 (Owner)
.roles("none")
.post({ title:"hello", userID:12 })
.log()	// error 405	(Method not allowed)
```


## Additive modelisation

... todo
