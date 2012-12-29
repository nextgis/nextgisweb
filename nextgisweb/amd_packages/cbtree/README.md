# The Dijit CheckBox Tree #

The dijit CheckBox Tree, github project code ***cbtree***, was formerly published under
the name [*Dijit Tree with Multi State Checkboxes*](http://thejekels.com/dojo/Dijit_Tree_MultiState_Chkbox.html). 
Both the Tree and associated models are highly configurable providing support
for, amongst others:

* Default dual state checkboxes (checked/unchecked).
* Multi state checkboxes (checked/unchecked/mixed).
* Alternative widgets instead of the standard checkbox widget.
* The standard dijit tree, that is, without checkboxes.
* Optional Parent-Child checkbox relationship.
* Tree Styling and Custom Icons API
* Hide branch and/or leaf icons
* Enhanced Store Model API

All dijit CheckBox Tree modules are fully AMD compliant, the CheckBox Tree
comes with two powerful extensions (API's) allowing the user to programmatically
control every aspect of the tree. Both extensions are optional therefore
if the user does not require the functionality they do not need to be loaded:

1. Tree Styling API
2. Store Model API

### The CheckBox ###
The use of checkboxes is configurable and enabled by default. The CheckBox Tree
uses it own so called multi-state checkbox to represent the checked state of a
data item. However, the user can substitute the multi-state checkbox with any
widget capable of representing a 'checked' state. Whether or not multi-state is
allowed, or dual state only, depends on the store model configuration.

If however, you elect to disable the checkbox feature the CheckBox Tree acts
like the default dijit Tree but still offering some of the additional benifits
like the ability to hide branch and/or leaf icons.

### Parent-Child Relationship ###
The CheckBox Tree comes with three store models, one of the Store Model features is
the ability to maintain a parent-child relationship.
The parent checked state, represented as a tree branch checkbox, is the composite
state of all its child checkboxes. For example, if the child checkboxes are either
all checked or unchecked the parent will get the same checked or unchecked state.
If however, the children checked state is mixed, that is, some are checked while
others are unchecked, the parent will get a so called 'mixed' state.

### CheckBox Tree Styling ###
The Tree Styling extension allows you to dynamically manage the tree styling 
on a per data item basis. Using the simple to use accessor *set()* you can alter
the icon, label and row styling for the entire tree or just a single data item.
For example: *set("iconClass", "myIcon", item)* changes the css icon class associated
with all tree node instances of a data item, or if you want to change the label
style:

    // As a callback of a CheckBox click event
    function checkBoxClicked (item, nodeWidget, evt) {
      if (nodeWidget.get("checked")) {
        tree.set("labelStyle", {color:"red"}, item);
      }
    }

    // As a regular function
    function updateStyle (item) {
      if (model.getChecked( item )) {
        tree.set("labelStyle", {color:"red"}, item);
      }
    }

### Store Model API ###

The CheckBox Tree comes with an optional Store Model API which serves both the
TreeStoreModel as well as the ForestStoreModel. The Store Model API allows the
user to programmatically build and maintain checkbox trees.
For example, you can create your store starting with an empty JSON dataset or use
an existing data store and use the API to add, remove or change store items.
In addition, you can simply check/uncheck a single store item or a set of store
items using a store query or manage any store item attributes using the *setItemAttr()*
and *getItemAttr()* methods. Some of the Store Model API functions are:

* check(), uncheck()
* getItemAttr(), setItemAttr()
* fetchItem(), fetchItemsWithChecked()
* addReference(), removeReference()

<h2 id="checkbox-tree-demos">CheckBox Tree Demos</h2>
The cbtree packages comes with a set of demos and unit tests each demonstrating
the CheckBox Tree features and capabilities. A comprehensive [live demo](http://thejekels.com/cbtree/demos)
is also available at:

* [http://thejekels.com/cbtree/demos](http://thejekels.com/cbtree/demos)

<h2 id="basics">CheckBox Tree Documentation</h2>
The CheckBox Tree documentation set consists of the following documents located
in the /documentation directory.

* The CheckBox Tree
* Tree Styling and Icons
* CheckBox Tree Store Models
* Store Models API
* The File Store

Note: All documentation is written using the [markdown](http://daringfireball.net/projects/markdown/)
format.

<h2 id="checkbox-tree-downloads">Checkbox Tree Downloads</h2>
The github repository cbtree represents the current development stage of the CheckBox
Tree project, also known as the incubation stage. It may contain new, untested and undocumented
features that are not included in any stable build. No warrenty is provided that such
features will be included in a later release. 

To get the latest stable version please visit the [download](https://github.com/pjekel/cbtree/downloads)
section:


<table style="width:100%">
  <tbody>
	<thead>
	  <tr>
	    <th style="width:15%;">Version</th>
	    <th style="width:15%;">Date</th>
	    <th style="width:10%;">dojo</th>
	    <th>Description</th>
	  </tr>
	</thead>
    <tr style="vertical-align:top">
      <td>cbtree-v09.2-0</td>
      <td>Aug-15 2012</td>
      <td>1.8</td>
      <td>
		Updated The CheckBox Tree to work with dojo 1.8.<br/>
		Official release File Store and File Store Model.<br/>
		Per store item read-only checkboxes.<br/>
		New declarative demos added.<br/>
		Updated documentation.<br/>
      <td>
    </tr>
    <tr style="vertical-align:top">
      <td>cbtree-v09.1-0</td>
      <td>Aug-06 2012</td>
      <td>1.7</td>
      <td>
		A new File Store and File Store Model have been added.<br/>
		New and updated demos.<br/>
		Updated documentation.<br/>
		Minor software updates.
      <td>
    </tr>
    <tr style="vertical-align:top">
      <td>cbtree-v09.0-0</td>
      <td>May-20 2012</td>
      <td>1.7</td>
      <td>Initial cbtree-AMD release</td>
    </tr>
  </tbody>
</table>


<h2 id="basics">CheckBox Tree Migration</h2>
The new CheckBox Tree implementation is a complete rewrite of the previous
[*Dijit Tree with Multi State Checkboxes*](http://thejekels.com/dojo/Dijit_Tree_MultiState_Chkbox.html), adding new
features, properties and API's. If you plan on migrating from the old tree to
this new implementation it is important you read all the documentation provided
as properties have been added, renamed and some properties have moved from the tree to
the model and vice versa.

