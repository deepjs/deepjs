Tutorials
=====

#### Modelisation and Queries
deepjs provides tools to modelise and manipulate structures inheritance and compositions.
For this, it mainly uses Aspects Composition (AOP) principles, and particular queries that allow to navigate-in and select objects structures. The combination of those two paradigms (AOP + queries) gives differents ways to nicely handle objects structures.
* [basic-modelisation](./basic-modelisation.md)
* [compositions](./compositions.md)
* [colliders](./colliders.md)
* [deep-queries](./deep-queries.md)
* [deep-rql](./deep-rql.md)
* [backgrounds and flatten](./backgrounds-and-flatten.md)
* [code sheets](./sheets.md)
* [Object Capabilities Manager](./ocm.md)

#### Asynch, Promises and Chains
deepjs uses promises at all level. It provides its own implementation of promises and deferreds that gives smart chained asynch management (natural chain branching, context management, log facilities, ...). As additionnal asynch sugar : it natively offers another particular chain (that inherit from promise's one) to manipulate objects, runtime and other asynch stuffs. 

As deepjs want to be, by others, an asynch-chain-factory : other useful chains are implemented as "plugin" and have their own docs.
* [promised and chained asynch management example](./asynch/async-management.md)
* [deep promise](./asynch/deep-promise.md)
* [deep chain](./asynch/chains.md)
* [deep chain, arrays and queries](./array-management.md)
* [promises subtilities](./asynch/promises-subtilities.md)
* [asynchrone context management](./asynch/asynch-context-management.md)

#### Protocoles and Stores
deepjs provides an absolute homogeneous persistent store API and provides, through its chain, a simple and convinient way to handle store's transactions sequences.

Additionaly, deep's chain manage OCM for you.

* [native protocoles](./stores/native-protocoles.md)
* [native stores](./stores/native-stores.md)
* [list of externals modules](./modules.md)
* [custom protocoles](./stores/custom-protocoles.md)
* [custom stores](./stores/custom-stores.md)

#### JSON Schema usage
deepjs comes natively with json-schema support and gives tools to handle it.

* [validations](./json-schemas/validations.md)
* [relations management](./json-schemas/relations.md)
* [custom schema properties](./json-schemas/custom-schema.md)

#### Tests Units
deepjs comes with it's own simple asynch unit testcaser. It uses deepjs native chain tools as 'equal', 'validate', 'assert' to test itself. More work need to be done to articulate it more nicely with other tests frameworks. 
* [perform deep-core tests](../units/README.md)
* [write your own](./custom-units.md)

#### Nodejs concreets
* [nodejs simple](./nodejs/simple.md) 
* [nodejs more complex](./nodejs/full.md)

#### Browser concreets
* [browser simple](./nodejs/simple.md) 
* [browser more complex](./nodejs/full.md)

#### Sandboxes
* [deep-spa-sandbox](https://github.com/deepjs/deep-spa-sandbox)
* [deepjs.org](https://github.com/deepjs/deepjs.org)
