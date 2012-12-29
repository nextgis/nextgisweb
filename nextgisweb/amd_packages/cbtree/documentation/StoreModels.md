# CheckBox Tree Store Models #
The CheckBox Tree comes with three store models, that is, a *Tree Store Model*
a *Forest Store Model* and a *File Store Model*. The distinct differences are
explained in the following sections. Which store model to use primarily depends on:

1. How the data store is structured.
2. How you are going to query the store.

<h2 id="store-root-versus-tree-root">Store Root versus Tree Root</h2>

Throughout the documentation references are made to both the tree root as well
as the store root. It is important to know that they are **NOT** the same thing.
Store root item(s) identify so called top-level entries in the data store, there
can be as little as zero top-level items (empty store) or as many as the number
of store items.

### Store Root ###
In general, a store in the context of the Store Model is a *dojo.data.store* or
to be more precise a *dojo.data.ItemFileWriteStore*. In reality a *dojo.data.store*
has no real root instead it classifies store items as:

* Top-level store items.
* Non top-level store items.

In essence a store is a container of 'items' were each item is a JavaScript
Object. Items can be organized in a hierarchy, with each item having distinct 
descendents (commonly referred to as child items), and/or loosely coupled referencing
other items in the store as their children. The best way to illustrate the difference
is by some simple examples:

**Items with a hierarchy: (SampleStore_1)**

    { identifier: 'name',
      label: 'name',
      items: [
        { name:'Homer', type:'parent', hair:'none', checked:true,
            children:[ { name:'Lisa', type:'child', hair:'blond', checked:true },
                       { name:'Bart', type:'child', hair:'blond', checked:true },
                       { name:'Maggie', type:'child', hair:'blond', checked:true }
                     ]
        }
      ]
    }

**Items with references: (SampleStore_2)**

    { identifier: 'name',
      label: 'name',
      items: [
        { name:'Homer', type:'parent', hair:'none', checked:true,
            children:[{_reference:'Lisa'}, {_reference:'Bart'}, {_reference:'Maggie'}]
        },
        { name:'Marge', type:'parent', hair:'blond', checked:true,
            children:[{_reference:'Lisa'}, {_reference:'Bart'}, {_reference:'Maggie'}]
        },
        { name:'Lisa', type:'child', hair:'blond', checked:true },
        { name:'Bart', type:'child', hair:'blond', checked:true },
        { name:'Maggie', type:'child', hair:'blond', checked:true }
      ]
    }

In the first example, 'Homer' is considered a top-level store item simply because
he is not a 'child' of any other item in the store. On the other hand, 'Lisa',
'Bart' and 'Maggie' are non top-level store items because they all are direct
descendents of Homer. In this example, Homer could be considered to be the root
of the data store as there is only one top-level store item.

In the second example, all items are top-level store items because none of them
is declared as a direct descendent of another store item. In this case 'Lisa',
'Bart' and 'Maggie' are merely referenced using the special '_reference' property.

#### Querying the store ####
From a storage perspective it doesn't really matter how the items are organized,
the big difference is only revealed when one starts querying the store. By default
store queries operates on top-level item ***ONLY*** unless you specify some of
the additional query parameter(s). For example, when creating a store model with
a query argument like: *query: {name:'\*'}* would only return 'Homer' in the first
example whereas in the second example, all store items would be returned because
they are all top-level store items and they all have the property *name*.

### Tree Root ###
The tree root is identified by, or associated with, a single unique data item.
Note: a data item in this context can be either a real store item or a fabricated
item in case the store query returned multiple store items. In addition, whenever
the tree root represents a thru data store item it does ***NOT*** have to be the
first entry in the store, it all depends on the query used when creating the model.

Selecting the appropriate store model solely depends on the number of items
returned by the store query. The *TreeStoreModel* is used only if the store
query is guaranteed to return a single store item, in all other cases the 
*ForestStoreModel* is required.

<h2 id="tree-store-model">Tree Store Model</h2>

The Tree Store Model is used if, and only if, the store query is guaranteed to
return a single data store item. The data store structure itself is of no
importance. For example, the following example will use the sample reference
store (2) as listed above:

    var store = new ItemFileWriteStore( url: 'SampleStore_2' );
    var model = new TreeStoreModel( store: store, query: {hair:'none'} );

In this case we known the query is guaranteed to return a single store item, 
that is, 'Homer' therefore we can safely use the TreeStoreModel.

<h2 id="forest-store-model">Forest Store Model</h2>

The Forest Store Model is used whenever a store query could potentially return
multiple store items in which case the model will fabricate a artificial root
item. The fabricated root does not represent any store item and is merely used
to anchor the tree.

    var store = new ItemFileWriteStore( url: 'SampleStore_2' );
    var model = new TreeStoreModel( store: store, query: {name:'*'} );

                      or simply:

    var model = new TreeStoreModel( store: store );

In this example the store query returns all store items available.

<h2 id="file-store-model">File Store Model</h2>

Similar to the Forest Store Model, the File Store Model allows the user to present
the back-end server file system as a traditional UI directory tree. 
The model is designed to be used with the cbtree FileStore which implements both the 
*dojo.data.api.Read* and *dojo.data.api.Write* APIs offering the functionality to query the back-end
servers file system, add lazy loading and provide limited support for store write operations.
Please refer to the [File Store](FileStore.md) documentation for details. 

The File Store Model implements a subset of the Forest Store Model and [Store Model API](StoreModelAPI.md) functionality.
Because the content of a File Store is treated as read-only, that is, you can't add new
items to the store, any attempt to do so will throw an error. You can however add custom
properties to store items which will be writeable or rename or delete store items. The File
Store Model also supports drag and drop operations using the File Store rename capabilities.

In addition to the common Store Model Properties, the File Store Model has an
additional set of properties to help query the File Store. Also, because of the
reduced function set supported, some of common store model properties will be
ignored by the File Store Model.

<h2 id="store-model-properties">Store Model Properties</h2>

#### checkedAll: ####
> Boolean (true), If true, every store item will receive a 'checked' state property
> regardless if the 'checked' attribute is specified in the dojo.data.store.
> (see also *checkedAttr*)

#### checkedAttr: ####
> String ('checked'), The attribute name (property of the store item) that holds
> the 'checked' state. On load it specifies the store items initial checked state.
> For example: { name:'Egypt', type:'country', checked: true } If a store item
> has no 'checked' attribute specified it depends on the model property *checkedAll*
> if one will be created automatically and if so, its initial state will be set as
> specified by *checkedState*.

#### checkedState: ####
> Boolean (false), The default state applied to every store item unless otherwise
> specified in the dojo.data.store (see also: *checkedAttr*)

#### checkedRoot: ####
> Boolean (false), If true, the root node will receive a checked state even
> though it may not be a true entry in the store. This attribute is independent
> on the *showRoot* attribute of the tree itself. If the tree attribute *showRoot*
> is set to false the checked state for the root will not show either.

#### checkedStrict: ####
> Boolean (true), If true, a strict parent-child relation is maintained. For
> example, if all children are checked the parent will automatically receive
> the same checked state or if any of the children are unchecked the parent
> will, depending on, if multi state is enabled, receive either a mixed or unchecked
> state. Note: If true, the property *deferItemLoadingUntilExpand* will be ignored
> and a complete store load is forced.

#### childrenAttrs: ####
> String[] ('children'), Array of one or more attribute names (attributes of a dojo.data item)
> that specify that item's children.

#### deferItemLoadingUntilExpand: ####
> Boolean (false), If true will cause the TreeStoreModel to defer calling loadItem
> on nodes until they are expanded. This allows for lazy loading where only one
> loadItem (and generally one network call) per expansion (rather than one for each child).
> Note: Only valid if *checkedStrict* equals false.

#### enabledAttr: ####
> The name of a store item attribute that holds the 'enabled' state
> of the checkbox or alternative widget. Note: Eventhough it is referred to as the
> 'enabled' state the tree will only use this property to enable/disable the 
> 'ReadOnly' property of a checkbox or alternative widget. This because disabling
> a widget (DOM element) may exclude it from HTTP POST operations.

#### excludeChildrenAttrs: ####
> String[] (null), If multiple childrenAttrs have been specified excludeChildrenAttrs
> determines which of those childrenAttrs are excluded from: a) getting a checked state.
> b) compiling the composite state of a parent item.

#### iconAttr: ####
> String (''), If set, identifies the data item attribute (property) whose value is
> considered a tree node icon. (see [Tree Styling](TreeStyling.md))

#### labelAttr: ####
> String (''), If specified, get label for tree node from this attribute, rather
> than by calling store.getLabel()

#### multiState: ####
> Boolean (true), Determines if the checked state is to be maintained as multi
> state or or as dual state, that is, {"mixed",true,false} vs {true,false}.

#### newItemIdAttr: ####
> String ('id'), Name of attribute in the Object passed to newItem() that specifies
> the id.

#### normalize: ####
> String (true), If true, the checked state of any non branch (leaf) checkbox is
> normalized, that is, true or false. When normalization is enabled checkboxes
> associated with tree leafs (e.g. nodes without children) can never have a mixed state.

#### query: ####
> Object (null), A set of JavaScript 'property name: value' pairs used to identify
> the children of the root item. For example: {type:'parent'}.
> If not specified, the store identifier attribute is used to query the store.

#### rootLabel: ####
> String ('ROOT'), Label of fabricated root item. Only valid for a ForestStoreModel.

#### rootId: ####
> String ('$root$'), ID of fabricated root item, Only valid for a ForestStoreModel.

#### store: ####
> Object (null), The underlying dojo/data or cbtree/file store.


<h2 id="file-store-model-properties">File Store Model Properties</h2>

The following properties are in addition to the common store model properties but are
specific to the File Store Model. 
Please note that these properties rely on the use of the cbtree File Store ***AND*** 
the server side applications *cbtreeFileStore.php* or *cbtreeFileStore.cgi*.
(See the [File Store](FileStore.md) documentation for details).

#### queryOptions: ####
> Object (null), A set of JS 'property:value' pairs used to assist in querying the 
File Store and back-end server. Properties supported are: *deep* and *ignoreCase*. 
If deep is true a recursive search is performed on the stores basePath and path
combination. If ignoreCase is true, filenames and paths are matched case insensitive.

#### sort: ####
> Array (null), An array of sort fields, each sort field is a JavaScript 'property:value'
pair object. The sort field properties supported are: *attribute*, *descending* and
*ignoreCase*. Each sort field object must at least have the *attribute* property defined, the
default value for both *descending* and *ignoreCase* is false. 
The sort operation is performed in the order in which the sort field objects appear in the
sort array.

> sort:[ {attribute:'directory', descending:true}, {attribute:'name', ignoreCase: true} ]

> The above examples returns a typical UI style directory listing with the directories first
followed by a file list in ascending order.

<h2 id="store-model-functions">Store Model Functions</h2>

The following is a list of the default functions available with the CheckBox Tree
store models. 
Additional functionality is available using the [Store Model API](StoreModelAPI.md).

******************************************
#### deleteItem( storeItem ) #### 
#### deleteItem( storeItem, onBegin, onComplete, onError, scope) #### 
> Delete a store item. Please note that this feature needs to be explicitly enabled
> on a File Store. (See the [CBTREE_METHODS](FileStore.md#server-side-configuration) environment
variable in the File Store documentation
for details).

*storeItem:* data.item
> A valid dojo.data.store item.

*onBegin:* Function (Optional, FileStoreModel only)
> If an onBegin callback function is provided, the callback function
> will be called just once, before the XHR DELETE request is issued.
> The onBegin callback MUST return true in order to proceed with the
> deletion, any other return value will abort the operation.

*onComplete:* Function (Optional, FileStoreModel only)
> If an onComplete callback function is provided, the callback function will be
> called once on successful completion of the delete operation with the list of
> deleted file store items.

*onError:* Function (Optional, FileStoreModel only)
> The onError parameter is the callback to invoke when the item load
> encountered an error. It takes only one parameter, the error object

*scope:* Object (Optional, FileStoreModel only)
> If a scope object is provided, all of the callback functions (onBegin,
> onError, etc) will be invoked in the context of the scope object. In
> the body of the callback function, the value of the "this" keyword
> will be the scope object otherwise window.global is used.

*********************************************
#### fetchItemByIdentity( keywordArgs ) ####
> Fetch a store item by identity.

*********************************************
#### getChecked ( item ) ####
> Get the current checked state from the dojo.data store. The checked state
> in the store can be: 'mixed', true, false or undefined. Undefined in this
> context means no checked identifier (checkedAttr) was found in the store.

*item:* data.item
> A valid dojo.data.store item.

*********************************************
#### getChildren( parentItem, onComplete, onError, childrenLists  ) ####
> Calls onComplete() with array of child items of given parent item,
> all loaded. Note: Only the immediate descendents are returned.

*parentItem:* data.item
> A valid dojo.data.store item.

*onComplete:* Function (optional)
> If an onComplete callback is specified, the callback function will be called
> just once, as *onComplete( children )*.

*onError:* Function (optional)
> Called when an error occured.

*childrenLists:* String[] (optional)
> Array of property names of the *parentItem* identifying the children lists from
> which the children are fetched. If omitted, all entries in the models *childrenAttrs*
> property are used in which case all children are returned.

*********************************************
#### getEnabled( item ) ####
> Returns the current 'enabled' state of an item as a boolean. See the *enabledAttr*
> property description for more details.

*item:* data.item
> A valid dojo.data.store item.

*********************************************
#### getIcon( item ) ####
> If the *iconAttr* property of the model is set, get the icon for *item* from
> the store otherwise *undefined* is returned.

*item:* data.item
> A valid dojo.data.store item.

*********************************************
#### getIdentity( item ) ####
> Get the identity of an item.

*item:* data.item
> A valid dojo.data.store item.

*********************************************
#### getLabel( item ) ####
> Get the label for an item. If the model property *labelAttr* is set, the
> associated property of the item is retrieved otherwise the *labelAttr*
> property of the store is used.

*item:* data.item
> A valid dojo.data.store item.

*********************************************
#### getParents ( item ) ####
> Get the parent(s) of a store item. Returns an array of store items.	

*item:* data.item
> A valid dojo.data.store item.

*********************************************
#### getRoot( onItem, onError ) ####
> Calls onItem with the root item for the tree, possibly a fabricated item.
> Calls onError on error.

*onItem:* Function
> Callback function. On successful completion called as *onItem( root )*.

*onError:* Function (optional)
> Called when an error occured.

*********************************************
#### isItem( something ) ####
> Returns true is parameter *something* is a valid store item or, in case of a
> Forest Store Model, the fabricated tree root.

*********************************************
#### isTreeRootChild ( item ) ####
> Returns true if the *item* is a child of the tree root. Please refer to section: 
> [Store Root versus Tree Root](StoreModels.md#store-root-versus-tree-root) for additional
> information.

*item:* data.item
> A valid dojo.data.store item.

*********************************************
#### mayHaveChildren( item ) ####
> Returns true if an item has or may have children.

*item:* data.item
> A valid dojo.data.store item.

*********************************************
#### newItem ( args, parentItem, insertIndex, childrenAttr ) ####
> Creates a new item. Note: Whenever a parentItem is specified the store will NOT
> create *args* as a top-level store item. (See the [Store Model API](StoreModelAPI.md#store-model-api-functions)
> function *newReferenceItem()* for additional information).

*args:*
> A javascript object defining the initial content of the item as a set of
> JavaScript 'property name: value' pairs.

*parentItem:* data.item
> A valid dojo.data.store item.

*insertIndex:* Number (optional)
> Zero based index, If specified the location in the parents list of child items.

*childrenAttr:* String (optional)
> Property name of the parentItem identifying the childrens list to which the
> new item *args* is added. If ommitted, the first entry in the models *childrenAttrs*
> property is used.

*********************************************
#### setChecked ( item, newState ) ####
> Update the checked state of a store item. If the model property *checkedStrict*
> is true, the items parent(s) and children, if any, are updated accordingly.

*item:* data.item
> A valid dojo.data.store item.

*newState:* Boolean | String
> The new checked state. The state can be either a boolean (true | false) or a string ('mixed')

*********************************************
#### setEnabled( item, value ) ####
> Set the new 'enabled' state of an item. See the *enabledAttr* property description for more
> details.

*item:* data.item
> A valid dojo.data.store item.

<h2 id="store-model-callbacks">Store Model Callbacks</h2>

#### onChange( item, attribute, newValue ) ####
> Callback whenever a data item has changed, so that the Tree can update the label, icon,
> etc. Note that changes to an item's children or parent(s) will trigger an
> onChildrenChange() instead.

#### onChildrenChange( parent, newChildrenList ) ####
> Callback to notify about new, updated, or deleted items.
 
#### onDataValidated() ####
> Callback when store validation completion. Only called if strict parent-child
> relationship is enabled.
 
#### onDelete( item ) ####
> Callback when an item has been deleted.
 
#### onLabelChange ( oldValue, newValue ) ####
> Callback when the label attribute property of the model changed.
