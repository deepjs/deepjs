
deep.compose : Chained Aspect Oriented Programming
==========================
SEE DOCS/deep.md for full doc

When you collide two functions together, you could use deep.compose to manage how collision is resolved.
Keep in mind that if you collide a simple function (up) on a composition (chained or not) : it mean : simply overwrite the composition by the function.
So if you apply a composition from bottom on a function, the composition will never b applied.
If you collide two compositions : they will be merged to give a unique composition chain.


## deep.compose.before( func )

If it returns something, it will be injected as argument(s) in next function.
If it return nothing, th original arguments are injected in next function.
If it returns a promise or a chain : it will wait until the resolution of the returned value.
If the returned object isn't a promise, the next function is executed immediately.

ex :
```javascript
	var base = {
	    myFunc:deep.compose.after(function(arg)
	    {
	        return arg + " _ myfunc base";
	    })
	}

	deep(base)
	.bottom({
	    myFunc:function(arg){
	        return arg + " _ myfunc from bottom";
	    }
	});

	base.myFunc("hello");
```

## deep.compose.after( func )

If the previous returns something, it will be injected as argument(s) in 'func'.
If the previous return nothing, th original arguments are injected in 'func'.
If the previous returns a promise or a chain : it will wait until the resolution of the returned value before executing 'func'.
If the previous returned object isn't a promise, 'func' is executed immediately.

Same thing for returned object(s) from 'func' : it will be chained..

	ex :
```javascript

	var base = {
	    myFunc:function(arg)
	    {
	        return arg + " _ myfunc base";
	    }
	}

	deep(base)
	.up({
	    myFunc:deep.compose.after(function(arg){
	        return arg + " _ myfunc from after";
	    })
	});

	base.myFunc("hello");
```

## deep.compose.around( func )

here you want to do your own wrapper.
Juste provid a function that receive in argument the collided function (the one which is bottom),
an which return the function that use this collided function.

	ex :
```javascript

	var base = {
		myFunc:function(arg)
		{
			return arg + " _ myfunc base";
		}
	}

	deep(base)
	.up({
	    myFunc:deep.compose.around(function(collidedMyFunc){
	    	return function(arg){
	    		return collidedMyFunc.apply(this, [arg + " _ myfunc from around"]);
	    	}
	    })
	});

	base.myFunc("hello");

```

## deep.compose.parallele( func )

when you want to call a function in the same time of an other, and to wait that both function are resolved (even if deferred)
before firing eventual next composed function, you could use deep.compose.parallele( func )

Keep in mind that the output of both functions will be injected as a single array argument in next composed function.
Both will receive in argument either the output of previous function (if any, an even if deferred), or the original(s) argument(s).

So as implies a foot print on the chaining (the forwarded arguments become an array) :
It has to be used preferently with method(s) that do not need to handle argument(s), and that return a promise just for maintaining the chain asynch management.

An other point need to be clarify if you use deep(this).myChain()... in the composed function.
As you declare a new branch on this, you need to be careful if any other of the composed function (currently parallelised) do the same thing.

You'll maybe work on the same (sub)objects in the same time.

## compositions chaining

You could do

```javascript

	var obj = {
		func:deep.compose.after(...).before(...).around(...)...
	}

```

It will wrap, in the order of writing, and immediately, the compositions themselves.
You got finally an unique function that is itself a composition (and so could be applied later an other functions).

So when you do :

```javascript

deep.parallele( /*...*/ ).before( /*...*/ ) and deep.before( /*...*/).parallel(/*...*/);

```
it does not give the same result of execution.

In first : you wrap the collided function with a parallele, and then you chain with a before.
So finally the execution will be : the before and then the parallelised call.

In second : you wrap the collided function with a before, and then wrap the whole in a parallele.
So the execution will be the parallelised call, but on one branche, there is two chained calls (the before and the collided function).

Keep in mind that you WRAP FUNCTIONS, in the order of writing, and IMMEDIATELY.


## Classes composition

```javascript

var AnotherClass = function(arg){
	console.log("AnotherClass constructor : ", arg)
	this.test = 1;
}

AnotherClass.prototype = {
	hello:function(){
		console.log("hello world");
	}
}

var MyClass = deep.compose.Classes(function(arg, arg2){
	// a constructor
	console.log("MyClass constructor : ", arg1, arg2);
},
AnotherClass,
{
	// a prototype
	title:"Added prototype title.",
	test:2,
	bye:function(){
		console.log("bye bye!");
	},
	hello:deep.compose.after({
		console.log("after hello world.")
	})
} /* ,... */ );

var obj = new MyClass(1, 33);
console.log("obj : ", obj);

```
