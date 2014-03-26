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
                        return deep.when("hello test").delay(1);
                    }
                };
                var b = {
                    test:deep.compose.parallele(function(){
                        return deep.when("hello parallele").delay(2);
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
                        return deep.Arguments(["A1:"+arg1, "A2:"+arg2]);
                    }
                };
                var b = {
                    test:deep.compose.before(function(arg1, arg2){
                        checker.fromB = [arg1, arg2];
                        return deep.Arguments(["B1:"+arg1, "B2:"+arg2]);
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
                        return deep.Arguments(["A1:"+arg1, "A2:"+arg2]);
                    }
                };
                var b = {
                    test:deep.compose.after(function(arg1, arg2){
                        checker.fromB = [arg1, arg2];
                        return deep.Arguments(["B1:"+arg1, "B2:"+arg2]);
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
                    fromA:["hello", "world"],
                    fromB:["hello", "world"]
                });
            },
            fineFail:function(){
                var closure = {};
                var test = function(a,b){
                    return [a+2,b+3];
                };
                var test2 = deep.compose.after(function(a,b){
                    return new Error("tralala");
                })
                .after(function(a,b){
                    closure.shouldntSeeThis = true;
                });

                var test3 = deep.utils.up(test2, test);

                try{
                    test3(1,3);
                }
                catch(e){
                    console.log("error cacthed : ", e);
                }

            },
            branches:function(){
                var a = function(){
                    return "hello";
                };
                a = deep.utils.up(deep.compose.branches(function(){
                    this.after(function(s){
                        return s+":after";
                    });
                }),a);
                return deep(a()).equal("hello:after");
            },
            branches2:function(){
                var a = deep.compose.before(function(){
                    return "hello";
                })
                .branches(function(){
                    this.around(function(old){
                        return function(){
                            return "before:"+old.apply(this)+":after";
                        };
                    });
                });
                return deep(a()).equal("before:hello:after");
            },
            dynamicBranches:function(){
                var closure = { test:true };
                var a = deep.compose.before(function(){
                    return "hello";
                })
                .branches(function(){
                    if(closure.test)
                        this.around(function(old){
                            return function(){
                                return "around:"+old.apply(this)+":around";
                            };
                        });
                    else
                        this.after(function(s){
                            return "after:"+s;
                        });
                });
                return deep(a())
                .equal("around:hello:around")
                .done(function(s){
                    closure.test = false;
                    return a();
                })
                .equal("after:hello");
            },
            func_up_compo:function(){
                var compo = deep.compose.after(function(){
                    return "lolipopi";
                });
                var func = function(){
                    return "hello";
                };
                var r = deep.utils.up(func, compo);
                return deep(r())
                .equal("hello");
            },
            classes_defaulproto:function(){
                var Mc = deep.compose.Classes(function(schema){
                    if(schema && this.schema)
                        deep.utils.up(schema, this.schema);
                }, {
                    schema:{
                        bloup:true
                    }
                });

                var a = new Mc({
                    fromA:true
                });

                var b = new Mc({
                    fromB:true
                });

                return deep(a.schema)
                .equal({ bloup:true, fromA:true });
            }
        }
    };

    return unit;
});
