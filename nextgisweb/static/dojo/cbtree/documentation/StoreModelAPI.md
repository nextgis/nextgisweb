# Store Model API #
The Store Model API extends the functionality of the standard CheckBox Tree Store
Models. The Store Model API can be loaded and used with the TreeStoreModel, the ForestStoreModel and
the FileStoreModel. 

The API allows the user to programmatically build and maintain checkbox
trees. For example, you can create your store starting with an empty JSON dataset
or use an existing data store and use the Store Model API to add, move, remove or
change store items.

### File Store Model Restrictions ###
When used with the FileStoreModel ***ONLY*** the functionality to query the 
[File Store](FileStore.md) is supported. You can not, for example, add items to
a File Store nor can you change any of the File Store item properties deemed 
'read-only'. The File Store does however support its own *rename()* function
allowing you to rename files.

With the addition of the FileStore, several functions have been extended to support the
optional parameter *storeOnly*. Please refer to *fetchItemsWitchChecked()* for a detailed
description of the *storeOnly* parameter.

### Loading the API ###
The Store Model API is implemented as an extension to the [Store Models](StoreModels.md)
and as such needs to be loaded as a separate module. The following sample demonstrates how
to load the Store Model API 

    require([ 
        "dojo/data/ItemFileWriteStore",
        "cbtree/Tree",                      // Checkbox Tree
        "cbtree/models/ForestStoreModel",   // Forest Store Model
        "cbtree/models/StoreModel-API"      // Store Model API extensions
      ], function( ItemFileWriteStore, Tree, ForestStoreModel, StoreModelAPI ) {

            ...

         }
    );

You can test the availability of the Store Model API using the command `has("cbtree-storeModel-API")`
. For example:

    require(["dojo/has",
                ...
            ], 
      function( has, ... ) {
        if (has("cbtree-storeModel-API")) {
                ...
        }
      }
      

<h2 id="store-model-api-functions">Store Model API Functions</h2>

#### addReference( childItem, parentItem, childrenAttr ) ####
> Add an existing store item (childItem) to the parentItem by reference.

*childItem:* data.item
> A valid dojo.data.store item.

*parentItem:* data.item
> A valid dojo.data.store item.

*childrenAttr:* String (optional)
> Property name of the parentItem identifying the children's list to which the
> reference is added. If omitted, the first entry in the models *childrenAttrs*
> property is used.

***********************************
#### attachToRoot( storeItem ) ####
> Promote a store item to a top-level store item.

*storeItem:* data.item
> A valid dojo.data.store item.

******************************************
#### check( query, onComplete, scope, storeOnly ) ####
> Check all store items that match the query.

*query:* Object | String
> A JavaScript object as a set of JavaScript 'property name: value' pairs. If
> the *query* argument is a string, the value is used to match store items
> identifier. (See [The Query Paramater](#the-query-parameter) for more details).

*onComplete:* Function (optional)
> If an onComplete callback is specified, the callback function will be called
> just once, after the last storeItem has been updated as: *onComplete(matches, updates)*
> were *matches* equates to the total number of store items that matched the
> query and *updates* equates to the number of store items that required an
> update.

*scope:* Object (optional)
> If a scope object is provided, the function onComplete will be invoked in the
> context of the scope object. In the body of the callback function, the value
> of the "this" keyword will be the scope object. If no scope is provided, 
> onComplete will be called in the context of the model.

*storeOnly:* Boolean (optional)
> If the store model property *checkedStrict* is enabled this parameter will be automatically 
> set to *true*.  
> See *fetchItemsWithChecked()* for more details.

******************************************
#### detachFromRoot( storeItem ) ####
> Detach item from the store root by removing it from the stores top-level item
> list. Note: the store item is not deleted.

*storeItem:* data.item
> A valid dojo.data.store item.

******************************************
#### fetchItem( query, identAttr ) ####
> Get the store item that matches *query*. Parameter *query* is either an object or a string.

*query:* Object | String
> A JavaScript object as a set of JavaScript 'property name: value' pairs. If
> the *query* argument is a string, the value is used to match store items
> identifier. (See [The Query Paramater](#the-query-parameter) for more details).

*identAttr:* String (optional)
> Attribute/property name. If specified AND parameter *query* is an object,
> the property in *query* to be used as the identifier otherwise the default
> store identifier is used.

******************************************
#### fetchItemsWithChecked( query, onComplete, scope ) ####
> Get the list of store items that match the query and have a checked state,
> that is, a property identified by the models *checkedAttr* property. 
> (See [Model Properties](StoreModels.md#store-model-properties))

*query:* Object | String
> A JavaScript object as a set of JavaScript 'property name: value' pairs. If
> the *query* argument is a string, the value is used to match store items
> identifier. (See [The Query Paramater](#the-query-parameter) for more details).

*onComplete:* Function (optional)
> If an onComplete callback is specified, the callback function will be called
> just once, after the last storeItem has been updated as: *onComplete(matches, updates)*.

*scope:* Object (optional)
> If a scope object is provided, the function onComplete will be invoked in the
> context of the scope object. In the body of the callback function, the value
> of the "this" keyword will be the scope object. If no scope is provided, 
> onComplete will be called in the context of the model.

*storeOnly:* Boolean (optional)
> Indicates if the fetch operation should be limited to the in-memory store
> only. Some stores may fetch data from a back-end server when performing a
> deep search. When querying store item attributes, some attributes may ***ONLY***
> be available in the in-memory store as is the case with a File Store.
> As an example, the *checked* state of a store item is an attribute in the 
> in-memory File Store, custom created by the store model but not available on,
> or maintained by, the back-end server.

> Limiting the fetch operation to the store will prevent it from requesting, 
> potentially large, datasets from the server that don't have the required 
> attribute(s) to begin with. However, limiting a fetch to the 
> in-memory store may not return all possible matches if the store isn't fully
> loaded. For example, if lazy loading is used and not all tree branches have
> been fully expanded the result of a fetch may be unpredictable.

> The default value of *storeOnly* is *true*.

******************************************
#### getItemAttr( storeItem , attribute ) ####
> Provide the getter capabilities for store items thru the model. The getItemAttr()
> method strictly operates on store items not the model itself. Equivalent to *store.getValue()*

*storeItem:* data.item
> A valid dojo.data.store item.

*attribute:* String
> The name of a store item attribute/property whose value is to be returned.

******************************************
#### isRootItem( something ) ####
> Returns true if *something* is a top-level item in the store otherwise false.
> Please refer to section: [Store Root versus Tree Root](StoreModels.md#store-root-versus-tree-root)
> for additional information.

******************************************
#### newReferenceItem( args, parentItem, insertIndex, childrenAttr ) ####
> Create a new top-level item and add it as a child to the parentItem by reference.

*args:*
> A JavaScript object defining the initial content of the item as a set of
> JavaScript 'property name: value' pairs.

*parentItem:* data.item
> A valid dojo.data.store item.

*insertIndex:* Number (optional)
> Zero based index, if specified the location in the parents list of child items.

*childrenAttr:* String (optional)
> Property name of the parentItem identifying the children's list to which the
> new item is added. If omitted, the first entry in the models *childrenAttrs*
> property is used.

******************************************
#### removeReference( childItem, parentItem, childrenAttr ) ####
> Remove a child reference from its parent. Only the reference is removed,
> the childItem is not delete.

*childItem:* data.item
> A valid dojo.data.store item.

*parentItem:* data.item
> A valid dojo.data.store item.

*childrenAttr:* String (optional)
> Property name of the parentItem identifying the children's list from which the
> reference is removed. If omitted, the first entry in the models *childrenAttrs*
> property is used.

******************************************
#### setItemAttr( storeItem, attribute, value ) ####
> Provide the setter capabilities for store items thru the model. The setItemAttr()
> method strictly operates on store items not the model itself. Equivalent to *store.setValue()*

*storeItem:* data.item
> A valid dojo.data.store item.

*attribute:* String
> The name of a store item attribute/property whose value is to be updated.

*value:* AnyType
> New value to be assigned to the property *attribute*

******************************************
#### uncheck( query, onComplete, scope, storeOnly ) ####
> Uncheck all store items that match the query.

*query:* Object | String
> A JavaScript object as a set of JavaScript 'property name: value' pairs. If
> the *query* argument is a string, the value is used to match store items
> identifier. (See [The Query Paramater](#the-query-parameter) for more details).

*onComplete:* Function (optional)
> If an onComplete callback is specified, the callback function will be called
> just once, after the last storeItem has been updated as: *onComplete(matches, updates)*
> were *matches* equates to the total number of store items that matched the
> query and *updates* equates to the number of store items that required an
> update.

*scope:* Object (optional)
> If a scope object is provided, the function onComplete will be invoked in the
> context of the scope object. In the body of the callback function, the value
> of the "this" keyword will be the scope object. If no scope is provided, 
> onComplete will be called in the context of the model.

*storeOnly:* Boolean (optional)
> If the store model property *checkedStrict* is enabled this parameter will be automatically 
> set to *true*.  
> See *fetchItemsWithChecked()* for details.


<h2 id="the-query-parameter">The Query Parameter</h2>

The query parameter is a JavaScript 'name:value' pairs type object. The value can be any data
type that is allowed in a JavaScript conditional test. In general, string values or interpreted
as simple pattern strings which will be converted into regular expressions.

For example, in the following query: {name:"ab\*"}, the pattern string "ab\*" translates into the
regular expression: /^ab.\*$/  
Other pattern string conversion samples are:

<table border="0">
  <thead>
	  <th style="width:150px;">Pattern</th> <th style="width:200px;">Regular Expression</th>
  </thead>
  <tbody>
	  <tr> <td>*ab*</td> <td>/^.*ab.*$/</td> </tr>
	  <tr> <td>*a\*b*</td> <td>/^.*a\*b.*$/</td> </tr>
	  <tr> <td>*a\*b?*</td> <td>/^.*a\*b..*$/</td> </tr>
  </tbody>
</table>

The above applies to almost all dojo stores however, some stores also provide ways to pass
literal regular expressions. For example, the [File Store](FileStore.md#querying-the-store)
support such feature by enclosing the string value in brackets.

<h2 id="sample-application">Sample Application</h2>
****************************************
The following sample application demonstrate the use of several of the Store Model
API functions. A more elaborate demo can be found in the CheckBox Tree package
directory /cbtree/demos/tree03.html

    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
      <head> 
        <title>CheckBox Tree using the Model API</title>     

        <style type="text/css">
          @import "../../dijit/themes/claro/claro.css";
          @import "../themes/claro/claro.css";
        </style>

        <script type="text/JavaScript">
          var dojoConfig = {
                async: true,
                parseOnLoad: true,
                isDebug: true,
                baseUrl: "../../",
                packages: [
                  { name: "dojo",  location: "dojo" },
                  { name: "dijit", location: "dijit" },
                  { name: "cbtree",location: "cbtree" }
                ]
          };
        </script>
        <script type="text/JavaScript" src="../../dojo/dojo.js"></script> 
      </head>
        
      <body class="claro">
        <div id="CheckboxTree">
          <script type="text/JavaScript">
            require([ "dojo/_base/array",
                      "dojo/domReady",
                      "dojo/data/ItemFileWriteStore",
                      "cbtree/Tree",                      // Checkbox Tree
                      "cbtree/models/ForestStoreModel",   // Forest Store Model
                      "cbtree/models/StoreModel-API"      // Store Model API extensions
                    ], function( array, domReady, ItemFileWriteStore, Tree, ForestStoreModel ) {

              // Declare an empty JSON data object (an empty store).
              var EmptyData = { identifier: 'name', label:'name', items:[] };
                
              // Create the Forest Store model
              model = new ForestStoreModel( {
                      store: new ItemFileWriteStore( { data: EmptyData }),
                      query: {type: 'parent'},
                      rootLabel: 'The Simpsons Tree',
                      checkedAll: true,
                      checkedRoot: true
                      }); 
              // Create the tree (which will be empty). 
              tree = new Tree( { model: model, id: "MyTree", autoExpand: true });

              // Add all items as top-level store entries.
              model.newItem( { name: 'Homer', type: 'parent', hair: 'none' } );
              model.newItem( { name: 'Marge', type: 'parent', hair: 'blue' } );

              model.newItem( { name: 'Bart',  type: 'child', hair:'black' } );
              model.newItem( { name: 'Lisa',  type: 'child', hair:'blond' } );
              model.newItem( { name: 'Maggie',type: 'child', hair:'brown' });

              // Add a reference to parent 'Homer' for each child with a 'checked' state
              model.fetchItemsWithChecked( { type:'child' }, function(children) {
                  var parent = this.fetchItem('Homer');
                  array.forEach( children, function(child){
                    this.addReference( child, parent );
                  }, this )
                }, model );

              // Set checked state of all store items to 'checked' and then uncheck 'Bart'.
              model.check( '*' );
              model.uncheck( 'Bart' );

              // Chnage store item attribute...
              model.setItemAttr( model.fetchItem('Bart'), 'hair', blond' );
              
              domReady( function() {
                tree.placeAt( "CheckboxTree" );
              });
            });
          </script>
        </div>
      </body>
    </html>


