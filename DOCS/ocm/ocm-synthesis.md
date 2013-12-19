## manage soustractive modelisation

the idea is to have a stack that goes from less to more restrictive API

```javascript
var manager = deep.ocm({
	full:{
		config:{
			owner:false
		},

		post:function(object){

			return "full access to : "+JSON.stringify(object); // deep.store("something").mode("full").post(object);
		}
	},
	middle:{
		config:{
			owner:true
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
			if(object.userId !== "e12") // deep.context.session.user.id)
				return deep.errors.Owner();
		})
	},
	none:{
		post:deep.Store.forbidden
	}
});


manager.flatten()
.modes({roles:"full"})
.done(function(s){
	manager().post({ title:"hello", userId:12 })
})
.fail(function(e){
	console.log("error when flatten : ",e);
})
```

