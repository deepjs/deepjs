//-----------------Models
var land = {
	location: "Your Town",
	watering: function() {
		console.log(location + " : Water is applied on all the land");
	}
};
//-----------------Aspects
var orchard = {
	plants: [{
		id: "appletree",
		growSpeed: 5
	}, {
		id: "kiwi",
		growSpeed: 7
	}],
	watering: deep.compose.after(function() {
		console.log("We put some compost after watering");
	}).before(function() {
		console.log("We protect seedlings before watering");
	})
};

//-----------------Usage

var myOwnLand = {
	location: "Sao Francisco do Guaporé",
	plants: [{
		id: "grass",
		growSpeed: 3
	}]
};

deep(myOwnLand)
	.bottom(land)
	.up(orchard, { plantes:[{ id: "kiwi", growSpeed: 10 }] })
	.run("watering")
	.query("/plants/*")
	.up({
		size: 0,
		grow: function() {
			this.size += this.growSpeed;
		},
		prune: function(heightpruned) {
			this.size -= heightpruned;
		}
	})
	.run("grow")
	.query("../*?size=gt=5")
	.run("prune", 2);

console.log("myOwnLand is : ", myOwnLand);

/* 

We protect seedlings before watering
Sao Francisco do Guaporé : Water is applied on all the land
We put some compost after watering

myOwnLand is :
{
 "location": "Sao Francisco do Guaporé",
 "plants": [
  {
   "id": "kiwi",
   "growSpeed": 7,
   "size": 14
  },
  {
   "id": "grass",
   "growSpeed": 3,
   "size": 3
  },
  {
   "id": "appletree",
   "growSpeed": 5,
   "size": 5
  }
 ]
}
*/