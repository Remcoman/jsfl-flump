/**
 * Wanted: someone who understands motion object xml
 */
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
            var timeMapJSON = {strength : parseInt(timeMapXML.@strength, 10), type : timeMapXML.@type.toString()};
            timeMapArray.push(timeMapJSON);
        }
    }

    var splitAttribute = function (attr) {
        return attr.split(",").map(function (value) {
            return parseFloat(value);
        });
    }

	var absoluteTime = function (time, totalDuration) {
		return time / totalDuration;
	}

    var writePoints = function (pointsArray, keyframeXMLList, totalDuration) {
        for each(var keyFrameXML in keyframeXMLList) {
			var timeValue = parseInt(keyFrameXML.@timevalue, 10);

			var prev = splitAttribute(keyFrameXML.@previous);
			prev[0] = absoluteTime(prev[0] + timeValue, totalDuration);
			pointsArray.push({x : prev[0], y : prev[1]});

			var next = splitAttribute(keyFrameXML.@next);
			next[0] = absoluteTime(next[0] + timeValue, totalDuration);
			pointsArray.push({x : next[0], y : next[1]});
        }
    }

    var writeProperties = function (propertyArray, propertyXMLList, totalDuration) {
        for each(var propertyXML in propertyXMLList) {
            var propName = idToProperty[propertyXML.@id.toString()];
            if(!propName) {
				continue;
			}

			var propJSON = {name : propName, points : []};

			if(propertyXML.hasOwnProperty("@TimeMapIndex")) {
				propJSON.timeMap = parseInt(propertyXML.@TimeMapIndex, 10);
			}

			writePoints(propJSON.points, propertyXML.Keyframe, totalDuration);

			propertyArray.push(propJSON);
        }
    }

    return function (frame) {
		var xml = new XML(frame.getMotionObjectXML());

        var json = {
            timeMaps : [],
			properties : []
        };

		var duration = parseInt(xml.@duration, 10) - 1000;

        writeTimeMaps(json.timeMaps, xml.TimeMap);
        writeProperties(json.properties, xml..Property, duration);

        return json;
    }
})();