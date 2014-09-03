[Back to tutorials](../tutorials.md)

## Asynch management

deep(js) uses and abuses of chained, promised based writing.
It helps you to manage your own asynch functions call sequences.

The idea is simple : you use, select and/or run your own objects/functions through deep's chain handlers that manage asynch for you.


```javascript

// our basical object/API
var farmManager = {
	animals : [
		{id: "chicken", weight :0, age:0, eat : "grain"},
		{id:"porc", weight:0, age:0, eat : "flour"},
		{id:"cow", weight:0, age:0, eat : "flour"}
	],
	water : function(){
		console.log("animals are watered");
	},
	feed : function (food) {
		return deep(this.animals)
		.query("./*?eat=" + food)
		.run(function () {
			return this.weight += 0.5;
		})
		.log("animals feeded")
		.logValues();
	}
};

// Add aspects
deep.aup({
	// now we add an aspect on water() that will
	// clean the place before watering the animals (asynchronous)
	water : deep.compose.before(function(){
		return deep(1).delay(1500*Math.random())
		.done(function(){
		    console.log("cleaning before watering");
		    //...
		    return "cleaning done";
		});
	}),
	// this function added to our farmManager will run 3 cycles of
	// watering and feeding the animals.
	// All the asynchronous is managed by the deep chain
	cycle : function(){
	    var d = deep(farmManager);
	    for(var i = 0;i<3;i++)
	       d.run("water").run("feed",["flour"]).delay(200);
	    return d;
	}
},farmManager);

// run the example
deep(farmManager)
.run("cycle")
.done(function(s){
	console.log(" 3 cycles finished : ",s);
})
.fail(function(error){
	console.error("cycles failed : ",e);
})

```

