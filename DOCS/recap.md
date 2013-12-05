## Collisions / Composition
Compose complicated objects from others
- up(obj1, obj2, ...)
- bottom(obj1, obj2, ...)
- compose.before(function(your, args){})
- compose.after(function(your, args){})
- compose.around(function(your, args){})

## Chain

Keep chaining calls with an expressive syntax (à la jQuery) + handle async timing

### Object Composition / Manipulation
- .up(objects)
- .bottom(objects)
-

### Object navigation/read/loop
- .query( deepQuery )
- .each( function(element){} )
- .first( function(element){} )
- .last( function(element){} )
- .val(function(v){});
- .values(function(values){ });
- .nodes(function(nodes){ })


### Asynchronous Timing
- .run('functionName' | function(args){}, ['arg1', 'arg2'])
- .exec(function)
- .done( function(success){} )
- .fail( function(error){} )
- .always( function(success, error){} )
- .then( function(success){}, function(error){} )

## Loging
- .log(msgs | empty)		if empty : log current chain state (i.e. current success or error)
- .logError()				only log error if any
- .logValues()				log chain holdedvalues
- .logContext()				log current context

### Breaking the chain / Returning result
- .val();
- .values();
- .done()
- .fail()

### Utilities
- .position('bookmark')
- .back('bookmark')

## Query
Find/manipulate sub-objects with a query
- .query('/property/*')

## Promises Pattern
- Create a new deferred object: `var def = new deep.Deferred();`
- Return the promise as result of your function: `return def.promise;`
- Resolve the promise when your async call is done: `def.resolve();`