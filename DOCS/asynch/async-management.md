## Promised and Chained asynch management

```javascript
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

// now we add an aspect on water() that will
// clean the place before watering the animals (asynchronous)
deep.utils.up({
    water : deep.compose.before(function(){
        var def = deep.Deferred();
        setTimeout(function(){
            console.log("cleaning before watering");
            def.resolve("cleaning done");
        },1500*Math.random());
        return def.promise();
    })
},farmManager);

// this function added to our farmManager will run 3 cycles of
// watering and feeding the animals.
// All the asynchronous is managed by the deep chain
farmManager.doCycle = function(){
    var d = deep(farmManager);
    for(var i = 0;i<3;i++)
    {
       d.run("water").run("feed",["flour"]).delay(200);
    }
    return d;
};

// run the example
deep(farmManager)
.run("doCycle")
.done(function(s){
    console.log(" 3 cycles finished : ",s);
});
```
