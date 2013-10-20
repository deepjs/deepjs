if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../deep-unit"], function (require, deep, Unit) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES

    var schema = {
        properties:{
            id:{ type:"string", required:false, indexed:true },
            title:{ type:"string", required:true }
        },
        additionalProperties:false
    };
    //____________________________
    var schema2 = {
        properties:{
            id:{ type:"string", required:false, indexed:true },
            title:{ type:"string", required:true }
        },
        additionalProperties:false
    };
    //____________________________
    var schema3 = {
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
            },
            {
                href:"user::{ userId }",
                rel:"user"
            }
        ]
    };


    var unit = {
        title:"deep/units/relations",
        setup:function(){
            deep.store.Collection.create("plant", [{ id:"e1", title:"plant title" }], schema );
            deep.store.Collection.create("user", [{ id:"e1", title:"user title" }], schema );
        },
        clean:function(){
            delete deep.protocoles.plant;
            delete deep.protocoles.user;
        },
        stopOnError:false,
        tests : {
            a:function(){
                return deep({
                    plantId:"e1",
                    userId:"e1",
                    label:"hello"
                }, schema3)
                .getRelations("plant", "user")
                .equal([
                {
                    "rel":{"href":"plant::{ plantId }","rel":"plant"},
                    "result":{"id":"e1","title":"plant title"}
                },
                {
                    "rel":{"href":"user::{ userId }","rel":"user"},
                    "result":{"id":"e1","title":"user title"}
                }
                ]);
            },
            b:function(){
                return deep({
                    plantId:"e1",
                    userId:"e1",
                    label:"hello"
                }, schema3)
                .mapRelations({
                    user:"test.user",
                    plant:"test.plant"
                })
                .equal([{"path":"test.plant","result":{"id":"e1","title":"plant title"}},{"path":"test.user","result":{"id":"e1","title":"user title"}}])
                .valuesEqual({ "plantId": "e1", "userId": "e1", "label": "hello", "test": { "plant": { "id": "e1", "title": "plant title" }, "user": { "id": "e1", "title": "user title" } } });
            },
            c:function(){
                return deep({ userId:"e1" })
                .mapOn("user::?", "userId", "id", "myUser")
                .valuesEqual( { "userId": "e1", "myUser": { "id": "e1", "title": "user title" } } );
            }
        }
    };

    return new Unit(unit);
});
