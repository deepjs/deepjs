Query based object manipulation
==========================

[Back to tutorials](./tutorials.md)

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

	deep(myOwnLand).bottom(land).up(orchard,kitchenGarden);

	console.log("myOwnLand is : ", myOwnLand);
	myOwnLand.watering();
```
pour aller plus loin : link vers selector et autre tutos associé plus précis sur le query based
