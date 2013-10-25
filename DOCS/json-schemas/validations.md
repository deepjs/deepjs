# Object validation

We could use json-schema to validate objects trough deep API.

deep-schema.js is json-schema v4 compliant.

## Direct API

```javascript

var obj = {
	hello:"world",
	myInt:12
}

var schema = {
	properties:{
		hello:{ type:"string", required:true },
		myInt:{ type:"number" }
	}
}

var report = deep.validate(obj, schema);

console.log("report : ", report);

```

## Trough chain 

```javascript

var obj = {
	hello:"world",
	myInt:12
}

var schema = {
	properties:{
		hello:{ type:"string", required:true },
		myInt:{ type:"number" }
	}
}

deep(obj, schema).validate().log();

// or

deep(obj).validate(schema).log();


```