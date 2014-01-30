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
define(function () {

	function IE8_Event(target, type, props, ieEventObject) {
		// summary:
		//		Create a DOM4 style event (remove with 2.0)
		// NOTE:
		//		THIS FUNCTION SHOULD ONLY BE USED WHEN RUNNING IE < 9
		this.target = target;
		this.currentTarget = target;
		this.eventPhase = 2;
		this.bubbles = !!(props && props.bubbles);
		this.cancelable = !!(props && props.cancelable);
		this.isTrusted = false;
		this.defaultPrevented = false;
		this.ieEventObject = ieEventObject;
		this.type = type;
		this.stopPropagation = this.stopImmediatePropagation = function () {
			ieEventObject.cancelBubble = true;
		};
		this.preventDefault = function () {
			ieEventObject.returnValue = false;
			this.defaultPrevented = true;
		};
	}

	return IE8_Event;
});	/* end define() */
