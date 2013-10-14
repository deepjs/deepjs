## Promised and Chained asynch management

```javascript
var farmManager = {
	animals : [
		{id: "poule", poids :0, age:0, eat : "grain"},
		{id:"porc", poids:0, age:0, eat : "farine"},
		{id:"vache", poids:0, age:0, eat : "farine"}
	],
	water : function(){
		console.log("animals are watered");
	},
	feed : function (nourriture) {
		return deep(this.animals)
		.query("./*?eat=" + nourriture)
		.run(function () {
			return this.poids += 0.5;
		})
		.log("animals feeded")
		.logValues();
	}
};

deep.utils.up({
    water : deep.compose.before(function(){
        var def = deep.Deferred();
        setTimeout(function(){
            console.log("cleaner avant water");
            def.resolve("clean done");
        },1500*Math.random());
        return def.promise();
    })
},farmManager);


farmManager.doCycle = function(){
    var d = deep(farmManager);
    for(var i = 0;i<3;i++)
    {
       d.run("water").run("feed",["farine"]).delay(200);
    }
    return d;
};

deep(farmManager)
.run("doCycle")
.done(function(s){
    console.log(" 3 cycles finished : ",s);
});
```