if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../deep-unit"], function (require, deep, Unit) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES


    var unit = {
        title:"deep/units/chain",
        stopOnError:false,
        tests : {
            promise_on_chain:function(){
                return deep.when(deep("hello").delay(5))
                .equal("hello");
            },
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
            },
            listened_chain:function(){
                var d = deep(1)
                .delay(5)
                .done(function(s){
                    return "delayed";
                });
                var d2 = deep.when(d)
                .done(function(){
                    d.log(); // error : chain was ended
                })
                .fail(function(e){
                    //console.log("ended chain error : ", e.status);
                    if(e.status === 1001)
                        return true;
                });
                var d3 = deep({}).delay(5);
                try{
                    d.log(); // error : chain is listened
                }
                catch(e)
                {
                    //console.log("catched errorr : ",e)
                    if(e.status === 1001)
                        d3.when(true);
                    else
                        d3.when(e);
                    //console.log("normal error : chain is listened ! : ", e)
                }
                return deep.all(d2, d3);
            }
        }
    };

    return new Unit(unit);
});
