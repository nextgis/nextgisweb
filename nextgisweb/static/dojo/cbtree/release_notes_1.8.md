# The CheckBox Tree#
## Release Notes for dojo 1.8 ##

This document provides the release notes specific to the CheckBox Tree running on dojo 1.8.
Some of the changes to the CheckBox Tree are due to specific changes to the dijit Tree whereas
others are due to changes/enhancements to dojo 1.8. This document will reference, when appropriate,
the dojo 1.8 release notes which can be found
at [http://livedocs.dojotoolkit.org/releasenotes/1.8](http://livedocs.dojotoolkit.org/releasenotes/1.8)

> **THIS VERSION IS NOT COMPATIBLE WITH PREVIOUS DOJO VERSION**

#### Download: cbtree-v0.9.2 ####


## cbtree/Tree ##

This section handles all changes and enhancements made to the cbtree/Tree module.

#### Changed Event Deligation ####

The event deligation of the dijit Tree has changed. Events such as "onClick" and "onDblClick"
are no longer handled on a per tree node basis, instead they are now deligated to the tree.
This is the main reason why a new cbtree release is required. In addition, this "new" approach
is actually how it used to be in dojo 1.3. See the [dojo 1.8 release notes](http://livedocs.dojotoolkit.org/releasenotes/1.8#tree)
for additional information.

#### Dojo Version Check ####

Because the CheckBox Tree is not part of the dojo core package and can be
downloaded separately, a dojo version check has now been implementated.
During tree instantiation the CheckBox Tree tests if you are running the
minimum required dojo version. If the dojo version is out of range the tree
will now throw an error.

#### Per Item "read-only" checkbox ####

In previous versions of the CheckBox Tree the tree properties *BranchReadOnly*
and *leafReadOnly* enabled you to control the *readOnly* property of a
checkbox or alternative widget. As of cbtree version 0.9.2 (dojo 1.8) the *readOnly*
property can be managed on a per store item basis.

A new property has been add to the store models in order to accomplish this new
feature: *enabledAttr*, see the [CheckBox Store Models](#checkbox-tree-store-models)
for additional information.

	var myModel = new ForestStoreModel( { ... , enabledAttr: "enabled", ... } );

No default value is set the the *enabledAttr* property and all store items are "enabled"
by default, that is *readOnly=false*. The enabled state of an item can be retrieved or
set at both the tree node or store model level.

	nodeWiget.get("enabled")
	storeModel.getEnabled(item)
	storeModel.getItemAttr(item,"enabled");

#### Declarative CheckBox Tree ####

As of dojo 1.8 support is provided to instantiate anonymous AMD classes declarative.
as a result you are now able to create the CheckBox Tree and all of its models using
the HTML5 syntax like:

	<div data-dojo-id="myTree" data-dojo-type="cbtree/Tree" data-dojo-props='id:"myTree", store:myStore, ...'>

Several new demos have been added to demonstrate this capability. The **/cbtree/demos**
directory now holds demos named *treexx.html* and *treexx-decl.html* where the first
is the programmatic implementation of the demo and the second the declarative version
of the same demo.

#### Custom Widget Type ####

To fully support the declarative instantiation of the CheckBox Tree the *type* property
of a custom widget can now be specified as a module ID string

	<div data-dojo-id="tree", data-dojo-type="cbtree/Tree" data-dojo-props='model:model, id:"tree", 
		 widget:{type:"dojox/form/TriStateCheckbox", args: { states:["mixed", true, false] }}'>
	</div>

#### Tree Widget startup() call ###
Although recommended in the passed, it is now required to call the *startup()* method
of any tree when created programmatically, including the CheckBox Tree. As an example:

	var myTree = new cbtree( {model: myModel}, "myCheckBoxDiv" );
	myTree.startup();

				or alternatively
				
	var myTree = new cbtree( {model: myModel});
	myTree.placeAt( "myCheckBoxDiv" );
	myTree.startup();
	
See the [dojo 1.8 release notes](http://livedocs.dojotoolkit.org/releasenotes/1.8#tree)
for additional information.

## cbtree/TreeStyling ##

The original dijit tree crashed when cbtree/TreeStyling was loaded throwing a Type Error:

	TypeError: this._itemStyleMap is null

The problem has been fixed.

## cbtree/main ##

The cbtree/main module (main.js) has been removed. Go forward you need to "require"
the cbtree modules explicitly. As a result the syntax:

	require(["cbtree", 
				... 
			], function( cbtree, ... ) {
			...
	  var myModel = new cbtree.ForestStoreModel( ... );
	  var myTree  = new cbtree.Tree( ... );
	})

Is no longer supported. Instead, use the following:

	require(["cbtree/Tree",
			 "cbtree/models/ForestStoreModel",
						...
			], function( Tree, ForestStoreModel, ... ) {
			...
	  var myModel = new ForestStoreModel( ... );
	  var myTree  = new Tree( ... );
	})



<h2 id="checkbox-tree-store-models">CheckBox Tree Store Models</h2>

#### New Property ####

A new store model property named ***enabledAttr*** has been added to support
the 'Per Item Read-Only Checkbox'. 

The *enabledAttr* value is the name of the store item attribute that holds the
so-called 'enabled' state of the checkbox or alternative widget. 

**NOTE:** Although it is called the 'enabled' state, the tree will only use this
property to enable/disable the "readOnly" property of a checkbox. This because
disabling a widget may exclude it from HTTP POST operations.

#### New Functions ####

The StoreModel-API functions *get()* and *set()* have been removed and replaced with
the new dojo 1.8 Stateful.js module at the Store Model level. 
As a result the *get()* and *set()* methods are now provided by all cbtree Store Models
without having to load the StoreModel-API module.   
See [dojo/Stateful](http://livedocs.dojotoolkit.org/releasenotes/1.8#dojo-stateful) for
more information.

## The File Store and Model ##

A new File Store and model have been added which allows the user to render and 
manage the back-end server file system as a tree. The in-memory File Store is
dynamic in that items may be added, removed or change based on the responses
received from the back-end server or you can programatically delete or rename
store items (files). The File Store fully supports lazy loading.

The File Store Model supports Drag & Drop allowing you to easily manage your
Filer Server. See the File Store documentation for details.

