# cbtree 0.9.4
### Enhancements:
* The HTML tree node elements with class **_dijitTreeRow_** now have an additional attribute
**_expandable_** making it easy to distinguish between tree branches and tree leafs.
The **_expandable_** attribute value is either "true" or "false"

```html
<div class="dijitTreeRow" expandable="true" role="presentation" ... >
```

As a result you can now use css selectors like:

```html
<style type="text/css">
	.dijitTreeRow[expandable="true"] .dijitTreeLabel {
		background-color: yellow;
	}
	.dijitTreeRow[expandable="false"] .dijitTreeIcon {
		border-style: solid;
		border-width: 2px;
	}
</style>
```

### New Features:
* A new tree extension **_TreeOnSubmit_** and associated tree property **_attachToForm_**
have been added. This new extension and property aid in the submission of HTML forms that
include a CheckBox Tree. The extension can be found in the `cbtree/extension` directory.
For a detailed description and examples please refer to the Wiki usage section
[Checkboxes in HTML forms](https://github.com/pjekel/cbtree/wiki/CheckBox-Tree-Usage#checkboxes-in-html-forms)
and dedicated Wiki page
[Checkbox Tree in Forms](https://github.com/pjekel/cbtree/wiki/CheckBox-Tree-in-Forms)
* A new property, **_leafCheckBox_**, has been added to the tree. The **_leafCheckBox_**
property controls if checkboxes will be displayed for tree leafs. The default is `true`.
if set to `false` the leaf checkboxes will be hidden but still available for checking their
state.

### Bug Fixes:
None

### Known issues:
Please see the Github project page for any [open](https://github.com/pjekel/cbtree/issues?page=1&state=open)
issues.

# cbtree 0.9.3-3
### New Features:
* A new property, **_branchCheckBox_**, has been added to the tree. The **_branchCheckBox_**
property controls if checkboxes will be displayed for tree branches. The default is `true`.
if set to `false` the branch checkboxes will be hidden but still available for checking their
state.

* Tree Nodes can now be sorted using the new **_options_** property of the store models:
```javascript
var mySortOptions = {sort: [
    {attribute: "name", descending: true, ignoreCase: true},
    {attribute: "hair", ignoreCase: true},
    {attribute: "age"}
]};
var model = new TreeStoreModel( { store: store,
                                  query: {name: "Root"},
                                  options: {sort: mySortOptions}
                                });
```
For a detailed description of this new feature and the ABNF definition of the **_options_**
property please refer to the
[cbtree Wiki](https://github.com/pjekel/cbtree/wiki/CheckBox-Tree-Usage#sorting-tree-nodes)


### Bug Fixes:
* When the **_checkAttr_** property on the store model is set to anything other than the
default 'checked', both the expandChecked() and collapseUnChecked() method did not work
as documented. Issue #36: [expandChecked()](https://github.com/pjekel/cbtree/issues/36)

# cbtree 0.9.3-2

### Enhancements:
* The name of tree checkboxes will now default to the dijit generated checkbox id. This
will guarantee that any tree checkbox visible in a form will be included in a form submission.
See also the new properties **_openOnChecked_** and **_closeOnUnchecked_**.
* The TreeStyling extension now allows the wildcard character (*) to be used in icon object
properties when mapping values to icons.

### New Features:
* Two new properties have been added to the tree:
	1. openOnChecked
	2. closeOnUnchecked
* Two new functions have been added to the tree:
	1. expandChecked()
	2. collapseUnchecked()

Please refer to the wiki [documentation](https://github.com/pjekel/cbtree/wiki/CheckBox-Tree-API)
for a detailed description of the new features.

### Bug Fixes:
* When using an Observable store the tree/model/_base/BaseStoreModel class did not remove
obsolete Observers. Issue #28: [Observable vs Eventable store](https://github.com/pjekel/cbtree/issues/28)
* Icon styling provided with a mapped icon object was not applied. Issue #30:
[Mapping a property value to a specific icon object](https://github.com/pjekel/cbtree/issues/30)
* Root children always appeared as the last item when dragged and dropped. Issue: #31:
[DnD of root children](https://github.com/pjekel/cbtree/issues/31)

### Known issues:
Please see the Github project page for any [open](https://github.com/pjekel/cbtree/issues?page=1&state=open)
issues.
