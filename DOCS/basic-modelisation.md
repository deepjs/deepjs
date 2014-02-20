[Back to tutorials](./tutorials.md)
## Layered Aspect Oriented and Query Based programmation

deepjs define two fondamentals methods that deeply merge objects together : the 'up' and 'bottom' . 
Think your objects as bidimensionnal layers that you could stack, where properties or functions that share same path (from layers root), as deep as they are, are merged together, in stack order.

The way and the result of merge depends on collided object's nature and stack order.

Think about photoshop transparent layers stack : pixels from different layers that share same coord are merged together in stack order, and the way that they are merged depends on their fusion mode. 


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
	//output in the console :
	//myOwnLand is : Object { location="Sao Francisco do Guaporé", plants=	[Object { uri="grass", growSpeed=2, size=2, more...}, Object { uri="appletree", growSpeed=10, size=8, more...}, Object { uri="carrots", growSpeed=6, size=4, more...}], watering=TheCompoStart()}
	
	
	
	myOwnLand.watering();
	//output in the console : 
	//We protect seedlings before watering
	//Water is applied on all the land
	//We put some mulch after watering
	

	//Query based object manipulation
	deep(myOwnLand)
	.query("/plants/*")
	.run("grow")
	.query("/plants/*?size=gt=5")
	.run("prune",[2]);

	console.log("myOwnLand is : ", myOwnLand);
	//output in the console : 
	//myOwnLand is : Object { location="Sao Francisco do Guaporé", plants=[Object { uri="grass", growSpeed=2, size=2, more...}, Object { uri="appletree", growSpeed=10, size=8, more...}, Object { uri="carrots", growSpeed=6, size=4, more...}], watering=TheCompoStart()}
	

```
