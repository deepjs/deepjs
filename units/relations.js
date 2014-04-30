/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../lib/unit"], function (require, deep, Unit) {
    
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
        title:"deepjs/units/relations",
        setup:function(){
            deep.store.Collection.create("plant", [{ id:"e1", title:"plant title" }], schema );
            deep.store.Collection.create("user", [{ id:"e1", title:"user title" }], schema );
        },
        clean:function(){
            delete deep.protocols.plant;
            delete deep.protocols.user;
        },
        stopOnError:false,
        tests : {
            getRelations:function(){
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
            mapRelations:function(){
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
            mapOn1:function(){
                return deep({ userId:"e1" })
                .mapOn("user::?", "userId", "id", "myUser")
                .valuesEqual( { "userId": "e1", "myUser": { "id": "e1", "title": "user title" } } );
            },
            mapOn2:function(){
                return deep([{ title:"my title", id:1}, { title:"my title 2", id:2}])
                .mapOn([
                    {itemId:1, value:true},
                    {itemId:2, value:"133"},
                    {itemId:2, value:"hello"}
                    ],
                    "id","itemId","linkeds")
                .equal([
                    {
                        title:"my title",
                        id:1,
                        linkeds:{itemId:1, value:true}
                    },
                    {
                        title:"my title 2",
                        id:2,
                        linkeds:[
                            {itemId:2, value:"133"},
                            { itemId:2, value:"hello"}
                        ]
                    }
                ])
                .valuesEqual([
                    {
                        title:"my title",
                        id:1,
                        linkeds:{itemId:1, value:true}
                    },
                    {
                        title:"my title 2",
                        id:2,
                        linkeds:[
                            {itemId:2, value:"133"},
                            { itemId:2, value:"hello"}
                        ]
                    }
                ]);
            }
        }
    };

    return unit;
});
