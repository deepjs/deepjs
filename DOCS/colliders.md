# deep colliders

[Back to tutorials](./tutorials.md)

Provides way to manage fine grained collision when applying to layer together.

## Example

### replace

```javascript

deep({ b:[1,2,3] })
.up({
    b:deep.colliders.replace([4,5])
})
.equal({ b:[4,5] })
.log()

```

### array.insertAt

```javascript

deep({ b:[1,2,3] })
.up({
    b:deep.colliders["array.insertAt"]([4,5],2)
})
.equal({ b:[1,2,4,5,3] })
.log()


```


## Custom Colliders

```javascript

deep.Collider.add("validate", function(input, schema){
	var report = deep.validate(input, schema);
	if(!report.valid)
		throw deep.errors.PreconditionFail(report);
	return input;
});

//...

var a = { b:"hello" }

var c = {
    b:deep.colliders.validate({ type:"string" })
}

deep.utils.up(b,a);


```