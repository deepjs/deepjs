# deep code sheets

Think about CSS... 

A css is just a list of queries (css selection query) that apply styles to matched DOM elements.

A deep sheets it's all the same : 
A list of queries (deep-queries by others) that apply something (and somehow) to matched javascripts objects and functions in a particular root object.

## Example 

```javasript 

var sheet = {
	"dq.up::./*":{
		hello:"world",
		array:["from up"]
	},
	"dq.bottom::./*":{
		array:["from bottom"]
	,
	"dq.series::./*":function(){
		console.log("series on : ", this);
		return deep(1).delay(10);
	}
}

var obj = {
	array:["base entry"]
}


deep.utils.sheet(sheet, obj).log();

```