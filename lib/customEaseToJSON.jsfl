/**
 * Created by remco on 23/09/15.
 */

var customEaseToJSON = (function () {

    var propertyMap = {
        position : "position",
        rotation : "rotation",
        scale    : "scale",
        color    : "alpha"
    }

    return function (frame) {
        var propertyArray = [];

        if(frame.useSingleEaseCurve) {
            //we chop of the first and the last because they are always the same
            var points = frame.getCustomEase("all").slice(1, -1);
            for(var prop in propertyMap) {
                propertyArray.push({name : propertyMap[prop], points : points});
            }
        }
        else {
            for(var prop in propertyMap) {
                propertyArray.push({name : propertyMap[prop], points : frame.getCustomEase(prop).slice(1, -1)});
            }
        }

        return propertyArray;
    }
})();