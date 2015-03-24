/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../lib/unit"], function (require, deep, Unit) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES


    var unit = {
        title:"deepjs/units/collisions",
        stopOnError:false,
        setup:function(){},
        tests : {
            up:function(){
                return deep.nodes({
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
              var r = deep.abottom({"a":{"second":true}},{"a":{"hello":"world"}});
              return deep.nodes(r.a).equal({ second:true, hello:"world" });
            },
            bottom_array:function(){
                return deep.nodes({
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
                return deep.nodes([1,2,3,{id:"e1", title:"hello" }])
                .bottom([4,5,{id:"e1", title:"bottom title" }])
                .equal([4,5,{id:"e1", title:"hello" },1,2,3]);
            },
            bottom_ocm:function(){
              var ocm = deep.ocm({
                a:{
                  hello:"world"
                }
              });
              deep.abottom({a:{ second:true }}, ocm);
              return deep.nodes(ocm("a")).equal({second:true, hello:"world"});
            },
            aup1:function(){
              var a = { a:true };
              deep.aup({ b:true }, a);
              return deep.nodes(a).equal({ a:true, b:true });
            },
            abottom1:function(){
              var a = { a:true };
              deep.abottom({ b:true }, a);
              return deep.nodes(a).equal({ b:true, a:true });
            },
            up:function(){
              var tg = { a:true };
              deep.up(tg, { b:true }, { c:true });
              return deep.nodes(tg).equal({ a:true, b:true, c:true });
            },
            bottom:function(){
              var tg = { a:true };
              deep.bottom({ b:true }, { c:true }, tg);
              return deep.nodes(tg).equal({ b:true, c:true, a:true });
            }
        }
    };

    return unit;
});







