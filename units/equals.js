if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../deep-unit"], function (require, deep, Unit) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES

    var func = function(){
        return 12;
    };

    var func2 = function(){
        return 13;
    };

    function doDeepEqualTest(title, a, b, resultNeeded)
    {
        var ok = deep.utils.deepEqual(a,b);
        if(ok !== resultNeeded)
            return deep.errors.Internal("deep.equal unit test failed : result differ from expected : "+title);
        return true;
    }


    var unit = {
        title:"deep/units/equals",
        stopOnError:false,
        setup:function(){},
        tests : {
            a:function(){
                var a = { hello:"a", ref:null };
                var b = { hello:"a", ref:{} };
                return doDeepEqualTest("null different from {} : ", a,b, false);
            },
            b:function(){
                var a = { hello:"a", bye:{ t:"hello" } };
                var b = { hello:"a", bye:{ t:"hello" } };
                doDeepEqualTest("equal : ", a,b, true);
            },
            c:function(){
                var a = { hello:"a", bye:{ t:"hello" } };
                var b = { bye:{ t:"hello" }, hello:"a" };
                return doDeepEqualTest("not equal because order differ : ", a,b, false);
            },
            d:function(){
                var a = { hello:"a" };
                var b = { bye:"a" };
                return doDeepEqualTest("not equal : ", a,b, false);
            },
            e:function(){
                var a = { hello:"a" };
                var b = { hello:"b" };
                return doDeepEqualTest("not equal : ", a,b, false);
            },
            f:function(){
                var a = { hello:"a", bye:{ t:"hello" } };
                var b = { hello:"a", bye:{ t:"bye" } };
                return doDeepEqualTest("not equal : ", a,b, false);
            },
            g:function(){
                var a = { hello:"a", bye:{  } };
                var b = { hello:"a", bye:{ t:"hello" } };
                return doDeepEqualTest("not equal : ", a,b, false);
            },
            h:function(){
                var a = { hello:"a", bye:{ t:"hello"  } };
                var b = { hello:"a", bye:{ } };
                return doDeepEqualTest("not equal : ", a,b, false);
            },
            i:function(){
                var c = { day:"monday" };
                var a = { ref:c };
                var b = { ref:c };
                return doDeepEqualTest("ref object equal : ", a,b, true);
            },
            j:function(){
                var c = { day:"monday" };
                var d = { day:"monday" };
                var a = { ref:c };
                var b = { ref:d };
                return doDeepEqualTest("ref object different but equal : ", a,b, true);
            },
            k:function(){
                var c = { day:"monday" };
                var d = { day:"sunday" };
                var a = { ref:c };
                var b = { ref:d };
                return doDeepEqualTest("ref object different and not equal : ", a,b, false);
            },
            l:function(){
                var c = [1,'2'];
                var d = [1,'2'];
                var a = { ref:c };
                var b = { ref:d };
                return doDeepEqualTest("ref array different but equal : ", a,b, true);
            },
            m:function(){
                var c = [1,'2'];
                var d = [1,'2', 4];
                var a = { ref:c };
                var b = { ref:d };
                return doDeepEqualTest("ref array different and not equal : ", a,b, false);
            },
            n:function(){
                var c = [1,'2',3];
                var d = [1,'2',4];
                var a = { ref:c };
                var b = { ref:d };
                return doDeepEqualTest("ref array different and not equal : ", a,b, false);
            },
            o:function(){
                var c = [1,'2',4];
                var d = [4,1,'2'];
                var a = { ref:c };
                var b = { ref:d };
                return doDeepEqualTest("ref array different and equalbut order differ : ", a,b, false);
            },
            p:function(){
                var a = { func:func };
                var b = { func:func };
                return doDeepEqualTest("ref function equal : ", a,b, true);
            },
            q:function(){
                var a = { func:func };
                var b = { func:func2 };
                return doDeepEqualTest("ref function not equal : ", a,b, false);
            }
        }
    };

    return new Unit(unit);
});

