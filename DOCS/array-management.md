# Chain and Array management

```javascript

var array = [
	{ id:"e1", title:"hello" },
	{ id:"e2", title:"world" }
];

```

## start chain with array

```javascript

deep( array )
.log()  // success is array
.logValues()  // values are : one node holding array

```

## apply a query

```javascript

deep( array )
.query("./*")  // we take all element of array
.log() // success is array
.logValues() // values are : two nodes. One for each object of array.


```

which is the same than :


```javascript

deep( array )
.query("./")  // we take all element of array (http url friendly)
.log() // success is array
.logValues() // values are : two nodes. One for each object of array.


```

==> from this point you have a chain that holding two elements...
==> so next query will be applied from them
ex :

```javascript

deep( array )
.query("./*")  // we take all element of array
.log() // success is array
.logValues() // values are : two nodes. One for each object of array.
.query("./id")
.log() // ==> ["e1", "e2"]
.logValues() // ==> two nodes holding respectively "e1" and "e2"

```

So if you want to filter elements after a first query on an array : 
you should do :

```javascript

deep( array )
.query("./*")  // we take all element of array
.log() // success is array
.logValues() // values are : two nodes. One for each object of array.
.query("./!?id=e1")	// use '!' selector to get node value in place of seeking its properties
.log() // ==> [{ id:"e1", title:"hello" }]
.logValues() // ==> one node holding : { id:"e1", title:"hello" }

```

The '!' selector (in query) means : give me current(s) holded object(s) directly. 

Obviously, all this is for example, you could do more straight forward by doing :

```javascript

deep( array )
.query("./?id=e1") // which means : give me all properties (or elements) which have an ID equal to 'e1'
.log() // ==> [{ id:"e1", title:"hello" }]
.logValues() // ==> one node holding : { id:"e1", title:"hello" }

```
## apply a query to get array itself

```javascript

deep( array )
.query("./!")  // we take the array itself
.log() // success is array
.logValues() // values are : one node holding array

```




