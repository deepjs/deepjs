/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../lib/unit"], function (require, deep, Unit) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES


    var unit = {
        title:"deepjs/units/chains/values",
        stopOnError:false,
        tests : {
            promise_on_chain:function(){
                return deep.when(deep.nodes("hello").delay(1))
                .equal("hello");
            },
            delayed_run_return:function(){
                return deep.nodes({
                    a:true
                })
                .run(function(){
                    this.b = true;
                    return deep.nodes(this).delay(1);
                })
                .equal({ a:true, b:true });
            },
            delayed_run_call:function(){
                return deep.nodes({
                    c:function(){
                        return "c returned";
                    }
                })
                .run("c")
                .equal("c returned");
            },
            branch1:function(){
                return deep.nodes({
                    test:1
                })
                .branches(function(b){
                    b.branch().equal({test:1}).delay(2).when("branch 1");
                    b.branch().equal({test:1}).delay(1).when("branch 2");
                    return b;
                })
                .equal(["branch 1","branch 2"]);
            },
            up:function(){
                return deep.nodes({ a:true })
                .up({ b:true }, { c:true })
                .equal({ a:true, b:true, c:true });
            },
            bottom:function(){
                return deep.nodes({ a:true })
                .bottom({ b:true }, { c:true })
                .equal({ b:true, c:true, a:true});
            }
        }
    };

    return unit;
});
