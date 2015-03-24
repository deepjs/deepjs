/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../lib/unit"], function (require, deep, Unit) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES


    var unit = {
        title:"deepjs/units/interpret",
        stopOnError:false,
        setup:function(){},
        tests : {
            a:function(){
                // 2
                return deep.nodes({
                    msg:"hello { name }"
                })
                .query("./msg")
                .interpret({ name:"john" })
                .equal("hello john");
            },
            b:function(){
                return deep.nodes("mystring { id }")
                .interpret({id:12})
                .equal("mystring 12");
            },
            c:function(){
                return deep.nodes("mystring { id | 'hello' } after")
                .interpret({id:undefined})
                .equal("mystring hello after");
            },
            d:function(){
                return deep.nodes("mystring { id | '0' } after")
                .interpret({id:12})
                .equal("mystring 12 after");
            },
            e:function(){
                return deep.nodes("mystring { 'hello world' } after")
                .interpret({id:12})
                .equal("mystring hello world after");
            },
            addition:function(){
                return deep.nodes("mystring { 'hello world : '+'interpreted' + id } after")
                .interpret({id:12})
                .equal("mystring hello world : interpreted12 after");
            },
            addition_breaked:function(){
                return deep.nodes("mystring { id+'interpreted' | 'other' } after")
                .interpret({id:undefined})
                .equal("mystring other after");
            },
            array:function(){
                return deep.nodes("mystring { arr } after")
                .interpret({arr:[1,3,4]})
                .equal("mystring 1,3,4 after");
            }
        }
    };

    return unit;
});
