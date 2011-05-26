var GandalfTracker = function(window){
  
  Cu.reportError("Gandalf: Starting Tracker");
  let me = this;
  me.Cu = Components.utils;
  me.Cc = Components.classes;
  me.Ci = Components.interfaces;
  
  me.ACTION_MAP = {
    "click"    : 1,
    "scroll"   : 2,
    "select"   : 3,
    "mousemove": 4,
    "like"     : 5,
  };

  me.mouseMoveCounter = {};
  me.scrollCounter = {};
  window.addEventListener("click", function(e) { me.onClick(e); }, false);
  window.addEventListener("mouseup", function(e) { me.onMouseUp(e); }, false);
  window.addEventListener("scroll", function(e) {me.onScroll(e);}, false);
  window.addEventListener("mousemove", function(e) {me.onMouseMove(e);}, false);
  me.trackerTime = window.setInterval(function(){
    me.flushCounters(me.mouseMoveCounter, me.scrollCounter);
    me.mouseMoveCounter = {};
    me.scrollCounter = {};
  }, 10000);

  me.utils = new GandalfUtils();
  Cu.reportError("Gandalf: Tracker started");
};

GandalfTracker.prototype.getCurrentWindow = function() {
  return Services.wm.getMostRecentWindow("navigator:browser").gBrowser.contentWindow;
};

GandalfTracker.prototype.insertAction = function(url, type, time, anno, placeId) {
  let me = this;
  if (!placeId) {
    placeId = me.utils.getCurrentPlaceInfo()["place_id"];
  }
  let me = this;
  var annoString = "";
  /*
  if (anno) {
    var annoJSON = JSON.stringify(anno);
    annoString = global.btoa(annoJSON);
  }
  */
  var insertQuery = 'INSERT INTO moz_tracker(url, type, datetime, anno, place_id) ' +
                    'VALUES("'+url+'", "'+this.ACTION_MAP[type] + 
                    '", "' + time + 
                    '", "' + annoString +
                    '", "' + placeId +
                    '");';

  me.utils.processQuery({
    query: insertQuery,
  }, function() {});
};

GandalfTracker.prototype.onClick = function(e) {
  let me = this;
  let url = me.getCurrentWindow().location.href;
  let time = new Date().getTime();
  if (!e.target.innerHTML) {
    return;
  }
  let htmlString = e.target.innerHTML.toLowerCase();
  if (htmlString.length < 150 && htmlString.indexOf("like") > -1) {
    me.insertAction(url, "like", time, null);
  }
  me.insertAction(url, "click", time, e.target.toString());
};

GandalfTracker.prototype.onMouseUp = function(e) {
  var me = this;
  let selectedText = me.getCurrentWindow().getSelection();
  let url = me.getCurrentWindow().location.href;
  let time = new Date().getTime();
  if (!e.target.innerHTML) {
    return;
  }
  let htmlString = e.target.innerHTML.toLowerCase();
  /* HACK: mouseup seems to pick up on facebook likes */
  if (htmlString.length < 100 && htmlString.indexOf("like") > -1) {
    me.insertAction(url, "like", time, null);
    return;
  }
  if (!selectedText) {
    return;
  }
  me.insertAction(url, "select", time, 
                  {"text":selectedText});
};

GandalfTracker.prototype.kill = function(window) {
  Cu.reportError("kill, stopping timer");
  clearInterval(me.trackerTime);
}

GandalfTracker.prototype.onScroll = function(e) {
  var me = this;
  var url = me.getCurrentWindow().location.href;
  var time = new Date().getTime();
  if (me.scrollCounter[url]) {
    me.scrollCounter[url] += 1;
  } else {
    me.scrollCounter[url] = 1;
  }
};

GandalfTracker.prototype.onMouseMove = function(e) {
  var me = this;
  var loc = me.getCurrentWindow().location.href;
  if (me.mouseMoveCounter[loc]) {
    me.mouseMoveCounter[loc] += 1;
  } else {
    me.mouseMoveCounter[loc] = 1;
  }
};
  
GandalfTracker.prototype.queryAsync = function (query, names) {
  // Synchronously asyncExecute fetching all results by name
  let storageCallback = {names: names,
                         syncCb: Utils.makeSyncCallback()};
  storageCallback.__proto__ = Utils._storageCallbackPrototype;
  query.executeAsync(storageCallback);
  return Utils.waitForSyncCallback(storageCallback.syncCb);
};

GandalfTracker.prototype.flushCounters = function(mouseCounter, scrollCounter) {
  let me = this;
  Cu.reportError("flushing counter");
  // Cu.reportError("flush counters" + JSON.stringify(mouseCounter));
  let time = new Date().getTime();
  if (!mouseCounter) {
    return;
  }
  for (let [url, value] in Iterator(mouseCounter)) {
    // Cu.reportError(url);
    me.insertAction(url, "mousemove", time, {"moves": value});
  }
  for(let [url, value] in Iterator(scrollCounter)) {
    me.insertAction(url, "scroll", time, {"scrolls":value});
  }
};
