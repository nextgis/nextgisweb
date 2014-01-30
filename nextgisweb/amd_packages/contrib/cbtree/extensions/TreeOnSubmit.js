//
// Copyright (c) 2010-2013, Peter Jekel
// All rights reserved.
//
//	The Checkbox Tree (cbtree) is released under to following three licenses:
//
//	1 - BSD 2-Clause				(http://thejekels.com/cbtree/LICENSE)
//	2 - The "New" BSD License		(http://trac.dojotoolkit.org/browser/dojo/trunk/LICENSE#L13)
//	3 - The Academic Free License	(http://trac.dojotoolkit.org/browser/dojo/trunk/LICENSE#L43)
//
define(["dojo/json", "dojo/when", "../Tree"], function (JSON, when, CBTree) {
	"use strict";
	// module
	//		cbtree/extension/TreeOnSubmit
	// description
	//		This module extends the Checkbox Tree by overwriting the onSubmit()
	//		EventListener.

	function getSummary(tree, checked) {
		// summary:
		//		Return an array of all objects matching the checked state.
		// tree: CBTree
		//		Instance of a Checkbox Tree
		// checked: (Boolean | String)?
		//		If specified, only store objects matching the checked state will
		//		be returned, otherwise all store objects are returned.
		// return: array<Object>
		//		An array of objects. Each object represents a store object that
		//		matches the checked state. The object returned only hold a subset
		//		of the actual store object properties.
		// tag:
		//		private
		var model = tree.model;
		var attr  = model.checkedAttr;
		var store = model.store;
		var query = {};

		if (attr && checked !== undefined) {
			query[attr] = checked;
		}

		return when(store.query(query),
			function (results) {
				results = results.map(function (item) {
					return {
						id: store.getIdentity(item),
						value: model.getLabel(item),
						checked: (attr ? (item[attr] || model.checkedState) : undefined)
					};
				});
				if (model._forest) {
					results.shift({
						id: model.root.id,
						value: model.rootLabel,
						checked: model.root[attr],
						virtual: true
					});
				}
				return results;
			},
			function (err) {
				throw err;
			}
		);
	}

	function getItems(tree, checked, domOnly) {
		// summary:
		//		Return an array of all objects matching the checked state. Depending
		//		on the domOnly parameters, the objects are collected from the store
		//		associated with the tree model or the CheckBox Tree (visible objects
		//		only).
		// tree: CBTree
		//		Instance of a Checkbox Tree
		// checked: (Boolean | String)?
		//		If specified, only store objects matching the checked state will
		//		be returned, otherwise all store objects are returned.
		// domOnly: Boolean?
		//		If true, only store objects associated with visible tree nodes will
		//		be returned.
		// return: array<Object>
		//		An array of objects. Each object represents a store object that
		//		matches the checked state. The object returned only hold a subset
		//		of the actual store object properties.
		// tag:
		//		private
		var id, item, items = [], node, nodes;

		// If the model doesn't have store, downgrade to DOM only.
		domOnly = tree.model.store ? !!domOnly : true;

		if (!domOnly) {
			items = getSummary(tree, checked).map(function (item) {
				nodes = tree._itemNodesMap[item.id];
				item.count = nodes ? nodes.length : 0;
				return item;
			});
		} else {
			for (id in tree._itemNodesMap) {
				nodes = tree._itemNodesMap[id];
				node  = nodes[0];
				item = {
					id: id,
					value: node.label,
					checked: (node._checkBox ? node._checkBox.checked : undefined),
					count: nodes.length
				};
				items.push(item);
			}
		}
		return items;
	}

	return CBTree.extend({
		// _haseOnSubmit: Boolean
		_hasOnSubmit: true,

		onSubmit: function (formNode, treeWidget, evt) {
			// summary:
			//		This method is called when the submit button in the document
			//		is clicked and the tree is part of a form. If the tree property
			//		'attachToForm' is set, the checked states of the store items are
			//		collected and attached to the trees parent form as a hidden element.
			// formNode: DOMnode
			//		DOM node associated with the <form ... > element.
			// treeWidget: CBTree
			// evt: Event (submit)
			// returns: Boolean
			// tag:
			//		EventListener
			var domOnly = false, name = "checkedStates", checked;
			var hiddenNode, storeItems;

			// Don't bother ff the event is already canceled.
			if (formNode && !evt.defaultPrevented) {
				if (this.attachToForm && typeof this.attachToForm === "object") {
					checked = this.attachToForm.checked;
					domOnly = this.attachToForm.domOnly || false;
					name    = this.attachToForm.name || name;

					storeItems = getItems(this, checked, domOnly);
					hiddenNode = formNode.children.namedItem(name);
					if (!hiddenNode) {
						hiddenNode = document.createElement("INPUT");
						hiddenNode.setAttribute("type", "hidden");
						hiddenNode.setAttribute("name", name);
						formNode.appendChild(hiddenNode);
					}
					hiddenNode.setAttribute("value", JSON.stringify(storeItems));
				}
			}
			return !evt.defaultPrevented;
		}
	});
});
