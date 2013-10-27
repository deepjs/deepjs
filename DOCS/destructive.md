# Destructive vs Undestructive Load

[Back to tutorials](./tutorials.md)

There is to way to load datas from somewhere.

Chain.load( context, destructive );
or
Chain.deepLoad( context, destructive );

destructive is false by default.

## Non destructive load

```javascript

deep({
	datas:"json::myfile.json"
})
.query("./datas")
.load()
.log() // ==>   { /* myfile.json content */}   ==> the injected success is the loaded content
.logValues() // ==> "json::myfile.json" 	==> object holded by chain hasn't been changed.

```

## Non destructive deepLoad

```javascript

deep({
	datas:"json::myfile.json"
})
.deepLoad()
.log() // ==>   { datas:{ /* myfile.json content */} }  ==> the injected success is the loaded content
.logValues() // ==> { datas:"json::myfile.json" }	==> object holded by chain hasn't been changed.

```

## Destructive and interpreted load

```javascript

deep({
	datas:"json::/{ language }/myfile.json"
})
.query("./datas")
.load({ language:"uk" }, true)
.log() // ==>   { /* /uk/myfile.json content */}   ==> the injected success is the loaded content
.logValues() // ==> { /* /uk/myfile.json content */} 	==> object holded by chain has been changed.

```

## Destructive and interpreted deepLoad

```javascript

deep({
	datas:"json::myfile.json"
})
.deepLoad({ language:"uk" }, true)
.log() // ==>   { datas:{ /* /uk/myfile.json content */} }  ==> the injected success is the loaded content
.logValues() // ==>  { datas:{ /* /uk/myfile.json content */} }	==> object holded by chain has been changed.

```

