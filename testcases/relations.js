var schema = { 
    properties:{ 
        id:{ type:"string", required:false, indexed:true },
        title:{ type:"string", required:true }
    }, 
    additionalProperties:false   
}
deep.store("plant", [{ id:"e1", title:"plant title" }], { schema:schema });
//____________________________
var schema2 = { 
    properties:{ 
        id:{ type:"string", required:false, indexed:true },
        title:{ type:"string", required:true }
    }, 
    additionalProperties:false   
}
deep.store("user", [{ id:"e1", title:"user title" }], { schema:schema2 });
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
}
//____________________________
deep({ 
    plantId:"e1",
    userId:"e1",
    label:"hello"
}, schema3)
.getRelations("plant", "user")
.log();
//____________________________
deep({ 
    plantId:"e1",
    userId:"e1",
    label:"hello"
}, schema3)
.mapRelations({
    user:"test.user",
    plant:"test.plant"
})
.logValues();
//____________________________
deep({ userId:"e1" })
.mapOn("user::!", "userId", "id", "myUser")
.logValues();
//____________________________


