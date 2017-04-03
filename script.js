var gui = require('nw.gui');
var fs = require('fs');
var tray = null;

var path = require('path');
var appPath = path.dirname(process.execPath) + path.sep;

// Current window
var me = gui.Window.get();
// Name of file with current position of window, which will be stored before sessions
var settingsFileName = appPath + 'screenpos.json';
// A path to folder, where hints are stored
var hintFolderName = appPath + 'hints';
// A name of file, where picked hints should be stored
var pickedHintsFileName = appPath + 'pickedhints.json';
// Amount of days, after which hints could repeat
var repeatLimit = 30;



// Init syntax highlighting on load
hljs.initHighlightingOnLoad();


/**
 * http://stackoverflow.com/questions/2727167/getting-all-filenames-in-a-directory-with-node-js
 * Fetches list of files from directory, recursively
 * @param {String} a directory for getting files
 * @param {String[]} a list of other files
 * @return String[]
 */
function getFiles (dir, files){
	files = files || [];
	var readFiles = fs.readdirSync(dir);
	for (var i in readFiles){
		var name = dir + '/' + readFiles[i];
		if (fs.statSync(name).isDirectory()){
			getFiles(name, files);
		} else {
			files.push(name);
		}
	}
	return files;
}

/** Initializes icon in tray
 */ 
function initTrayIcon() {
	var tray = new gui.Tray({ title: 'Random Daily Hints', icon: 'icon.png' });
	var hidden = false;
	tray.on('click', function() {
		if (hidden) {
			hidden = false;
			me.show();
		} else {
			hidden = true;
			me.hide();
		}
	});
}

/** Saves current window positon into file
 */
function saveWindowPosition() {
	fs.writeFileSync(settingsFileName, JSON.stringify({'x' : me.x, 'y' : me.y}));
}

/** Exits application
 */
function exitApplication() {
	gui.App.closeAllWindows();
	me.close(true);
}

/**
 * Tries to load window position from file
 */
function tryLoadWindowPosition() {
	// Try load old position of window from a settings file
	if (fs.existsSync(settingsFileName)) {
		fs.readFile(settingsFileName, 'utf8', function(err, data) {
			if (err)
				return;
			try {
				var pos = JSON.parse(data);
				if (typeof pos == "object" && pos != null) {
					if (typeof pos["x"] == "number" && typeof pos["y"] == "number") {
						me.moveTo(pos["x"], pos["y"]);
					}
				}
			} catch(e) {
				console.log("Failed to load file: " + e.message);
			}
		});
	}
}

/**
 * Displays hint from data
 * @param {String} data a data
 */
function displayHint(data) {
	$("#content").html(data);
	$("#content pre code").each(function(i, block) { hljs.highlightBlock(block); });
	var script = $("#content script").toArray();
	for(var i = 0; i < script.length; i++) {
		try {
			eval($(script[i]).html());
		} catch (e) {
			console.log(e.message);
		}
	}
}

/**
 * Gets current time for comparison
 * @return {Number} a time
 */
function getTimeForComparison() {
	var d = new Date();
	d.setHours(0);
	d.setMinutes(0);
	d.setSeconds(0,0);
	return d.getTime();
}

/**
 *  Try to load already picked hints
 *  @return {String[]} list of picked hints
 */
function tryLoadAlreadyPickedHints() {
	try {
		var data = fs.readFileSync(pickedHintsFileName);
		var pos = JSON.parse(data);
		if (pos instanceof Array) {
			result = pos.filter(function(o) {
				if (o instanceof Array) {
					return o.length == 2;
				}
				return o;
			});
			return result;
		}
	} catch(e) {
		
	}
	
	// TODO: Implement
	return [];
}

/**
 *  Filters non-picked files
 *  @param {String[]} files List of all files
 *  @param {Array} alreadypicked Already picked files
 *  @return {String[]} non picked filed
 */ 
function filterOutAlreadyPickedFiles(files, alreadypicked) {
	var nonPickedFiles = files.filter(function(o) { 
		return typeof alreadypicked.find(function(picked) { return picked[1] == o; }) == "undefined";
	});
	return nonPickedFiles;
}

/**
 * Finds specified time in picked objects
 * If found returns file name, otherwise null
 * @param {Int} time a time to be found
 * @param {String[]} alreadypicked already picked files
 * @return {String|null} a file name, according to time or null if not found
 */
function findTimeInPicked(time, alreadypicked) {
	var entry = alreadypicked.find(function(o) { return o[0] == time; });
	if (typeof entry == "undefined") {
		return null;
	}
	return entry[1];
}

/**
 * Loads and display file with file name
 * @param {String} fileName a name of file
 */
function loadAndDisplayFile(fileName) {
	fs.readFile(fileName, 'utf8', function(err, data) {
		if (err)
			return;
		displayHint(data);
	});
}

/** Saves picked hints to file
 *  @param {Array} alreadypicked already picked hints
 */
function savePickedHints(alreadypicked) {
	fs.writeFileSync(pickedHintsFileName, JSON.stringify(alreadypicked));
}

/** Loads and display hint from main folder
 */
function loadAndDisplayHint() {
	var files = getFiles(hintFolderName, []);
	var alreadypicked = tryLoadAlreadyPickedHints();
	var time = getTimeForComparison();
	var displayedFileName = findTimeInPicked(time, alreadypicked);
	if (displayedFileName === null) {
		// If we have files to load, load them, otherwise do nothing
		if (files.length) {
			var originalFiles = [].concat(files);
			files = filterOutAlreadyPickedFiles(files, alreadypicked);
			// If we had shown previously all hints, just remove too old, set by repeatLimit, or remove oldest if repeatLimit is too large
			if (files.length == 0) {
				files = [].concat(originalFiles);
				if (alreadypicked.length < repeatLimit) {
					alreadypicked = alreadypicked.slice(1);
				} else {
					alreadypicked = alreadypicked.slice(alreadypicked.length - repeatLimit);
				}
				files = filterOutAlreadyPickedFiles(files, alreadypicked);
			}
			var position = parseInt(Math.random() * files.length);
			var fileName = files[position];
			loadAndDisplayFile(fileName);
			alreadypicked.push([time, fileName]);
			savePickedHints(alreadypicked);
		}
	} else {
		loadAndDisplayFile(displayedFileName);
	}
}