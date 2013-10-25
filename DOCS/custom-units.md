# Custom Test Unit 

For more unit examples : see deep/units/*

## Example 

```javascript

if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","deep/deep", "deep/deep-unit"], function (require, deep, Unit) {
    
    var unit = {
        title:"Unit title",
        stopOnError:false,
        setup:function(){
			return {
				hello:"world"
			}
        },
        tests : {
           myFirstTest:function(){
           		console.log(this); // ==> { hello:"world"}
           		return <error || value || promise>;
           },
           mySecondTest:function(){
           		//...
           }
        }
    };
    unit = new Unit(unit);

	//...
	
    unit.run();

	//...

    return unit;

});


```