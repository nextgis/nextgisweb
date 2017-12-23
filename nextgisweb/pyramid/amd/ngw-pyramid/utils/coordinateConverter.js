define(function(){
    return {
        DDtoDMS: function(value, options){
            result = {
                dir : value<0?options.lon?'W':'S':options.lon?'E':'N',
                deg : parseInt(value<0?value=-value:value),
                min : parseInt(value%1*60),
                sec : parseInt(value*60%1*60*100)/100
            };

            if (options.needString)
                result = result.deg+"°" + result.min + "'" + result.sec + "\"" + result.dir

            return result;
        },
        DDtoDM: function(value, options){
            result = {
                dir : value<0?options.lon?'W':'S':options.lon?'E':'N',
                deg : parseInt(value<0?value=-value:value),
                min : parseInt(value%1*60*100)/100,
            };

            if (options.needString)
                result = result.deg+"°" + result.min + "'" + result.dir

            return result;
        }
    };
});