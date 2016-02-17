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

# Compatibility
This jsfl currently only works with Flash (Animate) CC. I tried to make it work with Flash CS6 but it mostly seemed to crash during spritesheet creation. 

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
    
The compact index points to an index in a separate "compactKeyframes" array (which is located in the layer). The compactKeyFrames array has the following elements:

- a bitwise number (marker) describing which properties are available for that keyframe. position=1, scale=2, skew=4, alpha=8. These are OR'ed together.
- x,y values if position is available
- scaleX, scaleY if scale is available
- skewX, skewY if skew is available
- alpha if alpha is available

# Retina support
You can enable retina support by adding baseScale and scaleFactor options to the flumpify.json file.
baseScale is determined by which scale you have used to author your assets. If you have authored the fla at twice its destined size then the baseScale should be 0.5.
scaleFactors determine which sizes are to be exported relative to the baseScale. The final sizes are determined by multiplying the baseScale by the scaleFactor

# flumpify.json
You can create a flumpify json at the same location as the fla. This json file has the following structure:

    {
        "baseDir"       : "The directory where the flump files are created. This setting replaces the dialog that appears everytime you export",
        "baseScale"     : 1,
        "scaleFactors"  : [1],
        "maxSize"       : 2048,
        "shapePadding"  : 2,
        "borderPadding" : 2
    }