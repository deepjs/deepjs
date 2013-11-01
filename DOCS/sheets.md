[Back to tutorials](./tutorials.md)
# deep code sheets

Think about CSS... 

A css is just a list of queries (css selection query) that apply styles to matched DOM elements.

A deep sheets it's all the same : 
A list of queries (deep-queries by others) that apply something (and somehow) to matched javascripts properties in a particular root object.

## Example 

dq.up and dq.bottom : 
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

dq.transform : 
```javascript

var sheet = {
    "dq.transform::./*":function(input){
        return "e"+input;
    }
};
var obj = [1,2,3,4,5];
deep(obj).sheet(sheet)
.equal({ // .equal tests strict equality of success object(s) (matching provided object). i.e. this is the promised (success) result. i.e. this is the sheet report 
    "dq.transform::./*": [
        "e1",
        "e2",
        "e3",
        "e4",
        "e5"
    ]
})
.valuesEqual(["e1", "e2", "e3", "e4", "e5"]); // .valuesEqual tests strict equality of values holds by chain. i.e. this is the modified object (through sheets operations) holded by chain. i.e. you see that 'transform' modifiy holded object(s)

```

dq.through : 
```javascript

var sheet = {
    "dq.through::./*":function(input){
        return "e"+input;
    }
};
var obj = [1,2,3,4,5];

deep(obj).sheet(sheet)
.equal({   
    "dq.through::./*": [
        "e1",
        "e2",
        "e3",
        "e4",
        "e5"
    ]
})
.valuesEqual([1,2,3,4,5]);   // .valuesEqual tests strict equality of values holds by chain. i.e. this is the modified object (through sheets operations) holded by chain. i.e. you see that 'through' DON'T modifiy holded object(s)

```


dq.sheeter : chained sheet application
```javascript
var sheet = {
    "dq.sheeter::./*":  deep.sheeter
                        .up({ fromUp:"tools" })
                        .bottom({ fromBottom:"hello" })
};

var obj = {
    a:{
        base:"deepjs"
    }
};

deep(obj)
.sheet(sheet)
.equal({
    "dq.sheeter::./*": [
        {
        "fromBottom": "hello",
        "base": "deepjs",
        "fromUp": "tools"
        }
    ]
})
.valuesEqual( {
    "a": {
        "fromBottom": "hello",
        "base": "deepjs",
        "fromUp": "tools"
    }
});

```

[Back to tutorials](./tutorials.md)

