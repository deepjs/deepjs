//-----------------Models
var land = {
	location : "pls override this value with your own location",
	watering : function () {
		console.log("Water is applied on all the land");
	}
};
//-----------------Aspects
var orchard = {
	plants : [
		{id:"appletree", growSpeed : 5},
		{id:"kiwi", growSpeed : 10}
	],
	watering : deep.compose.after(function () {
		console.log("We put some mulch after watering");
	})
};

var kitchenGarden = {
	plants : [
		{id:"carrots", growSpeed : 2},
		{id:"sunflower", growSpeed : 8}
	],
	watering : deep.compose.before(function () {
		console.log("We protect seedlings before watering");
	})
};
//-----------------Implement

var myOwnLand = {
	location : "Sao Francisco do Guaporé",
	plants : [
		{id:"grass", growSpeed : 3}
	]
};

deep(myOwnLand)
.bottom(land)
.up(orchard,kitchenGarden)
//Query based object modelisation
.query("/plants/*").up({
	size : 0,
	grow : function () {
		this.size += growSpeed;
	},
	prune : function (heightpruned) {
		this.size -= heightpruned;
	}
});

//Query based object manipulation
deep(myOwnLand)
.query("/plants/*")
.run("grow")
.query("/plants/*?size=gt=5")
.run("prune",[2]);

console.log("myOwnLand is : ", myOwnLand);
