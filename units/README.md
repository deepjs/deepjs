# usage 

## nodejs

```javascript

	// run all deep cores tests
	require("deep/unit").run(deep.coreUnits);

```

## browser side

```javascript

	deep("js::deep/unit")
	.done(function(){
		// run all deep cores tests
		deep.Unit.run(deep.coreUnits);
	});
	
```

