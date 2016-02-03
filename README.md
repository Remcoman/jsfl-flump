# jsfl-flump
Convert Flash animations to Flump format using a jsfl Flash command. For more information about the Flump format please consult the official Flump github page.

# why jsfl-flump?
- The original Flump Adobe AIR app has not been updated for quite a while
- It's missing support for custom tweening and other advanced stuff
- It won't compile using the newest Adobe AIR SDK
- It has loads of very annoying bugs which i can't fix because i can't compile the Adobe AIR app

# how does it work?
- Open a FLA
- Run the flumpify command
- Profit!

# what's missing?
- A better way to handle motion guides & motion tween objects. Currently it writes just every frame.

# Compact keyframes
For motion guide layers every frame is written to the library.json. To prevent the json from becoming too large i use "compact keyframes" instead of normal "keyframes".
A normal keyframe looks like this:

    {
        "duration":10,
        "index":153,
        "ref":"balloon/green_balloon/green_balloon_loop",
        "loc":[50.635,-695.545],
        "scale":[0.6808,0.6808],
        "skew":[-0.0119,3.1297],
        "pivot":[-13.05,-111.4]
    }
    
A compact keyframe has the following structure:

    {
        "duration":4,
        "index":153,
        "ref":"balloon/green_balloon/green_balloon_loop",
        "loc":[50.635,-695.545],
        "scale":[0.6808,0.6808],
        "skew":[-0.0119,3.1297],
        "pivot":[-13.05,-111.4],
        "compactIndex":100
    }
    
The compact index points to an index in a seperate "compactKeyframes" array (which is located in the layer). The compactKeyFrames array has the following elements:

- a bitwise number (marker) describing which properties are available for that keyframe. position=1, scale=2, skew=4, alpha=8
- x,y values if position is available
- scaleX, scaleY if scale is available
- skewX, skewY if skew is available
- alpha if alpha is available

# Retina support
You can enable retina support by appending "@2x" to the fla filename (or changing the pixelRatio in the flumpify.json). The next step is to make sure that all assets in the fla are 2x the required size! 
Exporting a retina fla will result in the following actions:
- a bear directory will be created 
- a library.json will be created in the bear directory
- the image in the library.json will point to "bear@x.png". A frontend framework will have to parse this name and convert it to "bear@2x.png" or "bear.png" depending on the pixel ration of the device.
- 2 images will be created in the bear folder: "bear@2x.png" and "bear.png"

# flumpify.json
You can create a flumpify json at the same location as the fla. This json file has the following structure:

    {
        "baseDir" : "The directory where the flump files are created. This setting replaces the dialog that appears everytime you export",
        "pixelRatio" : "The pixel ratio of the fla file. This setting replaces the "@2x" fla filename suffix.
    }