if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../lib/unit"], function (require, deep, Unit) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES


    var unit = {
        title:"deep/units/collisions",
        stopOnError:false,
        setup:function(){},
        tests : {
            up:function(){
                return deep({
                    steps:[
                    {
                        id:"client",
                        label:"hello"
                    }]
                })
                .up({
                    steps:[
                        {
                            id:"address",
                            label:"heu"
                        },
                        {
                            id:"client",
                            label:"world",
                            testez:1
                        }
                    ]
                })
                .equal({
                 "steps": [
                  {
                   "id": "client",
                   "label": "world",
                   "testez": 1
                  },
                  {
                   "id": "address",
                   "label": "heu"
                  }
                 ]
                });
            },
            bottom_object:function(){
              var r = deep.utils.bottom({"a":{"second":true}},{"a":{"hello":"world"}});
              return deep(r.a).equal({ second:true, hello:"world" });
            },
            bottom_array:function(){
                return deep({
                    steps:[
                    {
                        id:"client",
                        label:"hello"
                    }]
                })
                .bottom({
                    steps:[
                        {
                            id:"address",
                            label:"heu"
                        },
                        {
                            id:"client",
                            label:"world",
                            testez:1
                        }
                    ]
                })
                .equal( {
                 "steps": [
                  {
                   "id": "address",
                   "label": "heu"
                  },
                  {
                   "id": "client",
                   "label": "hello",
                   "testez": 1
                  }
                 ]
                });
            },
            bottom_array2 : function(){
                return deep([1,2,3,{id:"e1", title:"hello" }])
                .bottom([4,5,{id:"e1", title:"bottom title" }])
                .equal([4,5,{id:"e1", title:"hello" },1,2,3]);
            },
            bottom_ocm:function(){
              var ocm = deep.ocm({
                a:{
                  hello:"world"
                }
              });
              deep.utils.bottom({a:{ second:true }}, ocm);
              return deep(ocm("a")).equal({second:true, hello:"world"});
            }
        }
    };

    return unit;
});







