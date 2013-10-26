# Errors management


Return rule : 
	if returned value is :
		- undefined : take previous success if any (or arguments in composition case)
		- an error : inject error as failure in chain
		- a promise : wait promise run to either inject its success or its failure in chain.
		- any other type : inject it as success in chain

	if an error is thrown : 
		- from within any handle : it depends if chain catch errors.


