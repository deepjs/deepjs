if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../lib/unit"], function (require, deep, Unit) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES


    var unit = {
        title:"deep/units/compositions",
        stopOnError:false,
        setup:function(){
            return {
                a : {
                    func1:function(){
                        //console.log("func1");
                        this.res.push("func1");
                    },
                    func2:deep.compose.before(function(){
                        //console.log("func2");
                        this.res.push("func2");
                    }),
                    func3:deep.compose.after(function(){
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
                    func2:deep.compose.after(function(){
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
            },
            after:function(){
                var closure = { test:"" };
                var a = {
                    test:function(){
                        closure.test += "hello test";
                        return closure.test;
                    }
                };
                var b = {
                    test:deep.compose.after(function(){
                        closure.test += " : after";
                        return closure.test;
                    })
                };
                deep.utils.up(b,a);
                return deep.when(a.test())
                .equal("hello test : after");
            },
            delayed_after:function(){
                var closure = { test:"" };
                var a = {
                    test:function(){
                        closure.test += "hello test";
                        return deep.when(closure.test).delay(2);
                    }
                };
                var b = {
                    test:deep.compose.after(function(){
                        closure.test += " : after";
                        return deep.when(closure.test).delay(1);
                    })
                };
                deep.utils.up(b,a);
                return deep.when(a.test())
                .equal( "hello test : after" );
            },
            around:function(){
                var a = {
                    test:function(){
                        return "test";
                    }
                };
                var b = {
                    test:deep.compose.around(function(old){
                        return function(){
                            return "hello "+ old.apply(this) + " around";
                        };
                    })
                };
                deep.utils.up(b,a);
                return deep.when(a.test())
                .equal("hello test around");
            },
            before:function(){
                var closure = { test:"" };
                var a = {
                    test:function(){
                        closure.test += "hello test";
                    }
                };
                var b = {
                    test:deep.compose.before(function(){
                        closure.test += "before : ";
                    })
                };
                deep.utils.up(b,a);
                a.test();
                return deep(closure.test)
                .equal("before : hello test");
            },
            delayed_before:function(){
                var closure = { test:"" };
                var a = {
                    test:function(){
                        closure.test += "hello test";
                        return deep(closure.test).delay(1);
                    }
                };
                var b = {
                    test:deep.compose.before(function(){
                        closure.test += "before : ";
                        return deep(closure.test).delay(1);
                    })
                };
                deep.utils.up(b,a);
                return deep.when(a.test())
                .equal("before : hello test");
            },
            parallele:function(){
                var a = {
                    test:function(){
                        return "hello test";
                    }
                };
                var b = {
                    test:deep.compose.parallele(function(){
                        return "hello parallele";
                    })
                };
                deep.utils.up(b,a);
                return deep.when(a.test())
                .equal(["hello test", "hello parallele"]);
            },
            delayed_parallele:function(){
                var a = {
                    test:function(){
                        return deep.when("hello test").delay(2);
                    }
                };
                var b = {
                    test:deep.compose.parallele(function(){
                        return deep.when("hello parallele").delay(3);
                    })
                };
                deep.utils.up(b,a);
                return deep.when(a.test())
                .equal(["hello test", "hello parallele"]);
            },
            before_alone:function(){
                var a = {
                    test:deep.compose.before(function(){
                        return "hello";
                    })
                };
                return deep.when(a.test()).equal("hello");
            },
            before_alone_with_arg:function(){
                var a = {
                    test:deep.compose.before(function(arg){
                        return "hello";
                    })
                };
                return deep.when(a.test()).equal("hello");
            },
            before_replace_arg:function(){
                var b = {
                    test:function(arg){
                       return "hello : "+arg;
                    }
                };
                var a = {
                    test:deep.compose.before(function(arg){
                       return "weee";
                    })
                };

                deep.utils.bottom(b, a);

                return deep.when(a.test("bloup")).equal("hello : weee");
            },
             before_dont_replace_arg:function(){
                var b = {
                    test:function(arg){
                       return "hello : "+arg;
                    }
                };
                var a = {
                    test:deep.compose.before(function(arg){
                       // return nothing so arg are forwarded
                    })
                };

                deep.utils.bottom(b, a);

                return deep.when(a.test("bloup")).equal("hello : bloup");
            },
            after_forward_result : function(){
                var b = {
                    test:function(arg){
                       return "hello : "+arg;
                    }
                };
                var a = {
                    test:deep.compose.after(function(arg){
                       // return nothing so result are not changed
                    })
                };

                deep.utils.bottom(b, a);

                return deep.when(a.test("bloup")).equal("hello : bloup");
            },
            after_receive_forwarded_arg:function(){
                var b = {
                    test:function(arg){
                       return "hello : "+arg;
                    }
                };
                var a = {
                    test:deep.compose.after(function(arg){
                        return arg+"!";
                    })
                };

                deep.utils.bottom(b, a);
                return deep.when(a.test("bloup"))
                .equal("hello : bloup!");
            },
            argsBefore:function(){
                var checker = {};
                var a = {
                    test:function(arg1, arg2){
                        checker.fromA = [arg1, arg2];
                        return ["A1:"+arg1, "A2:"+arg2];
                    }
                };
                var b = {
                    test:deep.compose.before(function(arg1, arg2){
                        checker.fromB = [arg1, arg2];
                        return ["B1:"+arg1, "B2:"+arg2];
                    })
                };
                deep.utils.up(b,a);
                return deep(a.test("hello","world"))
                .equal(["A1:B1:hello", "A2:B2:world"])
                .deep(checker)
                .equal({
                    fromB:["hello","world"],
                    fromA:["B1:hello", "B2:world"]
                });
            },
            argsAfter:function(){
                var checker = {};
                var a = {
                    test:function(arg1, arg2){
                        checker.fromA = [arg1, arg2];
                        return ["A1:"+arg1, "A2:"+arg2];
                    }
                };
                var b = {
                    test:deep.compose.after(function(arg1, arg2){
                        checker.fromB = [arg1, arg2];
                        return ["B1:"+arg1, "B2:"+arg2];
                    })
                };
                deep.utils.up(b,a);
                return deep(a.test("hello","world"))
                .equal(["B1:A1:hello", "B2:A2:world"])
                .deep(checker)
                .equal({
                    fromA:["hello","world"],
                    fromB:["A1:hello", "A2:world"]
                });
            },
            argsAfterUndefined:function(){
                var checker = {};
                var a = {
                    test:function(arg1, arg2){
                        checker.fromA = [arg1, arg2];
                        //return ["A1:"+arg1, "A2:"+arg2];
                    }
                };
                var b = {
                    test:deep.compose.after(function(arg1, arg2){
                        checker.fromB = [arg1, arg2];
                        return ["B1:"+arg1, "B2:"+arg2];
                    })
                };
                deep.utils.up(b,a);
                return deep(a.test("hello","world"))
                .equal(["B1:hello", "B2:world"])
                .deep(checker)
                .equal({
                    fromA:["hello","world"],
                    fromB:["hello", "world"]
                });
            }


        }
    };

    return unit;
});
