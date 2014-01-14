if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep"], function (require, deep, Unit) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES

    var getPaths = function(res){
        var paths = [];
        function printNode(n){
            paths.push(n.path);
            if(n.childs)
                n.childs.forEach(function(e){
                    printNode(e);
                });
        }
        if(res)
            res.forEach(function(n){
                printNode(n);
            });
        return paths;
    };

    var example = {
        view:true,
        b:{
           
            c:{
                view:  true
            },
            d:{
                e:{
                    view:true
                }
            }
        },
        f:{
            view:true,
            g:{
                h:{
                    view:true
                }
            }
        }
    };

    var unit = {
        title:"deep/units/parcours",
        tests : {
            preorder:function(){
                var r = deep.utils.preorder(example);
                return deep(getPaths(r)).equal(["/", "/b", "/b/c", "/b/d", "/b/d/e", "/f", "/f/g", "/f/g/h"]);
            },
            inorder:function(){
                var r = deep.utils.inorder(example);
                return deep(getPaths(r)).equal(["/", "/f", "/f/g", "/f/g/h", "/b", "/b/d", "/b/d/e", "/b/c"]);
            },
            hierarchy:function(){
                var test = function(){ return this.view; };
                var r = deep.utils.hierarchy(example, test);
                return deep(getPaths(r)).equal(["/","/b/c","/b/d/e","/f","/f/g/h"]);
            }
        }
    };

    return unit;
});

