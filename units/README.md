# usage 

## nodejs

```javascript

	// run all deep cores tests
	require("deepjs/unit").run();

```

## browser side

```javascript

	deep("js::deepjs/unit")
	.done(function(Unit){
		// run all deep cores tests
		deep.Unit.run();
	});
	
```

