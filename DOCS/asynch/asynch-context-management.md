# Asynch context management

```javascript

deep.context = {};			// let's call it 'A'

deep.when("anything")
.context("test",1) // (B) set 'test' var in local deep.context (that is a copy of previous local one. (i.e. 'A'))
.delay(10)
.done(function(){
    return deep.when(true)
    .context("hello","world") // (C) set 'hello' var in local deep.context (that is a copy of previous local one (i.e. 'B').)
    .delay(5)
    .done(function(){
        return deep.context;
    })
    .equal({test:1,hello:"world"});	// we see that deep.context is decorated with both 'test' and 'hello' (=== 'C')
})
.done(function(){
    return deep.context;
})
.equal({test:1}) 		// we see that deep.context is decorated with only 'test'  (=== 'B')
						// (local context hasn't change by sub chain manipulations)
.log()
.log("end chain !!");


if(!deep.utils.deepEqual(deep.context, {}))  // deep.context shouldn't have any properties at this level
    throw new Error("context has been modified at this level !!"); // you should not see this throw.
else 
    console.log("deep.context is clean.")   // i.e.  === 'A'


```


Remarque : Context copy is only done when settings local vars.