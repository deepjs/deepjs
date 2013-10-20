if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../deep-unit"], function (require, deep, Unit) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES


    var unit = {
        title:"deep/units/chain",
        stopOnError:false,
        tests : {
            delayed_run_return:function(){
                return deep({
                    a:true
                })
                .run(function(){
                    this.b = true;
                    return deep(this).delay(5);
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
                    b.branch().equal({test:1}).delay(10).when("branch 1");
                    b.branch().equal({test:1}).delay(5).when("branch 2");
                    return b;
                })
                .equal(["branch 1","branch 2"]);
            }
        }
    };

    return new Unit(unit);
});
