var motionXMLToJSON = (function () {

    var idToProperty = {
        Motion_X : "x",
        Motion_Y : "y",
        Rotation_Z : "rotation",
        Skew_X : "skewX",
        Skew_Y : "skewY",
        Scale_X : "scaleX",
        Scale_Y : "scaleY"
    }

    var writeTimeMaps = function (timeMapArray, timeMapsXMLList) {
        for each (var timeMapXML in timeMapsXMLList) {
            var timeMapJSON = {strength : parseInt(timeMapXML.@strength, 10), type : timeMapXML.@type}
            timeMapArray.push(timeMapJSON);
        }
    }

    var splitAttribute = function (attr) {
        return attr.split(",").map(function (value) {
            return parseFloat(value);
        });
    }

    var writeKeyFrames = function (keyFrameArray, keyframeXMLList) {
        for each(var keyFrameXML in keyframeXMLList) {
            var kfJSON = {
                timeMap : parseInt(keyFrameXML.@TimeMapIndex, 10),
                anchor : splitAttribute(keyFrameXML.@anchor),
                prev : splitAttribute(keyFrameXML.@prev),
                next : splitAttribute(keyFrameXML.@next),
                timeValue : parseInt(keyFrameXML.@timevalue, 10)
            };

            keyFrameArray.push(kfJSON);
        }
    }

    var writeProperties = function (propertyMap, propertyXMLList) {
        for each(var propertyXML in propertyXMLList) {
            var propName = idToProperty[propertyXML.@id.toString()];
            if(propName) {
                var keyFrameArray = propertyMap[propName] = [];
                writeKeyFrames(keyFrameArray, propertyXML.Keyframe);
            }
        }
    }

    return function (xml) {
        var json = {
            timeScale : parseInt(xml.@TimeScale, 10),
            timeMaps : [],
            offset : [parseFloat(xml.metadata.Settings.@xformPtXOffsetPct), parseFloat(xml.metadata.Settings.@xformPtYOffsetPct)],
            properties : {}
        };

        writeTimeMaps(json.timeMaps, xml.TimeMap);
        writeProperties(json.properties, xml..Property);

        return json;
    }
})();