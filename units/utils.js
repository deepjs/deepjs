/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../lib/utils/parser"], function (require, deep) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES


    var unit = {
        title:"deepjs/units/utils",
        stopOnError:false,
        tests : {
            parseQueryString:function(){
                return deep.nodes(deep.utils.parseQueryString("jos&jos=2&a.bloup=3"))
                .done(function(s){
                    delete s.toString;
                })
                .equal({
                    jos:[true,"2"],
                    a:{
                        bloup:"3"
                    }
                });
            },
            toQueryString:function(){
                return deep.nodes(deep.utils.toQueryString({
                    jos:[true,2],
                    a:{
                        bloup:3
                    }
                }))
                .equal("jos&jos=2&a.bloup=3");
            },
            removeInside_obj_keys:function(){
                var r = deep.utils.removeInside({
                    a:true,
                    b:24,
                    c:"hello"
                }, ["a", "c"])
                return deep.nodes(r)
                .equal({ b:24 });
            },
            removeInside_obj_obj:function(){
                var r = deep.utils.removeInside({
                    a:{
                        id:"anything"
                    },
                    b:{
                        id:"anything2"
                    },
                    c:"hello"
                }, { id:"anything" })
                return deep.nodes(r)
                .equal({ 
                    b:{
                        id:"anything2"
                    },
                    c:"hello"
                });
            },
            removeInside_obj_obj_key:function(){
                var r = deep.utils.removeInside({
                    a:{
                        id:"anything"
                    },
                    b:{
                        id:"anything2"
                    },
                    c:"hello"
                }, [{ id:"anything"}, "c"])
                return deep.nodes(r)
                .equal({ 
                    b:{
                        id:"anything2"
                    }
                });
            },
            removeInside_arr_key:function(){
                var r = deep.utils.removeInside([
                    "thus",
                    "bloup",
                    "hello"
                ], ["thus", "hello"])
                return deep.nodes(r)
                .equal([ 
                    "bloup"
                ]);
            },
            removeInside_arr_obj:function(){
                var r = deep.utils.removeInside([
                    {
                        id:"anything"
                    },
                    {
                        id:"anything2"
                    },
                    "hello"
                ], { id:"anything"})
                return deep.nodes(r)
                .equal([ 
                    {
                        id:"anything2"
                    },
                    "hello"
                ]);
            },
            removeInside_arr_obj_key:function(){
                var r = deep.utils.removeInside([
                    {
                        id:"anything"
                    },
                    {
                        id:"anything2"
                    },
                    "hello"
                ], [{ id:"anything"}, "hello"])
                return deep.nodes(r)
                .equal([ 
                    {
                        id:"anything2"
                    }
                ]);
            }
        }
    };

    return unit;
});

