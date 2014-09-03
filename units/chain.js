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
                return deep.when(deep("hello").delay(1))
                .equal("hello");
            },
            delayed_run_return:function(){
                return deep({
                    a:true
                })
                .run(function(){
                    this.b = true;
                    return deep(this).delay(1);
                })
                .equal({ a:true, b:true });
            },
            delayed_run_call:function(){
                return deep({
                    c:function(){
                        return "c returned";
                    }
                })
                .run("c")
                .equal("c returned");
            },
            branch1:function(){
                return deep({
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
                return deep({ a:true })
                .up({ b:true }, { c:true })
                .equal({ a:true, b:true, c:true });
            }
        }
    };

    return unit;
});
