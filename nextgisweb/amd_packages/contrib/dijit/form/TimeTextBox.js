//>>built
define("dijit/form/TimeTextBox",["dojo/_base/declare","dojo/keys","dojo/_base/lang","../_TimePicker","./_DateTimeTextBox"],function(_1,_2,_3,_4,_5){
var _6=_1("dijit.form.TimeTextBox",_5,{baseClass:"dijitTextBox dijitComboBox dijitTimeTextBox",popupClass:_4,_selector:"time",value:new Date(""),maxHeight:-1,openDropDown:function(_7){
this.inherited(arguments);
this.dropDown.on("input",_3.hitch(this,function(){
this.set("value",this.dropDown.get("value"),false);
}));
},_onInput:function(){
this.inherited(arguments);
var _8=this.get("displayedValue");
this.filterString=(_8&&!this.parse(_8,this.constraints))?_8.toLowerCase():"";
if(this._opened){
this.closeDropDown();
}
this.openDropDown();
}});
return _6;
});
