Tutorials
=====

#### Modelisation and Queries
deepjs provides tools to modelise and manipulate structures inheritance and compositions.
For this, it mainly uses Aspects Composition (AOP) principles, and particular queries/selector that allow to navigate-in and select particular objects structures. The combination of those two paradigms (AOP + queries) gives differents ways to nicely handle objects modelisation and/or run-time.
* [basic-modelisation](./basic-modelisation.md)
* [compositions](./compositions.md)
* [colliders](./colliders.md)
* [deep-queries](./deep-queries.md)
* [deep-rql](./deep-rql.md)
* [backgrounds and flatten](./backgrounds-and-flatten.md)
* [code sheets](./sheets.md)

#### Asynch, Promises and Chains
deepjs uses Promises at all level. It provides its own implementation of promises and deferreds that gives smart chained asynch management (natural chain branching, context management, log facilities, ...). As additionnal asynch sugar : it natively offers another particular chain (that inherit from promise's one) to manipulate objects, runtime and other asynch stuffs. 

As deepjs want to be, by others, an asynch-chain-factory : other useful chains are implemented as "plugin" and have their own docs
* [promised and chained asynch management example](./asynch/async-management.md)
* [deep promise](./asynch/deep-promise.md)
* [deep chain](./asynch/chains.md)
* [deep chain, arrays and queries](./array-management.md)
* [promises subtilities](./asynch/promises-subtilities.md)
* [asynchrone context management](./asynch/asynch-context-management.md)

#### Protocols
Protocols provide nice namespaces to store and use datas fetcher and manager
* [native protocols](./stores/native-protocols.md)
* [custom protocols](./stores/custom-protocols.md)

#### Stores
deepjs provides an absolute homogeneous persistent store API and provides, through its store chain, a simple and convinient way to handle store's transactions sequences. 

The aim is to CRUD datas, through JSON/REST API, in exactly the same way browser or server side. 

* [native collection store](./stores/native-stores.md)
* [ocm, stores and chains](./stores/store-chain.md)
* [list of implemented stores](./modules.md)

#### OCM
OCM is a little bit further than AOP/Queries and as it could mix all deepjs tools, to use the full potential of OCM, it should be learned when you're feeling confortable with other tools.
* [Object Capabilities Manager](./ocm.md)
	* [bases](./ocm.md)
	* [Additive vs restrictive](./ocm/ocm-synthesis.md)
	* [ocm and protocols](./ocm/ocm-protocols.md)
	* [ocm and stores](./ocm/ocm-stores.md)
	* [Delegation](./ocm/ocm-delegate.md)

#### JSON Schema usage
deepjs comes natively with json-schema support and gives tools to handle it.

* [validations](./json-schemas/validations.md)
* [relations management](./json-schemas/relations.md)
* [custom schema properties](./json-schemas/custom-schema.md)

#### Owner, privates, filters and readOnly
Stores could protect ressources through schema custom entries.
For this, deepjs stores provides mecanism to dynamicaly check readOnly constraint, hide privates proprties or limit access to ressource owner.

* [privates](./constraints/privates.md)
* [readOnly](./constraints/readonly.md)
* [ownership](./constraints/ownership.md)
* [filters](./constraints/filters.md)
* [sanitize](./constraints/sanitize.md)

#### Tests Units
deepjs comes with it's own simple asynch unit testcaser. It uses deepjs native chain tools as 'equal', 'validate', 'assert' to test itself. More work need to be done to articulate it more nicely with other tests frameworks. 
* [perform deep-core tests](../units/README.md)
* [write your own](./custom-units.md)

#### Other modules
* [modules](./modules.md)



#### Nodejs concreets
* [nodejs simple](./nodejs/simple.md) 
* [nodejs more complex](./nodejs/full.md)
* [autobahn : deepjs restful server framework](https://github.com/deepjs/autobahn)

#### Sandboxes
* [deep-playground](https://github.com/deepjs/deep-playground)
* [deepjs.org](https://github.com/deepjs/deepjs.org)
