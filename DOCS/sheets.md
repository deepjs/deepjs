# deep code sheets

Think about CSS... 

A css is just a list of queries (css selection query) that apply styles to matched DOM elements.

A deep sheets it's all the same : 
A list of queries (deep-queries by others) that apply something (and somehow) to matched javascripts objects and functions in a particular root object.

## Example 

```javascript 

var sheet = {
    "dq.up::./!":{
        hello:"world",
        array:["from up"]
    },
    "dq.bottom::./!":{
        array:["from bottom"]
    },
    "dq.up::./a":{
        test:123,
        other:true
    }
};

var obj = {
    array:["base entry"],
    a:{
        test:1
    }
};

deep.utils.sheet(sheet, obj).log();


console.log("obj : ", JSON.stringify(obj));

```
