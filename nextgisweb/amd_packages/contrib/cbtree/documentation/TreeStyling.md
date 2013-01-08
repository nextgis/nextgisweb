# Tree Styling & Icons#
The CheckBox Tree comes with a simple TreeStyling API which is loaded as a separate
tree extension. The Tree Styling API allows you to dynamically manage tree node icons,
labels and row styling either for the entire tree or on a per data item basis. 

NOTE: The Tree Styling API is not limited to the CheckBox Tree but can also be used
with the default dijit tree.

### Loading Tree Styling API ###
The Tree Styling API is implemented as an extension to the CheckBox Tree and as such
needs to be loaded as a separate module. The following sample demonstrates how
to load the Tree Styling API.

    require(["dojo/data/ItemFileWriteStore", 
             "cbtree/Tree",
             "cbtree/TreeStyling",           /* Load Tree Styling */
             "cbtree/model/TreeStoreModel"], 
      function( ItemFileWriteStore, Tree, TreeStyling, TreeStoreModel ) {
                    ...
      }
    );

You can test the availability of the Tree Styling API using the command `has("cbtree-treeStyling-API")`
. For example:

    require(["dojo/has",
                ...
            ], 
      function( has, ... ) {
        if (has("cbtree-treeStyling-API")) {
          myTree.set('icon', {iconClass:'myIcons', indent: false});
        }
      }
      
<h2 id="the-styling-api">The Styling API</h2>
The API has two simple to use accessors to get or set styling properties:

      set(/*String*/ propertyName, /*String|Object*/ newValue, /*data.item?*/ item)
      
                         and
                         
      get(/*String*/ propertyName, /*data.item?*/ item)

For both methods the *item* parameter is optional. A data.item can represent almost
anything and depends on the type of model associated with the tree. If for example
the model is one of the store models a data.item represents an item in a
dojo.data.store.

<h3 id="styling-properties">Styling Properties</h3>
Whenever the Tree Styling API is loaded the CheckBox Tree gets one more public 
property:

#### icon: ####
> String or Object (null), set the default icon set for the CheckBox Tree.
> see [icon properties](#icon-properties) for more details.

*****************************
Styling can be applied to icons, labels and rows at the tree level or on a per store
item basis. Each of those tree node elements have two basic properties:

1. Class
2. Style

The property names supported are the basic properties, that is, 'Class' or 'Style'
prefixed with the tree node element name ('icon', 'label' or 'row'). As a result
the following property names are available:

- iconClass
- iconStyle
- labelClass
- labelStyle
- rowClass
- rowStyle

The style properties iconStyle, labelStyle and rowStyle are objects with a set
of JavaScript 'property name: value' pairs suitable for the input to `domStyle.set()`
for example:

      {color:'red', border:'solid'}

*****************************
#### get( propertyName, item ) ####

*propertyName*: String  
> The name of the styling property.  

*item*: data.item (optional) 
> A data item. if the item argument is omitted the property of the tree is retrieved.

*returns*:  
> Returns a string if the property refers to a 'Class' property otherwise an object.

##### Examples #####

      get('iconClass', item)
      get('labelStyle', item)
      get('labelStyle')
      
*****************************
#### set( propertyName, newValue, item ) ####

*propertyName*: String  
> The name of the styling property.  

*newValue*: String|Object  
> The new value to be assigned to the property.  

*item*: data.item (optional) 
> A data item. if the item argument is omitted the property of the tree is set.

*returns*:  
> Returns argument *newValue*  

##### Examples #####

       set('labelStyle', {color:'red'}, item)
       set('labelStyle', {color:'red'})
       set('icon', {iconClass:'myIcons', indent: false}, item);
       set('icon', 'myIcons')

<h2 id="custom-icons">Custom Icons</h2>
### Adding custom icons to the CheckBox Tree ###
The Tree Styling API provides different methods to add custom icons to your CheckBox Tree.

1. Using the trees *icon* property in which case you can set the default icons for the entire tree.
2. Using the API function *set()* allowing you to set the icons for the entire tree or for individual
   data items.
3. As a property of a data item

In order to add custom icons to the CheckBox or Dijit Tree the following items are required:

1. An image sprite containing at least three icon types:
  
   0. Terminal
   1. Collapsed
   2. Expanded

2.  A css file defining the icon class. If you want to create multiple custom
    icon sets it is recommended to create a 'master' css file which imports the
    individual css files. As an example: /cbtree/icons/cbtreeIcons.css is the
    default master css file.
      
3.  A link in your HTML file to the master css file, that is, if you are using
    multiple icon classes otherwise a link to your dedicated css file. For
    example:
  
  
      `<link rel="stylesheet" href="../cbtree/icons/cbtreeIcons.css" />`
            
                        OR

      `<link rel="stylesheet" href="../cbtree/icons/myIcons.css" />`

Alternatively you could import your css file in one of the theme related css file
used by cbtree. For example: claro.css, tundra.css located in one of the themes
related directories.

<h3 id="icon-properties">Icon Properties</h3>
The CheckBox Tree and Tree Styling API accept icons either as a string argument
or as an icon object. Icon objects have the following properties:

#### iconClass ####
> Required, the *iconClass* property identifies the css class of the icon. You
> can specify multiple class names if needed. 
> If multiple class names are specified the first in the list is used as the
> icons base class (see indent)
  
#### iconStyle ####
> Optional, the *iconStyle* property specifies the css style of the icon. The
> iconStyle is an object suitable for the input to `domStyle.set()` like `{border:'solid'}`
  
#### fixed ####
> Optional, an additional css class name. If set, the *indent* property is
> ignored and the class names for the icon are always the icon properties:
> *iconClass* + *fixed* regardless of the indent level of the tree node.
  
#### indent ####
> Optional, a boolean or integer specifying if an additional class name is
> generated depending on the indent level of a tree node. If *true* (default),
> the additional class name is generated as follows: 
  
    className = baseClass + ('Expanded'|'Collapsed'|'Terminal') + '_' + indentLevel
  
If the *indent* property is specified as an integer its value signifies the maximum
indent depth for which the additional class name is generated. For any indent depth
greater than the indent value no additional class name is generated.

##### Examples #####

    icon = { iconClass:'myIcons', iconStyle:{border:'solid'}, fixed:'myIconNode', indent:false};
    icon = { iconClass:'myIcons', indent:'3' };
    icon = { iconClass:'myIcons' }
    icon = 'myIcons'

If the icon is a string argument, as in the last example, the Tree Styling API will
automatically convert it to an icon object like: `{ iconClass:'myIcons', indent: true}`

### The CSS file content. ###
    
Assuming you are creating the css file for the css class name 'myIcons' and each of the
icon bitmaps is 16 pixels wide, the basic (minimal) css file MUST look like:

      .myIcons {
        background-image: url('images/myIcons.gif');
        background-repeat: no-repeat;
      }

      .myIcons.myIconsTerminal {
        background-position: -0px;
      }

      .myIcons.myIconsCollapsed {
        background-position: -16px;
      }

      .myIcons.myIconsExpanded {
        background-position: -32px;
      }

*NOTE:* There is **NO** white space between the css class names.

### Creating the Checkbox Tree ###
    
To create the tree with a default set of icons the icon property of the tree must be
set accordingly:

      icon: { iconClass: "myIcons", indent: false },

Example:

      <link rel="stylesheet" href="../cbtree/icons/myIcons.css" />
                        ...
      <script>
        require(["dojo/data/ItemFileWriteStore", 
                 "cbtree/Tree",
                 "cbtree/TreeStyling",
                 "cbtree/model/TreeStoreModel"], 
          function( ItemFileWriteStore, Tree, TreeStyling, TreeStoreModel ) {

            var store = new ItemFileWriteStore( { url: "myFamilyTree.json" });
            var model = new TreeStoreModel( {
                    store: store,
                    query: {type: 'parent'},
                    rootLabel: 'The Family',
                        ...
                    }); 

            var tree = new Tree( {
                    model: model,
                    id: "MenuTree",
                    icon: { iconClass: "myIcons", indent: false },
                        ...
                    });
      </script>

### Icon as a data item property ###

In addition to setting the trees *icon* property or using the API *set()* function
you can also set the *iconAttr* property of the store model. If set, the *iconAttr*
identifies a property of a data item as being an icon class. When the iconAttr of
the model is set, a tree node, as part of its creation, will test if a data
item has the property set and, if so, passes its value to the tree in which case
it becomes the default icon class for the given data item. 

For example, if you create a JSON store item as follows:

    { name:"Lisa", checked:true, icon:"myIcon" }
    
You could create your model as follows:

	var model = new TreeStoreModel( {
			store: store,
			query: {type: 'parent'},
			rootLabel: 'The Family',
			iconAttr:'icon',
				...
			}); 

In the above example the store model is told that the data item property *icon* needs
to be handled as the icon class for a given store item. Also, any store updates
to the specified property of the data item will be treated by the tree as an
update to the items icon.

### Multi Level Icons ###
    
In addition to the basic configuration described above, the CheckBox Tree
also allows for the use of different icons depending on the tree node indent
level. Whenever the icon property 'indent' is true the CheckBox Tree adds an
additional css class for each icon which is the iconClass suffixed with the
current indent level. For example: assuming your icon class is still 
'myIcons' and an expanded icon is located at indent level 1 the following
css classes are set for the iconNode:

1. myIcons 
2. myIconsExpanded
3. myIconsExpanded_1

Add at least one more icon to your sprite (e.g icon (3)) and add the following
to your css file.
    
	  .myIcons.myIconsTerminal_1,
	  .myIcons.myIconsCollapsed_1,
	  .myIcons.myIconsExpanded_1 {
		background-position: -48px;
	  }

Now create the tree with the icon property *ident* set to true (default):
  
      var myTree = new Tree( {
              model: model,
              id: "MenuTree",
              icon: { iconClass: "myIcons", indent: true },
                  ...
              });

or, set it dynamically after tree creation:

      myTree.set('icon', { iconClass: 'myIcons' })

              or simply:
      
      myTree.set('icon', 'myIcons' })

Demo application '/cbtree/demos/tree02.html' demonstrates the implementation and
use of multi level icons.

## Sample Application ##
************************
The following sample application demonstrates some of the Tree Styling API features.

    <!DOCTYPE html>
    <html>
      <head> 
        <meta charset="utf-8">
        <title>Dijit Tree with Checkboxes</title>     
        <style type="text/css">
          @import "../../dijit/themes/claro/claro.css";
          @import "../themes/claro/claro.css";
        </style>

        <script type="text/javascript">
          var dojoConfig = {
                async: true,
                parseOnLoad: true,
                isDebug: false,
                baseUrl: "../../",
                packages: [
                  { name: "dojo",  location: "dojo" },
                  { name: "dijit", location: "dijit" },
                  { name: "cbtree",location: "cbtree" }
                ]
          };
        </script>

        <script type="text/javascript" src="../../dojo/dojo.js"></script> 
        <script type="text/javascript">
          require([
            "dojo/_base/connect",
            "dojo/data/ItemFileWriteStore",
            "dojo/ready",
            "cbtree/Tree",                    // Checkbox tree
            "cbtree/TreeStyling",             // Tree styling extensions
            "cbtree/models/ForestStoreModel"  // ForestStoreModel
            ], function( connect, ItemFileWriteStore, ready, Tree, TreeStyling, ForestStoreModel) {

              var store, model, tree;
              
              function checkBoxClicked( item, nodeWidget, evt ) {
                var newState = nodeWidget.get("checked" );
                var label    = this.getLabel(item);
                
                if( newState ) {
                  tree.set("iconStyle", {border:"solid"}, item );
                  tree.set("labelStyle",{color:"red"}, item );
                } else {
                  tree.set("iconStyle", {border:"none"}, item );
                  tree.set("labelStyle",{color:"black"}, item );
                }
                alert( "The new state for " + label + " is: " + newState );
              }

              store = new ItemFileWriteStore( { url: "../datastore/Family-1.7.json" });
              model = new ForestStoreModel( {
                        store: store,
                        query: {type: 'parent'},
                        rootLabel: 'The Family',
                        checkedRoot: true,
                        checkedState: true
                      }); 

              ready(function() {
                tree = new Tree( {
                          model: model,
                          id: "MenuTree",
                          branchReadOnly: false,
                          branchIcons: true,
                          nodeIcons: true
                        }, "CheckboxTree" );
                connect.connect( tree, "onCheckBoxClick", model, checkBoxClicked );
                tree.startup();
              });
            });
        </script>

      </head>
        
      <body class="claro">
        <h1 class="DemoTitle">Dijit Tree with Multi State CheckBoxes</h1>
        <div id="CheckboxTree">  
        </div>
        <h2>Click a checkbox</h2>
      </body> 
    </html>
    
The following is the same sample application but this time we instantiate the
store, model and tree declarative:

    <!DOCTYPE html>
    <html>
      <head> 
        <meta charset="utf-8">
        <title>Dijit Tree with Checkboxes</title>     
        <style type="text/css">
          @import "../../dijit/themes/claro/claro.css";
          @import "../themes/claro/claro.css";
        </style>

        <script type="text/javascript">
          var dojoConfig = {
                async: true,
                parseOnLoad: true,
                isDebug: false,
                baseUrl: "../../",
                packages: [
                  { name: "dojo",  location: "dojo" },
                  { name: "dijit", location: "dijit" },
                  { name: "cbtree",location: "cbtree" }
                ]
          };
        </script>

        <script type="text/javascript" src="../../dojo/dojo.js"></script> 
        <script type="text/javascript">
          require([
            "dojo/data/ItemFileWriteStore",
            "dojo/parser",                    // dojo parser
            "cbtree/Tree",                    // Checkbox tree
            "cbtree/TreeStyling",             // Tree styling extensions
            "cbtree/models/ForestStoreModel"  // ForestStoreModel
          ]);

          function checkBoxClicked( item, nodeWidget, evt ) {
            var newState = nodeWidget.get("checked" );
            var label    = this.getLabel(item);
            
            if( newState ) {
              this.set("iconStyle", {border:"solid"}, item );
              this.set("labelStyle",{color:"red"}, item );
            } else {
              this.set("iconStyle", {border:"none"}, item );
              this.set("labelStyle",{color:"black"}, item );
            }
            alert( "The new state for " + label + " is: " + newState );
          }
        </script>

      </head>
        
      <body class="claro">
        <h1 class="DemoTitle">Dijit Tree with Multi State CheckBoxes</h1>
        <div id="content">
          <div data-dojo-id="store" data-dojo-type="dojo/data/ItemFileWriteStore" 
            data-dojo-props='url:"../datastore/Family-1.7.json"'>
          </div>
          <div data-dojo-id="model" data-dojo-type="cbtree/models/ForestStoreModel"
            data-dojo-props='store:store, query:{type:"parent"}, rootLabel:"The Family"'>
          </div>
          <div data-dojo-id="tree", data-dojo-type="cbtree/Tree" data-dojo-props='model:model, 
            onCheckBoxClick: checkBoxClicked, id:"tree"'>
          </div>
        </div>
        <h2>Click a checkbox</h2>
      </body> 
    </html>