[Back to tutorials](./tutorials.md)
# deep code sheets

Think about CSS... 

A css is just a list of queries (css selection query) that apply styles to matched DOM elements.

A deep sheets it's all the same : 
A list of queries (deep-queries for the moment - but we think about using also other object/json querier) 
that apply something (and somehow) to matched javascripts properties in a particular root object.

## dq.up and dq.bottom 

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

deep.utils.sheet(sheet, obj)
.done(function(success){
     console.log("result : ", JSON.stringify(success));
})
.equal({
    "dq.up::./!":[{
        "array":["from bottom","base entry","from up"],
        "a":{"test":123,"other":true},
        "hello":"world"
    }],
    "dq.bottom::./!":[{
        "array":["from bottom","base entry","from up"],
        "a":{"test":123,"other":true},
        "hello":"world"
    }],
    "dq.up::./a":[
        {"test":123,"other":true}
    ]
})
.log();

console.log("obj : ", JSON.stringify(obj)); // => obj : {"array":["from bottom","base entry","from up"],"a":{"test":123,"other":true},"hello":"world"}

```

## dq.transform

Each selected value is passed as argument in provided function AND the return of this function replaces original value

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

## dq.through

Each selected value is passed as argument in provided function AND the return of this function DOES NOT replaces original value.
To get results : read it in sheet application report.


```javascript

var sheet = {
    "dq.through::./*":function(input){
        return "e"+input;
    }
};
var obj = [1,2,3,4,5];

deep(obj)
.sheet(sheet)
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

## dq.sheeter

chainable sheet application handler.

### example
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

### sheeter API

#### up and bottom

"dq.sheeter::./*":deep.sheeter.up(obj1, obj2, obj3, ...)

or

"dq.sheeter::./*":deep.sheeter.bottom(obj1, obj2, obj3, ...)


#### deepLoad and load

"dq.sheeter::./*":deep.sheeter.deepLoad(context, destructive)

or

"dq.sheeter::./*":deep.sheeter.load(context, destructive)
    
#### flatten

"dq.sheeter::./*":deep.sheeter.flatten()

Flatten selected values.
    
#### sheet

"dq.sheeter::./*":deep.sheeter.sheet(sheet1, sheet2, ...)

apply provided sheet(s) on selected values.


[Back to tutorials](./tutorials.md)

