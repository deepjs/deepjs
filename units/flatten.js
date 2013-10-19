if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../deep-unit"], function (require, deep, Unit) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES


    var unit = {
        title:"deep/units/flatten",
        stopOnError:false,
        setup:function(){
            var a = {
                obj:{
                    first:true
                },
                myFunc:function(){
                    //console.log("base myFunc");
                    this.obj.a = true;
                }
            };
            return {
                b : {
                    backgrounds:[a],
                    obj:{
                        second:true
                    },
                    myFunc:deep.compose.after(function()
                    {
                        //console.log("myFunc of b : ", this);
                        this.obj.b = true;
                    })
                }
            };
        },
        tests : {
            a:function(){
                return deep({})
                .bottom(this.b)
                .flatten()
                .run("myFunc")
                .query("./obj")
                .equal({
                    first:true,
                    second:true,
                    a:true,
                    b:true
                });
            },
            b:function(){
                return deep({
                    sub:{
                        backgrounds:[this.b],
                        obj:{
                            third:true
                        }
                    }
                })
                .flatten()
                .query("/sub")
                .run("myFunc")
                .query("./obj")
                .equal({
                        first:true,
                        second:true,
                        third:true,
                        a:true,
                        b:true
                });
            },
            c:function(){
                var bc2 = {
                    test:2
                };

                var bc = {
                    test:1
                };

                var b = {
                    backgrounds:[bc]
                };

                return deep({
                    backgrounds:[bc2, b],
                    c:{
                        backgrounds:[b],
                        prop:2
                    },
                    d:{
                        backgrounds:["this::../c"],
                    },
                    e:{
                        backgrounds:["this::/c"],
                    }
                })
                .flatten()
                .done(function(s){
                    return deep(s.test).equal(1)
                    .deep(s.d.prop).equal(2)
                    .deep(s.e.prop).equal(2);
                });
            }
        }
    };

    return new Unit(unit);
});
