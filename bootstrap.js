const {classes: Cc, interfaces: Ci, manager: Cm, utils: Cu} = Components;
const global = this;
const KOALA_SCRIPTS = ["tracker", "utils", "tagger"];

Cu.import("resource://gre/modules/AddonManager.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://services-sync/util.js");

const EdContract = "@mozilla.org/network/protocol/about;1?what=ed";
const EdDescription = "About Ed";
const EdUUID = Components.ID("6b20c507-9257-40c3-aa7c-ac7d63cc6719");

// Create a factory that gives the about:ed service
let EdFactory = {
  createInstance: function(outer, iid) {
    if (outer != null)
      throw Cr.NS_ERROR_NO_AGGREGATION;
    return AboutEd.QueryInterface(iid);
  }
};

// Implement about:ed
let AboutEd = {
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),

  getURIFlags: function(aURI) {
    return 0;
  },

  newChannel: function(aURI) {
    let fileURI = global.aboutURI;
    Cu.reportError(fileURI);
    return Services.io.newChannelFromURI(fileURI);
  }
};



function watchWindows(callback) {
  // Wrap the callback in a function that ignores failures
  function watcher(window) {
    try {
      callback(window);
    }
    catch(ex) {}
  }

  // Wait for the window to finish loading before running the callback
  function runOnLoad(window) {
    // Listen for one load event before checking the window type
    window.addEventListener("load", function() {
      window.removeEventListener("load", arguments.callee, false);

      // Now that the window has loaded, only handle browser windows
      let doc = window.document.documentElement;
      if (doc.getAttribute("windowtype") == "navigator:browser")
        watcher(window);
    }, false);
  }

  // Add functionality to existing windows
  let browserWindows = Services.wm.getEnumerator("navigator:browser");
  while (browserWindows.hasMoreElements()) {
    // Only run the watcher immediately if the browser is completely loaded
    let browserWindow = browserWindows.getNext();
    if (browserWindow.document.readyState == "complete")
      watcher(browserWindow);
    // Wait for the window to load before continuing
    else
      runOnLoad(browserWindow);
  }

  // Watch for new browser windows opening then wait for it to load
  function windowWatcher(subject, topic) {
    if (topic == "domwindowopened")
      runOnLoad(subject);
  }
  Services.ww.registerNotification(windowWatcher);

  // Make sure to stop watching for windows if we're unloading
  unload(function() Services.ww.unregisterNotification(windowWatcher));
}

/**
 * Save callbacks to run when unloading. Optionally scope the callback to a
 * container, e.g., window. Provide a way to run all the callbacks.
 *
 * @usage unload(): Run all callbacks and release them.
 *
 * @usage unload(callback): Add a callback to run on unload.
 * @param [function] callback: 0-parameter function to call on unload.
 * @return [function]: A 0-parameter function that undoes adding the callback.
 *
 * @usage unload(callback, container) Add a scoped callback to run on unload.
 * @param [function] callback: 0-parameter function to call on unload.
 * @param [node] container: Remove the callback when this container unloads.
 * @return [function]: A 0-parameter function that undoes adding the callback.
 */
function unload(callback, container) {
  // Initialize the array of unloaders on the first usage
  let unloaders = unload.unloaders;
  if (unloaders == null)
    unloaders = unload.unloaders = [];

  // Calling with no arguments runs all the unloader callbacks
  if (callback == null) {
    unloaders.slice().forEach(function(unloader) unloader());
    unloaders.length = 0;
    return;
  }

  // The callback is bound to the lifetime of the container if we have one
  if (container != null) {
    // Remove the unloader when the container unloads
    container.addEventListener("unload", removeUnloader, false);

    // Wrap the callback to additionally remove the unload listener
    let origCallback = callback;
    callback = function() {
      container.removeEventListener("unload", removeUnloader, false);
      origCallback();
    }
  }

  // Wrap the callback in a function that ignores failures
  function unloader() {
    try {
      callback();
    }
    catch(ex) {}
  }
  unloaders.push(unloader);

  // Provide a way to remove the unloader
  function removeUnloader() {
    let index = unloaders.indexOf(unloader);
    if (index != -1)
      unloaders.splice(index, 1);
  }
  return removeUnloader;
}

function listenBrowser(window) {
  let tracker = new KoalaTracker(window);
  unload(function() {
    tracker.terminate(window);
  }, window);
}



function startup(data, reason) {
  global.APP_ID = data.id;
  Cu.reportError("Koala startup");
  AddonManager.getAddonByID(data.id, function(addon) {
    // Load various javascript includes for helper functions
    KOALA_SCRIPTS.forEach(function(fileName) {
      let fileURI = addon.getResourceURI("scripts/" + fileName + ".js");
      Services.scriptloader.loadSubScript(fileURI.spec, global);
    });
    global.aboutURI = addon.getResourceURI("content/about.html");
  watchWindows(listenBrowser);
  });
  Cm.QueryInterface(Ci.nsIComponentRegistrar).
    registerFactory(EdUUID, EdDescription, EdContract, EdFactory);
}

function shutdown(data, reason) {
  Cu.reportError("koala shutdown");
  if (reason != APP_SHUTDOWN) {
    unload();
  }
  Cm.QueryInterface(Ci.nsIComponentRegistrar).
    unregisterFactory(EdUUID, EdFactory);

}

function install(data, reason) {

}

function uninstall(data, reason) {

}
