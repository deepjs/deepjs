# usage 

## nodejs

```javascript

	// run all deep cores tests
	require("deepjs/lib/unit").run();

```

## browser side

```javascript

	deep("js::deepjs/lib/unit")
	.done(function(Unit){
		// run all deep cores tests
		deep.Unit.run();
	});
	
```

