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
            "up":function(){
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
            "bottom":function(){
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
            bottom_deep_ocm_:function(){
              var autre = {
                  test:{
                      b:{
                          yee:true
                      }
                  }
              };
              var obj = {
                  backgrounds:[autre],
                  test:deep.ocm({
                      a:{
                          title:"hello a"
                      },
                      b:{
                          backgrounds:["this::../a"],
                          titleb:"bye"
                      }
                  })
              };

              var tt = obj.test;

              return deep(obj)
              .flatten()
              .done(function(success){
                  return tt("b");
              })
              .equal( { title:"hello a", yee:true, titleb:"bye"} );
            }
        }
    };

    return unit;
});

