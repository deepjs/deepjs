# Thin ORM

[Back to tutorials](../tutorials.md)


To manage relations between object, json-schema provides 'links' description wich could be seful to get linked objects.

Those tools should be enhanced soon.

## getRelations("relation1", "relation2", ...)

```javascript

    var schema1 = {
        properties:{
            id:{ type:"string", required:false, indexed:true },
            title:{ type:"string", required:true }
        },
        additionalProperties:false
    };

    var schema2 = {
        properties:{
            id:{ type:"string", required:false, indexed:true },
            label:{ type:"string" },
            plantId:{ type:"string" },
            userId:{ type:"string" }
        },
        links:[
            {
                href:"plant::{ plantId }",
                rel:"plant"
            }
        ]
    };

	deep.store.Collection.create("plant", [{ id:"e1", title:"plant title" }], schema1 );

	deep({
        plantId:"e1",
        userId:"e1",
        label:"hello"
    }, schema2)
    .getRelations("plant")
    .equal([
    {
        "rel":{"href":"plant::{ plantId }","rel":"plant"},
        "result":{"id":"e1","title":"plant title"}
    }
    ])
    .log();
	
```


## mapRelations( map )


```javascript 


    var schema1 = {
        properties:{
            id:{ type:"string", required:false, indexed:true },
            title:{ type:"string", required:true }
        },
        additionalProperties:false
    };

    var schema2 = {
        properties:{
            id:{ type:"string", required:false, indexed:true },
            label:{ type:"string" },
            plantId:{ type:"string" },
            userId:{ type:"string" }
        },
        links:[
            {
                href:"plant::{ plantId }",
                rel:"plant"
            }
        ]
    };

    deep.store.Collection.create("plant", [{ id:"e1", title:"plant title" }], schema1 );

    deep({
        plantId:"e1",
        label:"hello"
    }, schema2)
    .mapRelations({
        plant:"test.plant"
    })
    .equal([
        {"path":"test.plant","result":{"id":"e1","title":"plant title"}}
    ])
    .valuesEqual({ 
        "plantId": "e1", 
        "label": "hello", 
        "test": { 
            "plant": { 
                "id": "e1", 
                "title": "plant title" 
            }
        }
    });


```



