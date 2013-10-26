# Errors management

if you write : 

```javascript
deep(...)
.flatten()
.fail(function(error, handler, brancher){
	// handle error of flatten.
	throw error; 
})
.log()	
.load()	
.query("...")	
.run(...)
.fail(function(error){
	// handle error of load or query or run.
	// if the throw error wasn't there : it will also handle 'flatten' error.
})
...
``` 


Return rule : 
	if returned value is :
		- undefined : take previous success if any (or arguments in composition case)
		- an error : inject error as failure in chain
		- a promise : wait promise run to either inject its success or its failure in chain.
		- any other type : inject it as success in chain

	if an error is thrown : 
		- from within any handle : it depends if chain catch errors.


