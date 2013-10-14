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


farmManager.doCycle = function(){
    var d = deep(farmManager);
    for(var i = 0;i<3;i++)
    {
       d.run("water").run("feed",["flour"]).delay(200);
    }
    return d;
};

deep(farmManager)
.run("doCycle")
.done(function(s){
    console.log(" 3 cycles finished : ",s);
});
```