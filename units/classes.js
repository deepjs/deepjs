if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require","../deep"], function (require, deep) {
    var unit = {
        title:"deepjs/units/classes",
        stopOnError:false,
        // setup:function(){},
        tests : {
           classes_defaultproto:function(){
                var Mc = deep.Classes(function(schema){
                    if(schema && this.schema)
                        deep.up(this.schema, schema);
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

                return deep.nodes(a.schema)
                .equal({ bloup:true, fromA:true });
            }
        }
    };
    return unit;
});
