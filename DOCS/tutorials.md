Tutorials
=====

deepjs provides a set of quite atomic (but linked) tools for better programming.

Alone, it does not provides anything but nice, fast and lightweight tools that allow you to develop your OWN application faster.

Above all, it will help you in modelisation, architecture and concurrent run-time management of your OWN app. 

But deepjs (alone) will not, and will never, provides a full application out-of-the-box (for that, take a look to deepjs modules - or write your own ;).

More precisly, deepjs scopes are (and are only) :

* Layered and Query (or Selector) Based Programmation
Inspired from CSS, jQuery and Aspect Oriented Programmation (AOP), the aim of related tools is to
	* dramaticaly reduce Classical OO Inheritance modelisation complexity.
	* dramaticaly reduce coupling between objects.

* Asynchrone and Concurrent Run-Time Management
Heavily using Promise Pipelining pattern, related tools provide powerful ways to handle and reduce Asychroneous/Concurrent programmation complexity of YOUR app.

* Absolute Homogeneous Ressources Management through HTTP/Restful/JSON-RPC/NoSQL/ASYNCH API
Related tools give simple, complete, homogeneous and powerful way to CRUD ressources (db, files, locals, etc.).
Dramaticaly improve Ressources modelisation and reusability.

* Environnement Dependent Object Capabilities Management
Powerful and so simple way, based on all deepjs tools, to manage objects identities/capacities depending on context modes.
Realy high benefit in application architecture, from security to run-time particularity.

All those tools are (almost) totaly unobstrusive, and work alone or together with YOUR objects/functions/app. 

deepjs does not provide other things than helpers.

So, deepjs, with all its subtilities, mainly targets real programmers/architect, that want to mastering any aspects of code, and to do absolute taylor-made, complex, asynchroneous and highly maintenable web applications.

As all deepjs (core) tools could work together, and because deepjs is in many cases bootstrapped from itself, deepjs define a realy new and holistic approach that may ask you to understand deeply ALL tools and consequences before grasping the hole painting.

And as deepjs ties together a lot of quite new concepts and approaches, while you'll learn all those tools and [how to work with them](./tutorials.md), you should reconsider a lot of established and well known approach...

But don't worry, you could start gently and use deepjs just in few places for begining, try each tools alone, find why and how things work in simple cases, before trying to understand how and why deepjs manage all this together.

It was thought with highly ergonomic and simplicity consideration in mind, and could be used in plenty cases, from simple one-shot to sofisticated holistic usage, without needing to put your actual framework to trash.

So, follow the white rabbit... and never, never, never forget to copy/paste/test tutorial examples in your preferred js console.
You'll see your code as never before.

deepjs, as smart as you are. ;)


#### Modelisation and Queries
deepjs provides tools to modelise and manipulate structures inheritance and compositions.
For this, it mainly uses Aspects Composition (AOP) principles, and particular queries/selector that allow to navigate-in and select objects structures. The combination of those two paradigms (AOP + queries) gives differents ways to nicely handle objects modelisation and/or run-time.
* [basic-modelisation](./basic-modelisation.md)
* [compositions](./compositions.md)
* [colliders](./colliders.md)
* [deep-queries](./deep-queries.md)
* [deep-rql](./deep-rql.md)
* [backgrounds and flatten](./backgrounds-and-flatten.md)
* [code sheets](./sheets.md)
* [Object Capabilities Manager](./ocm.md)
	* [Additive vs restrictive](./ocm/ocm-synthesis.md)
	* [Delegation](./ocm/ocm-delegate.md)
	* [Server usages](./ocm/ocm-server.md)
	* [Browser usages](./ocm/ocm-browser.md)

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
deepjs provides an absolute homogeneous persistent store API and provides, through its chain, a simple and convinient way to handle store's transactions sequences.

The aim is to manage dynamic datas, through JSON/REST API, in exactly the same way, browser or server side. 

* [native collection store](./stores/native-stores.md)
* [ocm, stores and chains](./stores/store-chain.md)
* [list of implemented stores](./modules.md)

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

#### Nodejs concreets
* [nodejs simple](./nodejs/simple.md) 
* [nodejs more complex](./nodejs/full.md)

#### Browser concreets
* [browser simple](./nodejs/simple.md) 
* [browser more complex](./nodejs/full.md)

#### Sandboxes
* [deep-playground](https://github.com/deepjs/deep-playground)
* [deepjs.org](https://github.com/deepjs/deepjs.org)
