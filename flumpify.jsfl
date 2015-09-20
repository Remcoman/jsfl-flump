var included = {};
var include = function (file) {
	var uri = fl.scriptURI.split("/").slice(0, -1).join("/") + "/" + file;
	if(uri in included) {
		return;
	}
	
	included[uri] = true;
	
	try {
		fl.runScript(uri);
	}
	catch(e) {
		throw "Could not load " + uri + " from " + fl.scriptURI;
	}
}

include("lib/LibraryJSON.jsfl");
include("lib/SymbolBucket.jsfl");
include("lib/path.jsfl");
include("lib/FlumpSpriteSheetExporter.jsfl");

// Get the Document object of the currently active
// document (FLA file)
var doc = fl.getDocumentDOM();

doc.selectNone();

var outputName = path.basename(doc.name, ".fla");
var outputDir = "file:///Users/remcokrams/Documents/" + outputName;

// Clear the output panel 
fl.outputPanel.clear();

if(!FLfile.exists(outputDir)) {
	fl.trace("creating output folder");
	FLfile.createFolder(outputDir);
}

fl.trace("collecting symbols");
var symbolBucket = SymbolBucket.fromLibrary(doc.library);

if(!symbolBucket.isValid()) {
	fl.trace("No assets could be exported");
}

fl.trace("exporting spritesheet");
var exporter = new FlumpSpriteSheetExporter(doc);
exporter.export(symbolBucket, outputDir);

var lib = new LibraryJSON(doc);
lib.write(symbolBucket, exporter.frames);

FLfile.write(outputDir + "/library.json", lib.toJSON());