YUI.add("yuidoc-meta", function(Y) {
   Y.YUIDoc = { meta: {
    "classes": [
        "deep",
        "deep.Chain",
        "deep.Composer",
        "deep.Deferred",
        "deep.Promise",
        "deep.Query",
        "deep.Role",
        "deep.Validator",
        "deep.collider",
        "deep.collider.array",
        "deep.collider.assert",
        "deep.collider.object",
        "deep.compose",
        "deep.deep",
        "deep.roles",
        "deep.store",
        "deep.store.Array",
        "deep.store.Object",
        "deep.store.Store",
        "deep.stores",
        "deep.stores.aspect",
        "deep.stores.instance",
        "deep.stores.js",
        "deep.stores.queryThis",
        "deep.utils"
    ],
    "modules": [
        "deep",
        "deep-collider",
        "deep-compose",
        "deep-query",
        "deep-roles",
        "deep-rql",
        "deep-schema",
        "deep-stores",
        "utils"
    ],
    "allModules": [
        {
            "displayName": "deep",
            "name": "deep",
            "description": "deep : just say : Powaaaaaa ;)"
        },
        {
            "displayName": "deep-collider",
            "name": "deep-collider",
            "description": "layer-data-composition : inspired by Compose, it offer a large set of tools that permit to manipulate values \n from within the object used as layer when applied together. \n As Compose merge two prototype by wrapping collided functions by appropriate Compose method (after, before, around),\n layer-compose do the same by applying a function when values are collided with that function.\n\n If you know photoshop : it's an equivalent of the fusion modes between two layers (or part of two layers)."
        },
        {
            "displayName": "deep-compose",
            "name": "deep-compose",
            "description": "When you collide two functions together, you could use deep.compose to manage how collision is resolved.\n Keep in mind that if you collide a simple function (up) on a composition (chained or not) : it mean : simply overwrite the composition by the function.\n So if you apply a composition from bottom on a function, the composition will never b applied.\n If you collide two compositions : they will be merged to give a unique composition chain."
        },
        {
            "displayName": "deep-query",
            "name": "deep-query",
            "description": "A other proposal for (json/object)-query which (as differences from official proposal):\n \t- use simple slash delimitted syntax, \n \t- could handle regular expression for step selection, \n \t- could handle rql (for filtering) on each step selection,\n \t- could be relative to where the query are placed in a object/json\n \t- so could handle steps toward any ancestor\n \t- could handle json-schema in rql filtering\n \t- could handle ancestor in rql filtering"
        },
        {
            "displayName": "deep-roles",
            "name": "deep-roles",
            "description": "Just a namespace : where default and custom roles are mainly stored."
        },
        {
            "displayName": "deep-rql",
            "name": "deep-rql",
            "description": "A deep oriented implementation of RQL for JavaScript arrays based on rql/js-array from Kris Zyp (https://github.com/persvr/rql).\n\tWhat's different from js-array ? It could handle schema properties and ancestor access when filtering"
        },
        {
            "displayName": "deep-schema",
            "name": "deep-schema",
            "description": "JSON-Schema validator : based on json-schema draft 02, 03, and 04 + extensions\n \thttp://tools.ietf.org/html/draft-zyp-json-schema-03"
        },
        {
            "displayName": "deep-stores",
            "name": "deep-stores",
            "description": "manage collections, objects and ressources as http styled stores.\n\nOne interface for all stores/ressources."
        },
        {
            "displayName": "utils",
            "name": "utils",
            "description": "a bunch of utilities functions for deep"
        }
    ]
} };
});