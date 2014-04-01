/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../lib/unit"], function (require, deep, Unit) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES


    var unit = {
        title:"deep/units/range",
        stopOnError:false,
        tests : {
            "1:4":function(){
                return deep([0,1,2,3,4,5])
                .range(1,4)
                .valuesEqual([1,2,3,4]);
            },
            "2:4":function(){
                return deep(["hello","hell","heaven","helicopter","heat","here"])
                .range(2, 4)
                .equal( {
                 "_deep_range_": true,
                 "total": 6,
                 "count": 3,
                 "results": [
                  "heaven",
                  "helicopter",
                  "heat"
                 ],
                 "start": 2,
                 "end": 4,
                 "hasNext": true,
                 "hasPrevious": true,
                 "query":""
                })
                .valuesEqual(["heaven","helicopter","heat"]);
            },
            "2:5/?=match=(hel)":function(){
                return deep(["hello","hell","heaven","helicopter","heat","here"])
                .range(2, 5, "./?=match=(hel)")
                .equal(
                 {
                 "_deep_range_": true,
                 "total": 3,
                 "count": 1,
                 "results": [
                  "helicopter"
                 ],
                 "start": 2,
                 "end": 5,
                 "hasNext": false,
                 "hasPrevious": true,
                 "query":"./?=match=(hel)"
                })
                .valuesEqual(["helicopter"]);
            }
        }
    };

    return unit;
});
