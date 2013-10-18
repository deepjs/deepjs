if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../deep-unit"], function (require, deep, Unit) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES


    var unit = {
        title:"deep/units/compositions",
        stopOnError:false,
        setup:function(){
            this.options.context = {
                a : {
                    func1:function(){
                        //console.log("func1");
                        this.res.push("func1");
                    },
                    func2:deep.compose.createIfNecessary().before(function(){
                        //console.log("func2");
                        this.res.push("func2");
                    }),
                    func3:deep.compose.createIfNecessary().after(function(){
                        //console.log("func3");
                        this.res.push("func3");
                    })
                },
                b : {
                    res:[],
                    func1:deep.compose.after(function(){
                        // console.log("func1_1");
                        this.res.push("func1_1");
                    }),
                    func2:deep.compose.createIfNecessary().after(function(){
                        // console.log("func2_2");
                        this.res.push("func2_2");
                    }),
                    func3:deep.compose.after(function(){
                        // console.log("func3_3");
                        this.res.push("func3_3");
                    })
                },
                c : {
                    res:[],
                    func1:deep.compose.after(function(){
                        // console.log("func1_1_c");
                        this.res.push("func1_1_c");
                    }),
                    func2:deep.compose.after(function(){
                        // console.log("func2_2_c");
                        this.res.push("func2_2_c");
                    }),
                    func3:deep.compose.after(function(){
                        // console.log("func3_3_c");
                        this.res.push("func3_3_c");
                    })
                }
            };
        },
        tests : {
            a:function(){
                return deep(this.b)
                .bottom(this.a)
                .query("/(func.*)")
                .run()
                .query("/res")
                .equal(["func1","func1_1", "func2","func2_2","func3","func3_3"]);

            },
            b:function(){
                return deep(this.c)
                .bottom(this.a)
                .query("./(func.*)")
                .run()
                .query("/res")
                .equal(["func1","func1_1_c", "func2","func2_2_c","func3","func3_3_c"]);
            }
        }
    };

    return new Unit(unit);
});
