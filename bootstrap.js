const {classes: Cc, interfaces: Ci, manager: Cm, utils: Cu} = Components;
const global = this;
const KOALA_SCRIPTS = ["tracker", "utils", "tagger", "dashboard", "grandcentral"];

Cu.import("resource://gre/modules/AddonManager.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://services-sync/util.js");

const NS_XUL = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const keysetID = "koala-keyset";
const keyID = "K:Koala";
const fileMenuitemID = "menu_FileKoalaItem";
var XUL_APP = {name: Services.appinfo.name};


function addMenuItem(win) {
  var $ = function(id) win.document.getElementById(id);

  function removeMI() {
    var menuitem = $(fileMenuitemID);
    menuitem && menuitem.parentNode.removeChild(menuitem);
  }
  removeMI();

  // add the new menuitem to File menu
  let (koalaMI = win.document.createElementNS(NS_XUL, "menuitem")) {
    koalaMI.setAttribute("id", fileMenuitemID);
    koalaMI.setAttribute("class", "menuitem-iconic");
    koalaMI.setAttribute("label", "Koala Dashboard");
    koalaMI.setAttribute("accesskey", "K");
    koalaMI.setAttribute("key", keyID);
    koalaMI.addEventListener("command", dashboard, true);

    $("menu_FilePopup").insertBefore(koalaMI, $("menu_FileQuitItem"));
  }

  unload(removeMI, win);
}

function dashboard() {
  Cu.reportError("load dashboard");
  let gBrowser = Services.wm.getMostRecentWindow("navigator:browser").gBrowser;
  

  AddonManager.getAddonByID(global.APP_ID, function(addon) {
    let fileURI = addon.getResourceURI("content/about.html");
    let tab = gBrowser.selectedTab = gBrowser.addTab(fileURI.resolve(""));
    tab.linkedBrowser.addEventListener("load", function() {
      tab.linkedBrowser.removeEventListener("load", arguments.callee, true);
      let doc = tab.linkedBrowser.contentDocument;
      let dashboard = new KoalaDashboard(doc);
    }, true);
  });
}

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
  try {addMenuItem(window);
  } catch (ex) {
    Cu.reportError(ex);
  }
  
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
  watchWindows(main, XUL_APP.winType);
  });
}

function main(win) {
  function $(id) doc.getElementById(id);
  function xul(type) doc.createElementNS(NS_XUL, type);
  let koalaKeyset = xul("keyset");
  koalaKeyset.setAttribute("id", keysetID);
  let (koalaKey = xul("key")) {
    koalaKey.setAttribute("id", keyID);
    koalaKey.setAttribute("key", "K");
    koalaKey.setAttribute("modifiers", "accel,alt");
    koalaKey.setAttribute("oncommand", "void(0);");
    koalaKey.addEventListener("command", dashboard, true);
    $(XUL_APP.baseKeyset).parentNode, appendChild(koalaKeyset).appendChild(koalaKey);
  };

};

function shutdown(data, reason) {
  Cu.reportError("koala shutdown");
  if (reason != APP_SHUTDOWN) {
    unload();
  }
}

function install(data, reason) {

}

function uninstall(data, reason) {

}
