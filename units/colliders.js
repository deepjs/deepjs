/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../lib/unit"], function (require, deep, Unit) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES


    var unit = {
        title:"deepjs/units/colliders",
        stopOnError:false,
        tests : {
            replace:function(){
                var a = { b:{ c:[1,2,3]} };
                var c = {
                    b:deep.collider.replace([4,5], "./c")
                };
                return deep.nodes(a).up(c).equal({ b:{c:[4,5]} });
            },
            replace2:function(){
                var a = { b:[1,2,3] };
                var c = {
                    b:deep.collider.replace([4,5])
                };
                return deep.nodes(a).up(c).equal({ b:[4,5] });
            },
            "insertAt":function(){
                var a = { b:[1,2,3] };
                var c = {
                    b:deep.collider.insertAt([4,5],2)
                };
                return deep.nodes(a).up(c).equal({ b:[1,2,4,5,3] });
            },
            removeAt:function(){
                var a = { b:[1,2,3] };
                var c = {
                    b:deep.collider.removeAt(2, 1)
                };
                return deep.nodes(a).up(c).equal({ b:[1,2] });
            },
            removeAt2:function(){
                var a = { b:[1,2,3,4,5,6] };
                var c = {
                    b:deep.collider.removeAt(2,3)
                };
                return deep.nodes(a).up(c).equal({ b:[1,2,6] });
            },
            bottom:function(){
                var a = {
                    test:deep.collider.bottom({ hello:"world" })
                };
                return deep.nodes({ test:{ myVar:true } })
                .up(a)
                .equal({ test:{ hello:"world", myVar:true } });
            },
            bottom2:function(){
                var a = {
                    test:deep.collider.bottom({ hello:"world" }, { bye:"bloup"})
                };
                return deep.nodes({ test:{ myVar:true } })
                .up(a)
                .equal({ test:{ hello:"world", bye:"bloup", myVar:true } });
            },
            up:function(){
                var a = {
                    test:deep.collider.up({ hello:"world" })
                };
                return deep.nodes({ test:{ myVar:true } })
                .up(a)
                .equal({ test:{ myVar:true, hello:"world" } });
            },
            remove:function(){
                var a = {
                    test:deep.collider.remove()
                };
                return deep.nodes({ test:{ myVar:true } })
                .up(a)
                .equal({ });
            },
            remove2:function(){
                var a = {
                    test:deep.collider.remove("./myVar")
                };
                return deep.nodes({ test:{ myVar:true } })
                .up(a)
                .equal({ test:{}});
            },
            equal:function(){
                var a = {
                    test:deep.collider.equal("hello world")
                };
                return deep.nodes({ test:"hello world" } )
                .up(a)
                .equal({ test:"hello world" } );
            },
            equal2:function(){
                var a = {
                    test:deep.collider.equal("hello world")
                };
                return deep.nodes({ test:"hello" } )
                .up(a)
                .fail(function(e){
                    if(e.status == 412)
                        return "lolipop";
                })
                .equal("lolipop");
            },
            through:function(){
                var a = {
                    test:deep.collider.transform(function(input){ return input+" world";})
                };
                return deep.nodes({ test:"hello" } )
                .up(a)
                .equal({ test:"hello world" });
            },
            chainable:function(){
                return deep.nodes({ test:{ a:"yep", myArray:[67] } } )
                .up({
                    test:deep.collider.replace("bloup", "./a")
                                    .up({ lolipop:true })
                                    .bottom({ myArray:[34] })
                })
                .equal({
                    test:{ myArray:[34, 67], a:"bloup", lolipop:true }
                });
            }
        }
    };

    return unit;
});

