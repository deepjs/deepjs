if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../deep-unit"], function (require, deep, Unit) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES
    var postTest = {
        id:"id123",
        title:"hello",
        order:2
    };
    var putTest = {
        id:"id123",
        order:2,
        otherVar:"yes"
    };
    var patchTest = {
        id:"id123",
        order:4,
        otherVar:"yes",
        newVar:true
    };

    var unit = {
        title:"Generic store tests",
        tests : {
            post:function(){
                return deep.store(this)
                //.log("chain store init in test")
                .log("post")
                .post( postTest )
                .equal( postTest )
                .log("get")
                .get("id123")
                .equal(postTest);
            },
            put:function(){
                // post
                return deep.store(this)
                // put
                .log("put")
                .put(putTest)
                .equal( putTest )
                .log("get")
                .get("id123")
                .equal( putTest );
            },
            patch:function(){
                // post
                return deep.store(this)
                .log("patch")
                .patch({
                    order:4,
                    newVar:true,
                    id:"id123"
                })
                .equal(patchTest)
                //.log("patch")
                .log("get")
                .get("id123")
                .equal(patchTest);
            },
            query:function(){
                // post
                return deep.store(this)
                // query
                .log("query")
                .get("?order=4")
                .equal([patchTest]);
            },
            del:function () {
                var delDone = false;
                return deep.store(this)
                .log("del")
                .del("id123")
                .done(function (argument) {
                    delDone = true;
                })
                .log("get")
                .get("id123")
                .fail(function(error){
                    if(delDone && error.status == 404)
                        return true;
                });
            }
        }
    };



/*
deep.store("myobjects")
.patch({
    id:"id1381690769563",
    test:"hello",
    fdfsdfsddsfsdfsfdfsd:"11111111111"
})
.rpc("first", ["hhhhh","gggggg"], "id1381690769563")
.get()
.bulk([
    {to:"id1381690769563", method:"patch", body:{name:"updated 2"}},
    {to:"id1381690769563", method:"get"},
    {to:"id1381690769563", method:"rpc", body:{ args:["hello","blkrpc"], method:"first" }}
])
.log();
*/
    
});
