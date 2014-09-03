[Back to tutorials](./tutorials.md)
## Layered Aspect Oriented and Query Based programmation

deepjs define two fondamentals methods that deeply merge objects together : the 'up' and 'bottom' methods. 
Think your objects as (almost) bidimensionnal layers that you could stack, where properties (datas or functions) that share same path (from layers root - as deep as they are), are merged together, in stack order.
The way the merge is done, and so the result obtained, depends of collided properties nature (i.e. functions, arrays, objects, primitives, etc).

To make a parallele : Think about photoshop transparent layers stack : pixels from different layers that share same coord are merged together in stack order... 

## Examples

### Simple
```javascript
var a = { ok:true, title:"hello" };
var b = { title:"deepjs", label:"world" };
deep.aup(b,a);
console.log(a);	// => a is modified : { ok:true, title:"deepjs", label:"world"}
console.log(b);	// => b still the same : { title:"deepjs", label:"world"}
```

```javascript
var a = { ok:true, title:"hello" };
var b = { title:"deepjs", label:"world" };
deep.abottom(b,a);
console.log(a);	// => a is modified : { ok:true, title:"hello", label:"world"}
console.log(b);	// => b still the same : { title:"deepjs", label:"world"}
```


### All together
```javascript

	//-----------------Models
	var land = {
		location : "pls override this value with your own location",
		watering : function () {
			console.log("Water is applied on all the land");
		}
	};
	//-----------------Aspects
	var orchard = {
		plants : [{uri:"appletree",growSpeed:10}],
		watering : deep.compose.after(function () {
			console.log("We put some mulch after watering");
		})
	};

	var kitchenGarden = {
		plants : [{uri:"carrots",growSpeed:6}],
		watering : deep.compose.before(function () {
			console.log("We protect seedlings before watering");
		})
	};
	//-----------------Implement

	var myOwnLand = {
		location : "Sao Francisco do Guaporé",
		plants : [{uri:"grass",growSpeed:2}]
	};

	deep(myOwnLand)
	.bottom(land)
	.up(orchard,kitchenGarden)
	//Query based object modelisation
	.query("/plants/*").up({
		size : 0,
		grow : function () {
			this.size += this.growSpeed;
		},
		prune : function (heightpruned) {
			this.size -= heightpruned;
		}
	});


	console.log("myOwnLand is : ", myOwnLand);
	// will output :
	// myOwnLand is :
	// {
	// 	"location": "Sao Francisco do Guaporé",
	// 	"plants": [{
	// 		"uri": "grass",
	// 		"growSpeed": 2,
	// 		"size": 0,
	//		grow:func(),
	//		prune:func()
	// 	}, {
	// 		"uri": "appletree",
	// 		"growSpeed": 10,
	// 		"size": 0
	//		grow:func(),
	//		prune:func()
	// 	}, {
	// 		"uri": "carrots",
	// 		"growSpeed": 6,
	// 		"size": 0
	//		grow:func(),
	//		prune:func()
	// 	}],
	//	watering:func()
	// }
	
	
	myOwnLand.watering();
	// Will output :
	// We protect seedlings before watering
	// Water is applied on all the land
	// We put some mulch after watering
	

	//Query based object manipulation
	deep(myOwnLand)
	.query("/plants/*")
	.run("grow")
	.query("/plants/*?size=gt=5")
	.run("prune",[2]);

	console.log("myOwnLand is : ", myOwnLand);
	//output in the console : 
	//myOwnLand is :
	// {
	// 	location: "Sao Francisco do Guaporé",
	// 	plants: [{
	// 		uri: "grass",
	// 		growSpeed: 2,
	// 		size: 2,
	// 		grow:func(),
	// 		prune:func()
	// 	}, {
	// 		uri: "appletree",
	// 		growSpeed: 10,
	// 		size: 8,
	// 		grow:func(),
	// 		prune:func()
	// 	}, {
	// 		uri: "carrots",
	// 		growSpeed: 6,
	// 		size: 4,
	// 		grow:func(),
	// 		prune:func()
	// 	}],
 	// 	watering:func()
 	// }
```
