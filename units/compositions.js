/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require", "../deep", "../lib/unit"], function(require, deep, Unit) {

    //_______________________________________________________________ GENERIC STORE TEST CASES


    var unit = {
        title: "deepjs/units/compositions",
        stopOnError: false,
        setup: function() {
            return {
                a: {
                    func1: function() {
                        //console.log("func1");
                        this.res.push("func1");
                    },
                    func2: deep.compose().before(function() {
                        //console.log("func2");
                        this.res.push("func2");
                    }),
                    func3: deep.compose().after(function() {
                        //console.log("func3");
                        this.res.push("func3");
                    })
                },
                b: {
                    res: [],
                    func1: deep.compose().after(function() {
                        // console.log("func1_1");
                        this.res.push("func1_1");
                    }),
                    func2: deep.compose().after(function() {
                        // console.log("func2_2");
                        this.res.push("func2_2");
                    }),
                    func3: deep.compose().after(function() {
                        // console.log("func3_3");
                        this.res.push("func3_3");
                    })
                },
                c: {
                    res: [],
                    func1: deep.compose().after(function() {
                        // console.log("func1_1_c");
                        this.res.push("func1_1_c");
                    }),
                    func2: deep.compose().after(function() {
                        // console.log("func2_2_c");
                        this.res.push("func2_2_c");
                    }),
                    func3: deep.compose().after(function() {
                        // console.log("func3_3_c");
                        this.res.push("func3_3_c");
                    })
                }
            };
        },
        tests: {
            a: function() {
                return deep.nodes(this.b)
                    .bottom(this.a)
                    .query("/(func.*)")
                    .run()
                    .nodes(this.b.res)
                    .equal(["func1", "func1_1", "func2", "func2_2", "func3", "func3_3"]);
            },
            b: function() {
                return deep.nodes(this.c)
                    .bottom(this.a)
                    .query("./(func.*)")
                    .run()
                    .nodes(this.c.res)
                    .equal(["func1", "func1_1_c", "func2", "func2_2_c", "func3", "func3_3_c"]);
            },
            after: function() {
                var closure = {
                    test: ""
                };
                var a = {
                    test: function() {
                        closure.test += "hello test";
                        return closure.test;
                    }
                };
                var b = {
                    test: deep.compose().after(function() {
                        closure.test += " : after";
                        return closure.test;
                    })
                };
                deep.up(a, b);
                return deep.when(a.test())
                    .equal("hello test : after");
            },
            delayed_after: function() {
                var closure = {
                    test: ""
                };
                var a = {
                    test: function() {
                        closure.test += "hello test";
                        return deep.when(closure.test).delay(2);
                    }
                };
                var b = {
                    test: deep.compose().after(function() {
                        closure.test += " : after";
                        return deep.when(closure.test).delay(1);
                    })
                };
                deep.up(a, b);
                return deep.when(a.test())
                    .equal("hello test : after");
            },
            around: function() {
                var a = {
                    test: function() {
                        return "test";
                    }
                };
                var b = {
                    test: deep.compose().around(function(old) {
                        return function() {
                            return "hello " + old.apply(this) + " around";
                        };
                    })
                };
                deep.up(a, b);
                return deep.when(a.test())
                    .equal("hello test around");
            },
            before: function() {
                var closure = {
                    test: ""
                };
                var a = {
                    test: function() {
                        closure.test += "hello test";
                    }
                };
                var b = {
                    test: deep.compose().before(function() {
                        closure.test += "before : ";
                    })
                };
                deep.up(a, b);
                a.test();
                return deep.nodes(closure.test)
                    .equal("before : hello test");
            },
            delayed_before: function() {
                var closure = {
                    test: ""
                };
                var a = {
                    test: function() {
                        closure.test += "hello test";
                        return deep.nodes(closure.test).delay(1);
                    }
                };
                var b = {
                    test: deep.compose().before(function() {
                        closure.test += "before : ";
                        return deep.nodes(closure.test).delay(1);
                    })
                };
                deep.up(a, b);
                return deep.when(a.test())
                    .equal("before : hello test");
            },
            // parallele: function() {
            //     var a = {
            //         test: function() {
            //             return "hello test";
            //         }
            //     };
            //     var b = {
            //         test: deep.compose.parallele(function() {
            //             return "hello parallele";
            //         })
            //     };
            //     deep.up(a, b);
            //     return deep.when(a.test())
            //         .equal("hello test");
            // },
            // delayed_parallele: function() {
            //     var a = {
            //         test: function() {
            //             return deep.when("hello test").delay(1);
            //         }
            //     };
            //     var b = {
            //         test: deep.compose.parallele(function() {
            //             return deep.when("hello parallele").delay(2);
            //         })
            //     };
            //     deep.up(a, b);
            //     return deep.when(a.test())
            //         .equal("hello test");
            // },
            before_alone: function() {
                var a = {
                    test: deep.compose().before(function() {
                        return "hello";
                    })
                };
                return deep.when(a.test()).equal("hello");
            },
            before_alone_with_arg: function() {
                var a = {
                    test: deep.compose().before(function(arg) {
                        return "hello";
                    })
                };
                return deep.when(a.test()).equal("hello");
            },
            before_replace_arg: function() {
                var b = {
                    test: function(arg) {
                        return "hello : " + arg;
                    }
                };
                var a = {
                    test: deep.compose().before(function(arg) {
                        return "weee";
                    })
                };

                deep.bottom(b, a);

                return deep.when(a.test("bloup")).equal("hello : weee");
            },
            before_dont_replace_arg: function() {
                var b = {
                    test: function(arg) {
                        return "hello : " + arg;
                    }
                };
                var a = {
                    test: deep.compose().before(function(arg) {
                        // return nothing so arg are forwarded
                    })
                };

                deep.bottom(b, a);

                return deep.when(a.test("bloup")).equal("hello : bloup");
            },
            after_forward_result: function() {
                var b = {
                    test: function(arg) {
                        return "hello : " + arg;
                    }
                };
                var a = {
                    test: deep.compose().after(function(arg) {
                        // return nothing so result are not changed
                    })
                };

                deep.bottom(b, a);

                return deep.when(a.test("bloup")).equal("hello : bloup");
            },
            after_receive_forwarded_arg: function() {
                var b = {
                    test: function(arg) {
                        return "hello : " + arg;
                    }
                };
                var a = {
                    test: deep.compose().after(function(arg) {
                        return arg + "!";
                    })
                };

                deep.bottom(b, a);
                return deep.when(a.test("bloup"))
                    .equal("hello : bloup!");
            },
            argsBefore: function() {
                var checker = {};
                var a = {
                    test: function(arg1, arg2) {
                        checker.fromA = [arg1, arg2];
                        return deep.Arguments(["A1:" + arg1, "A2:" + arg2]);
                    }
                };
                var b = {
                    test: deep.compose().before(function(arg1, arg2) {
                        checker.fromB = [arg1, arg2];
                        return deep.Arguments(["B1:" + arg1, "B2:" + arg2]);
                    })
                };
                deep.up(a, b);
                return deep.nodes(a.test("hello", "world"))
                    .equal(["A1:B1:hello", "A2:B2:world"])
                    .nodes(checker)
                    .equal({
                        fromB: ["hello", "world"],
                        fromA: ["B1:hello", "B2:world"]
                    });
            },
            argsAfter: function() {
                var checker = {};
                var a = {
                    test: function(arg1, arg2) {
                        checker.fromA = [arg1, arg2];
                        return deep.Arguments(["A1:" + arg1, "A2:" + arg2]);
                    }
                };
                var b = {
                    test: deep.compose().after(function(arg1, arg2) {
                        checker.fromB = [arg1, arg2];
                        return deep.Arguments(["B1:" + arg1, "B2:" + arg2]);
                    })
                };
                deep.up(a, b);
                return deep.nodes(a.test("hello", "world"))
                    .equal(["B1:A1:hello", "B2:A2:world"])
                    .nodes(checker)
                    .equal({
                        fromA: ["hello", "world"],
                        fromB: ["A1:hello", "A2:world"]
                    });
            },
            argsAfterUndefined: function() {
                var checker = {};
                var a = {
                    test: function(arg1, arg2) {
                        checker.fromA = [arg1, arg2];
                        //return ["A1:"+arg1, "A2:"+arg2];
                    }
                };
                var b = {
                    test: deep.compose().after(function(arg1, arg2) {
                        checker.fromB = [arg1, arg2];
                        return ["B1:" + arg1, "B2:" + arg2];
                    })
                };
                deep.up(a, b);
                return deep.nodes(a.test("hello", "world"))
                    .equal(["B1:hello", "B2:world"])
                    .nodes(checker)
                    .equal({
                        fromA: ["hello", "world"],
                        fromB: ["hello", "world"]
                    });
            },
            fineFail: function() {
                var closure = {};
                var test = function(a, b) {
                    return [a + 2, b + 3];
                };
                var test2 = deep.compose().after(function(a, b) {
                        return new Error("tralala");
                    })
                    .after(function(a, b) {
                        closure.shouldntSeeThis = true;
                    });

                var test3 = deep.up(test, test2);

                try {
                    test3(1, 3);
                } catch (e) {
                    console.log("error cacthed : ", e);
                }

            },
            func_up_compo: function() {
                var compo = deep.compose().after(function() {
                    return "lolipopi";
                });
                var func = function() {
                    return "hello";
                };
                var r = deep.up(compo, func);
                return deep.nodes(r())
                    .equal("hello");
            },
            clone_composer: function() {
                var base = {};
                var closure = [];
                var a = {
                    bloupi: function() {
                        closure.push(1);
                    }
                };
                var b = {
                    bloupi: deep.compose().after(function() {
                        closure.push(2);
                    })
                };
                var c = {
                    bloupi: deep.compose().around(function(old) {
                        return function() {
                            old.call(this);
                            closure.push(3);
                        };
                    })
                };

                deep.up(base, b, c)
                b.bloupi();
                return deep.when(closure).equal([2]);
            }
        }
    };

    return unit;
});