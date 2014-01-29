define([
    "dojo/_base/declare",
    "dijit/_WidgetBase"
], function (
    declare,
    _WidgetBase
) {
	// Базовый класс для виджета привязанного к модели
    return declare([_WidgetBase], {

        // Виджет содержит значимую информацию, которую
        // по возможности стоит показать пользователю
        hasData: function() {
            return true;
        }
    });
});
