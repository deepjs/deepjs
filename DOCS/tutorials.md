
* [nodejs simple ](./nodejs/simple.md) 
* [nodejs more complex](./nodejs/full.md)
* [deep chain](./deep.md)
* [deep-query](./deep-query.md)
* [deep-rql](./deep-rql.md)
* [transparencies](./transparencies.md)

Layered Aspect Oriented 
==========================

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
		plants : ["appletree"],
		watering : deep.compose.after(function () {
			console.log("We put some mulch after watering");
		})
	};

	var kitchenGarden = {
		plants : ["carrots"],
		watering : deep.compose.before(function () {
			console.log("We protect seedlings before watering");
		})
	};
	//-----------------Implement

	var myOwnLand = {
		location : "Sao Francisco do Guaporé",
		plants : ["grass"]
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
	myOwnLand.watering();

	//Query based object manipulation
	deep(myOwnLand)
	.query("/plants/*")
	.run("grow")
	.query("/plants/*?size=gt=5")
	.run("prune",[2]);

	console.log("myOwnLand is : ", myOwnLand);

```
