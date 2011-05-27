KoalaTracker = function(win) {
  Cu.reportError("starting koala tracker");
  let me = this;
  me.utils = new KoalaUtils();
  try {
    me.createTrackerDB();
  } catch (ex) {
    Cu.reportError(ex);
  }
  me.ACTIONS = {
    "click"  : 1,
    "active" : 2,
    "like"   : 3,
  };

  me.activeBuffer = {};
  
  // Cu.reportError("adding koala listeners");
  win.addEventListener("click", function(e) {me.onClick(e); me.onActivity(e);}, false);
  win.addEventListener("scroll", function(e) {me.onActivity(e)}, false);
  win.addEventListener("mousemove", function(e) {me.onActivity(e)}, false);

  // set flusher
  me.trackerTime = win.setInterval(function() {
    me.flushActiveBuffer();
    me.activeBuffer = {};
  }, 10000); // activity is counted in discrete 10 second blocks.
}

KoalaTracker.prototype.terminate = function(win) {
  let me = this;
  Cu.reportError("stopping koala tracker")
  win.removeEventListener("click", me.onClick, false);
  win.removeEventListener("click", me.onActivity, false);
  win.removeEventListener("scroll", me.onActivity, false);
  win.removeEventListener("mousemove", me.onActivity, false);
  clearInterval(me.trackerTime);
}

KoalaTracker.prototype.onClick = function(e) {
  let me = this;
  let url = me.utils.getCurrentURL();
  if (!me.utils.isValidURL(url)) {
    return;
  }
  let placeId = me.utils.getPlaceIdFromURL(url);
  Cu.reportError("click!");
  let currentTimeBlock = me.utils.getCurrentTime('h');
  let existingData = me.utils.getData(['id', 'count'], {'time': currentTimeBlock, 'place_id': placeId}, "moz_koala");
  if (existingData.length == 0) {
    Cu.reportError("click does not exist in block, insert");
    // does not exist, add
    me.utils.insertData({
      'url': me.utils.getCurrentURL(),
      'place_id': placeId,
      'type': 1,
      'time': currentTimeBlock,
      'count' : 1,
    }, "moz_koala");
  } else {
    Cu.reportError("click exists in block, update");
    // exists, update
    let count = existingData[0]["count"] + 1;
    me.utils.updateData(existingData[0]["id"], {
      'count' : count
    }, "moz_koala");
  }
};

KoalaTracker.prototype.onActivity = function(e) {
  return;
  let me = this;
  let url = me.utils.getCurrentURL();
  if (!me.utils.isValidURL(url)) {
    return;
  }
  if (!(url in me.activeBuffer)) {
    me.activeBuffer[url] = true;
  }
};

KoalaTracker.prototype.flushActiveBuffer = function() {
  /* if in current time block, increment count, else add */
  let me = this;
  Cu.reportError("flushing active buffer" + JSON.stringify(me.activeBuffer));
  let currentTimeBlock = me.utils.getCurrentTime('h');
  for (let url in me.activeBuffer) {
    let placeIdLst = me.utils.getData(['id'], {'url' : url}, "moz_places");
    if (placeIdLst.length == 0) {
      continue;
    }
    let placeId = placeIdLst[0]["id"];
    let existingData = me.utils.getData(['id', 'count'], {'place_id' : placeId, 'time': currentTimeBlock}, "moz_koala");
    if (existingData.length == 0) {
      // does not exist, insert
      me.utils.insertData({
        'url': url, 
        'place_id' : placeId, 
        'type' : 2, 
        'time': currentTimeBlock, 
        'count' : 1
      },"moz_koala");

    } else {
      let count = existingData[0]["count"] + 1;
      me.utils.updateData(existingData[0]["id"], {
        'count': count
      }, "moz_koala");
    }
  }
};

KoalaTracker.prototype.createTrackerDB = function() {
  let me = this;
  let dbFile = Cc["@mozilla.org/file/directory_service;1"]
               .getService(Ci.nsIProperties)
               .get("ProfD", Ci.nsIFile);
  dbFile.append("places.sqlite");
  let storage = Cc["@mozilla.org/storage/service;1"]
                .getService(Ci.mozIStorageService);
  let dbConn = storage.openDatabase(dbFile);
  
  let trackerSchema = "id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE," +
                      "url LONGVARCHAR," +
                      "place_id INTEGER," +
                      "type INTEGER," +
                      "count INTEGER DEFAULT 1," +
                      "time INTEGER," +
                      "anno_1 LONGVARCHAR";

  Cu.reportError("creating moz_koala");
  try {
    dbConn.createTable("moz_koala", trackerSchema);
  } catch (ex) {
  }
  Cu.reportError("db created or exists");
};
