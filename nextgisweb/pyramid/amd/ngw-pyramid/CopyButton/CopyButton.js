define([
    'dojo/_base/declare',
    'ngw-pyramid/i18n!pyramid',
    'ngw-pyramid/hbs-i18n',
    'dojo/_base/lang',
    'dojo/dom-class',
    'dojo/on',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetBase',
    "dijit/Tooltip",
    "dojo/text!./CopyButton.hbs",
    'xstyle/css!./CopyButton.css'
], function (
    declare,
    i18n,
    hbsI18n,
    lang,
    domClass,
    on,
    _TemplatedMixin,
    _WidgetBase,
    Tooltip,
    template
) {
    return declare([_WidgetBase, _TemplatedMixin],{
        templateString: hbsI18n(template, i18n),
        target: undefined,
        targetAttribute: undefined,
        hintText: {
            current: i18n.gettext("Copy to clipboard"),
            variants: {
                start: i18n.gettext("Copy to clipboard"),
                success: i18n.gettext("Copied"),
                error: i18n.gettext("Unable to copy")
            }
        },
        _timer: undefined,
        constructor: function (options) {
            declare.safeMixin(this,options);
        },
        postCreate: function(){
            var widget = this;

            on(this.domNode, "mouseleave", lang.hitch(this, function(){
                if (this._timer) {
                    clearInterval(this._timer);
                    this.resetTooltip();
                }
            }));

            on(this.domNode, "click", lang.hitch(this, function(){
                this.copy();
            }));
        },
        copy: function(){
            var widget = this;

            this.targetInput.value = this.target["" + this.targetAttribute];
            this.targetInput.style.display = 'block';
            this.targetInput.select();

            try {
                document.execCommand('copy');
                widget.updateTooltip(widget.hintText.variants.success);
            } catch (err) {
                widget.updateTooltip(widget.hintText.variants.error);
            } finally {
                this.targetInput.style.display = 'none';
            }
            
        },
        updateTooltip: function(message){
            var widget = this;

            this.resetTooltip();
            if (this._timer) clearInterval(this._timer);
            this.hintText.current = message;

            domClass.add(this.domNode, "activated");
            Tooltip.show(message, this.domNode);

            this._timer = setTimeout(function(){
                widget.resetTooltip();
            }, 1200)
        },
        resetTooltip: function(){
            domClass.remove(this.domNode, "activated");
            Tooltip.hide(this.domNode);
        }
    });
});
