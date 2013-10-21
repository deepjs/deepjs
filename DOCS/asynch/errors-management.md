# Errors management

* deep-errors
* chain return error

# Chain handles transparencies : ACTIVE VS PASSIVE

if you write : 

```javascript
deep(...)
.flatten()
.fail(function(error, handler, brancher){
	// handle error of flatten.
	throw error; // stop chain execution : reject it.
})
.log()	// transparent active : means: if error : it's played (active) because it does not modify chain (transparent). 
.load()	// transparent passive : means : it will modify chain : so if error : it's just ignored (not played).
.query("...")	// transparent passive
.run(...)	// transparent passive
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
		- from within a fail handler : 
			it break chain(+clear queue), and reject it
		- from within any handle : it depends if chain catch errors.


Transparencies rule : only when error : 
	- then familly : obviously active
	- log familly : active
	- pushTo familly : active
	- all others : passive : will just be ignored.





* chain throw error

## catch error