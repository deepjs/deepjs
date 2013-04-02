# Chain handles transparencies : ACTIVE VS PASSIVE

if you write : 


deep(...)
.catchError() // work only when not executing fail handles
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

Recap :

when you ask a promise on a chain (i.e. when a chain is returned from a function - so as it's returned : all the chain is placed before in queue): 
it will ceal the chain.
no more handles could be added : the promise listening the whole chain execution : 
	if success : 
		it means when each handle of the chain has returned success.
		the promise will be played (resolved)

	if error in the chain : 
		if it's thrown throw within a fail handle  :  
			the chain is immediatly rejected (and queue cleared) and so the promise will be played (rejected).

		if it's thrown from within any other handles : 
			if chain catch errors : 
				chain will be played following transparencies/return rules
			else
				the chain is immediatly rejected and so the promise will be played (rejected).

		if it's returned from any handle :
				chain will be played following transparencies/return rules

		when all handles of the chain are played 
			AND the chain finished in error state :
				the promise will be played (rejected)
			OR the chain finish in success state :
				the promise will be played (resolved)

		so the chain should throw an error "chain is cealed ! promise(s) listening it. no more handle could be added. breaking code : there is a probleme in your pattern." when adding handles after chain ceal. This error should not be catched by the chain it self.

		the cealed flags need to be setted to false (if previously true - and reseted to true after) when injecting chain handler in done/fail : because they are internal chain jobs, and will maybe added asynch (and so after promise listeners).
		But as they are played from within done/fail : they are always been executed follwing transparencies/return rules, and before any rejection or chain ending.

		we could always ask a promise on a chain : if chain was ended (rejected or resolved) : the promise will run immediatly.

Return rule : 
	if returned value is :
		- undefined : take previous success if any (or arguments in composition case)
		- an error : inject error as failure in chain
		- a promise : wait promise run to either inject its success or its failure in chain.
		- any other type : inject it as success in chain

	if an error is thrown : 
		- from within a fail handler : 
			it break chain and reject it
		- from within any handle : it depends if chain catch errors.


Transparencies rule : only when error : 
	- then familly : obviously active
	- log familly : active
	- pushTo familly : active
	- all others : passive : will just be ignored.

