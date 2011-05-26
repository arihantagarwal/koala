/*
 * GandalfUtils - utils.js
 * Author: Abhinav Sharma <me@abhinavsharma.me>
 * 
 * GandalfUtils is a collection of miscellaneous utility functions
 * used in Gandalf. They're mostly helper functions to get data
 * from the DB.
 */

GandalfUtils = function() {
  let me = this;
  me.Cc = Components.classes;
  me.Ci = Components.interfaces;
  me.Cu = Components.utils;
  me.hs  = this.Cc["@mozilla.org/browser/nav-history-service;1"]
             .getService(this.Ci.nsINavHistoryService);
  me.placesDB = this.hs.QueryInterface(this.Ci.nsPIPlacesDatabase)
                  .DBConnection;

  /* used for synced db queries - imports Utils.queryAsync*/
  me.Cu.import("resource://services-sync/util.js");
  me.createDB();
}

/*
 * Async db queries. cont is a continuation executed on
 * completion.
 */
GandalfUtils.prototype.processQuery = function(aItem, cont) {
  let me = this;
  if (!aItem.query.length) {
    return;
  }
  let db = aItem.db || me.placesDB;
  let stmt = db.createStatement(aItem.query);
  
  if(aItem.params) {
    for (let [name, value] in Iterator(aItem.params)) {
      stmt.params[name] = value;
    }
  }
  // Cu.reportError("Gandalf: executing statement: " + aItem.query);
  stmt.executeAsync({
    handleResult: function(aResultSet) {
      // Cu.reportError("Gandalf: result for: " + aItem.query);
      if (aItem.handleRow) {
        for (let row = aResultSet.getNextRow();
             row;
             row = aResultSet.getNextRow()) {
          aItem.handleRow(row);
        }
      } else {
        aItem.handler(aResultSet);
      }
    },
    
    handleError: function(aError) {
      me.Cu.reportError("Gandalf: DB Error: " + aError);
    },

    handleCompletion: function(aReason) {
      if (aReason != me.Ci.mozIStorageStatementCallback.REASON_FINISHED) {
        me.Cu.reportError("Gandalf: DB Completion: " + aReason);
      }
      cont();
    }
  });
  return aItem;
}

/*
 * constructs the required database tables for Gandalf.
 * Also, creates a bookmark folder for Gandalf bookmarks.
 */
GandalfUtils.prototype.createDB = function() {
  let me = this;
  let dbFile = me.Cc["@mozilla.org/file/directory_service;1"]
               .getService(me.Ci.nsIProperties)
               .get("ProfD", me.Ci.nsIFile);
  dbFile.append("places.sqlite");
  let storage = me.Cc["@mozilla.org/storage/service;1"]
                .getService(me.Ci.mozIStorageService);
  let dbConn = storage.openDatabase(dbFile);
  
  let trackerSchema = "id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE," + 
                       "url LONGVARCHAR," +
                       "type INTEGER," +
                       "datetime DATETIME NOT NULL," +
                       "anno LONGVARCHAR," +
                       "place_id INTEGER NOT NULL";

  var settingsSchema = "key VARCHAR(10) PRIMARY KEY UNIQUE, value LONGVARCHAR";

  try {
    dbConn.createTable("moz_tracker_settings", settingsSchema);
  } catch (ex) {
    //me.Cu.reportError("Gandalf: DB for tracker settings exists");
  }

  try {
    dbConn.createTable("moz_tracker", trackerSchema);
  } catch (ex) {
    //me.Cu.reportError("Gandalf: DB for tracker data exists");
  }

  let bmsvc = me.Cc["@mozilla.org/browser/nav-bookmarks-service;1"]
              .getService(me.Ci.nsINavBookmarksService);
  
  var queryItem = {
    query: "SELECT value FROM moz_tracker_settings WHERE key = 'bm_folder_id';",

    handleRow: function(aRow) {
      this.result  = parseInt(aRow.getResultByName("value"));
      //Cu.reportError("Gandalf: " + this);
    },
  };
  me.processQuery(queryItem, function cont() {
    //Cu.reportError("Gandalf: folder ID is" + JSON.stringify(queryItem));
    let folderId = queryItem.result;
    if (!queryItem.result) {
      let menuFolder = bmsvc.bookmarksMenuFolder;
      let newFolder = bmsvc.createFolder(menuFolder, 
                                         "Gandalf", bmsvc.DEFAULT_INDEX);
      let insertQ = "INSERT INTO moz_tracker_settings VALUES('bm_folder_id', '" + 
                    newFolder + "');"
      me.processQuery({query: insertQ}, function(){});
      folderId  = newFolder;
    }
  });

  //Cu.reportError(JSON.stringify(queryItem));
}

/*
 * A likemark is similar to a bookmark but its added to a special folder
 * Also, it tries to extract and automatically add meaningful tags for 
 * the bookmark.
 */
GandalfUtils.prototype.addLikemark = function(raw_uri, title, tags) {
  let me = this;
  
  var queryItem = {
    query: "SELECT value FROM moz_tracker_settings WHERE key = 'bm_folder_id';",

    handleRow: function(aRow) {
      this.result  = parseInt(aRow.getResultByName("value"));
    },
  };

  me.processQuery(queryItem, function cont() {
    // Cu.reportError("Gandalf IS: folder ID is" + JSON.stringify(queryItem));
    let folderId = queryItem.result;
    var bmsvc = Cc["@mozilla.org/browser/nav-bookmarks-service;1"]
                .getService(Ci.nsINavBookmarksService);
    var tagsvc = Cc["@mozilla.org/browser/tagging-service;1"]
                 .getService(Ci.nsITaggingService);

    var menuFolder = bmsvc.bookmarksMenuFolder;
    
    var uri = Cc["@mozilla.org/network/io-service;1"]
              .getService(Ci.nsIIOService)
              .newURI(raw_uri, null, null);

    var newBkmkId = bmsvc.insertBookmark(folderId, uri, bmsvc.DEFAULT_INDEX, title);
    tagsvc.tagURI(uri, tags);

  });

};

/* gets place ID for a URL
 */
GandalfUtils.prototype.getPIDFromURL = function(url) {
  //Cu.reportError("looking uyp pid for " + url);
  let me = this;
  let stm = Svc.History.DBConnection.createAsyncStatement(
    "SELECT id FROM moz_places WHERE url LIKE :url LIMIT 1");
  stm.params.url = url;
  let placeId = 0;
  let result = Utils.queryAsync(stm, ["id"])
  
  result.forEach(function({id}){
    placeId = id;
  });
  return placeId;
};

/* gets a URL for a place ID.
 */
GandalfUtils.prototype.getURLFromPID = function(placeId) {
  let stm = Svc.History.DBConnection.createAsyncStatement(
    "SELECT url FROM moz_places WHERE id = :placeId");
  stm.params.placeId = placeId;
  let resURL = null;
  let result = Utils.queryAsync(stm, ["url"])
  result.forEach(function({url}){
    resURL = url;
  });
  return resURL;
};

GandalfUtils.prototype.getVisitCountFromPID = function(placeId) {
  let stm = Svc.History.DBConnection.createAsyncStatement(
    "SELECT visit_count FROM moz_places WHERE id = :placeId");
  stm.params.placeId = placeId;
  let resCount = 0;
  let result = Utils.queryAsync(stm, ["visit_count"])
  result.forEach(function({visit_count}){
    resCount = visit_count;
  });
  return resCount;
};

/* 
 * Checks if a PID is bookmarked 
 * Known Uses: scout.js
 */
GandalfUtils.prototype.isPIDInBookmarks = function(placeId) {
  let me = this;
  let stm = Svc.History.DBConnection.createAsyncStatement(
    "SELECT id FROM moz_bookmarks WHERE fk=:placeId");
  stm.params.placeId = placeId;
  let isIn = false;
  Utils.queryAsync(stm, ["id"]).forEach(function({id}) {
    isIn = true;
  });
  return isIn;
};

/* 
 * get a place id from a history id 
 */
GandalfUtils.prototype.getPIDFromHID = function(hid) {
  //Cu.reportError("looking up pid for hid : " + placeId);
  let me = this;
  let stm = Svc.History.DBConnection.createAsyncStatement(
    "SELECT place_id FROM moz_historyvisits WHERE id = :hid");
  stm.params.hid = hid;
  let placeId = 0;
  Utils.queryAsync(stm, ["place_id"]).forEach(function({place_id}) {
    placeId = place_id;
  });
  return placeId;
};

GandalfUtils.prototype.getHIDSFromPID = function(placeId) {
  let me = this;
  let stm = Svc.History.DBConnection.createAsyncStatement(
    "SELECT id FROM moz_historyvisits WHERE place_id = :placeId");
  stm.params.placeId = placeId;
  let hids = [];
  Utils.queryAsync(stm, ["id"]).forEach(function({id}) {
    hids.push(id);
  });
  return hids;
};

/*
 * for a given history visit (hid), get the from_visit hid
 */
GandalfUtils.prototype.getSrcFromHID = function(hid) {
  let me = this;
  let stm = Svc.History.DBConnection.createAsyncStatement(
    "SELECT from_visit FROM moz_historyvisits WHERE id = :hid");
  stm.params.hid = hid;
  let fromVisit = 0;
  Utils.queryAsync(stm, ["from_visit"]).forEach(function({from_visit}) {
    fromVisit = from_visit;
  });
  return fromVisit;
};

/* 
 * gets a place dict for the current tab's place.
 * TODO: refactor to use last function 
 */
GandalfUtils.prototype.getCurrentPlaceInfo = function() {
  let me = this;
  let win = Services.wm.getMostRecentWindow("navigator:browser");
  let win = win.gBrowser.selectedBrowser.contentWindow;
  let stm = Svc.History.DBConnection.createAsyncStatement(
    "SELECT id, url, title FROM moz_places WHERE url LIKE :url LIMIT 1");
  stm.params.url = win.location.href;
  let place = {};
  let result = Utils.queryAsync(stm, ["id", "url", "title"])
  
  result.forEach(function({id, url, title}){
    place = {
      "place_id": id,
      "url": url,
      "title": title,
    };
  });
  return place;
};

/*
 * returns a list of history dicts for a place
 */
GandalfUtils.prototype.getHistoryVisitsForPlace = function(place_id) {
  let me = this;
  let stm = Svc.History.DBConnection.createAsyncStatement(
    "SELECT * FROM moz_historyvisits WHERE place_id=:place_id ORDER BY id DESC LIMIT 50;");
  stm.params.place_id = place_id;
  let results = [];
  let result = Utils.queryAsync(stm, 
    ["id", "from_visit", "visit_type", "visit_date", "session"]);
  result.forEach(function({id, from_visit, visit_type, visit_date, session}) {
    let place = {
      "hid" : id,
      "from_visit": from_visit,
      "visit_type": visit_type,
      "visit_date": visit_date,
      "session": session,
    };
    results.push(place);
  });
  return results;
};

/* 
 * gets a place dict given a place id
 */
GandalfUtils.prototype.getPlaceFromPID = function(placeId) {
  let me = this;
  let stm = Svc.History.DBConnection.createAsyncStatement(
    "SELECT * FROM moz_places WHERE id=:placeId");
  stm.params.placeId = placeId;
  let result = Utils.queryAsync(stm, ["id", "url", "title"]);
  let place = {};
  result.forEach(function({id, url, title}) {
    place["id"] = id;
    place["url"] = url;
    place["title"] = title;
  });
  return place;
};

/* 
 * Returns a dict of {placeID : closeness}
 */
GandalfUtils.prototype.getCloseHistoryPlaces = function(hid, closeness) {
  // TODO: figure out why union fails, also fix appends to proper style
  let stm1 = Svc.History.DBConnection.createAsyncStatement(
    "SELECT DISTINCT place_id FROM moz_historyvisits WHERE id >" + hid + " ORDER BY id ASC LIMIT " + closeness);
  let stm2 = Svc.History.DBConnection.createAsyncStatement(
    "SELECT DISTINCT place_id FROM moz_historyvisits WHERE id <" + hid +" ORDER BY id DESC LIMIT " + closeness);
  Cu.reportError("calling sql with hid " + hid + " and closness " + closeness);
  let res1 = Utils.queryAsync(stm1, ["place_id"]);
  let res2 = Utils.queryAsync(stm2, ["place_id"]);
  let i = 1;
  let places = {};
  Cu.reportError("ALL CLOSE PLACES" + JSON.stringify(res1) + JSON.stringify(res2));
  res1.forEach(function({place_id}) {
    places[place_id] = i++;
  });
  i = 1;
  res2.forEach(function({place_id}) {
    if (place_id in places) {
      places[place_id] += i++;
    } else {
      places[place_id] = i++;
    }
  });
  return places;
};

/*
 * merges two {key - count} dicts - used for tf dictionaries.
 */
GandalfUtils.prototype.mergeDict = function(d1, d2) {
  let finalDict = {};
  for (let k1 in d1) {
    finalDict[k1] = d1[k1];
  }
  for (let k2 in d2) {
    if (k2 in finalDict) {
      finalDict[k2] += d2[k2];
    } else {
      finalDict[k2] = d2[k2];
    }
  }
  return finalDict;
}

/*
 * get a list of place IDS for places visited in a session.
 */
GandalfUtils.prototype.getPlacesInSession = function(sessionId) {
  let me = this;
  let stm = Svc.History.DBConnection.createAsyncStatement(
    "SELECT DISTINCT place_id FROM moz_historyvisits WHERE session=:sessionId");
  stm.params.sessionId = sessionId;
  let placeIds = [];
  Utils.queryAsync(stm, ["place_id"]).forEach(function({place_id}) {
    placeIds.push(place_id);
  });
  return placeIds;
};

/*
 * basic regex extration of keywords from a url
 * TODO: make this smarter, remove, "www", "com" etc.
 */
GandalfUtils.prototype.getKeywordsFromURL = function(url) {
  if(!url) {
    return [];
  }
  return url.replace(/https*:\/\//g, "").split(/[.#/!]+/);
};

/*
 * gets keywords from a page title string
 */
GandalfUtils.prototype.getKeywordsFromTitle = function(title) {
  if (!title) {
    return[];
  }
  return title.split(/[\s|\-\_\/]+/).map(function(s){return s.toLowerCase();});
};

/*
 * combines keywords from title and url
 * TODO: merge results using the merge function defined above.
 */
GandalfUtils.prototype.getKeywordsFromPlace = function(place) {
  let tf = {};
  let uKeys = this.getKeywordsFromURL(place["url"]);
  let tKeys = this.getKeywordsFromTitle(place["title"]);
  for (let i = 0; i < uKeys.length; i++) {
    if (uKeys[i] in tf) {
      tf[uKeys[i]] += 1;
    } else {
      tf[uKeys[i]] = 1;
    }
  }
  for (let i = 0; i < tKeys.length; i++) {
    if (tKeys[i] in tf) {
      tf[tKeys[i]] += 1;
    } else {
      tf[uKeys[i]] = 1;
    }
  }
  return tf;
};

/*
 * TODO: this is hacky and may have horrific consequences.
 * a hacky weighted jacquard
 */
GandalfUtils.prototype.getTfSimilarity = function(tf1, tf2) {
  Cu.reportError("tf sim for:" + JSON.stringify(tf1) + JSON.stringify(tf2));
  let unionSize = 0.0;
  let intersectSize = 0.0;
  for (let k in tf1) {
    unionSize += tf1[k];
    if (k in tf2) {
      intersectSize += tf2[k];
    }
  }
  for (let k in tf2) {
    unionSize += tf2[k];
    if (k in tf1) {
      intersectSize += tf1[k];
    }
  }
  Cu.reportError("returning sim:" + intersectSize + "/" + unionSize);
  return intersectSize / unionSize;
};

/*
 * "http://www.google.com/asfhvasjdf/safd?45f" -> "www.google.com"
 */
GandalfUtils.prototype.extractURLDomain = function(url) {
  if (!url) {
    return url;
  }
  // TODO: make this smart using hisory, use subreddits
  return url.match(/(:\/\/www\.?.[^/:]+)/)[2];
};

GandalfUtils.prototype.getAllTags = function() {
  let me = this;
  let tagsvc = me.Cc["@mozilla.org/browser/tagging-service;1"]
               .getService(me.Ci.nsITaggingService);
  let allTags = tagsvc.allTags;
  return allTags;
};


/*
 * This fixes the table from older versions where the
 * tracker pages were saved with URLS instead of 
 * Place IDs. Inserts a column for place_id and 
 * populates it.
 */
GandalfUtils.prototype.fixTrackerTable = function() {
  let me = this;
  let stm = Svc.History.DBConnection.createAsyncStatement(
    "SELECT id, url FROM moz_tracker");
  Utils.queryAsync(stm, ["id", "url"]).forEach(function({id, url}) {
    let placeId = me.getPIDFromURL(url);
    let stmu = Svc.History.DBConnection.createAsyncStatement(
      "UPDATE moz_tracker SET place_id=:placeId WHERE id=:id");
    stmu.params.placeId = placeId;
    stmu.params.id = id;
    Utils.queryAsync(stmu, []);
  });
};

GandalfUtils.prototype.tracebackPID = function(placeId) {
  let me = this;
  var placeMap = {};
  function tracebackRecursive(hid) {
    let placeId = me.getPIDFromHID(hid);
    if (placeId in placeMap) {
      placeMap[placeId] += 1;
    } else {
      placeMap[placeId] = 1;
    }
    let src = me.getSrcFromHID(hid);
    if (src != 0) {
      tracebackRecursive(src);
    }
  };
  let historyVisits = me.getHIDSFromPID(placeId);
  historyVisits.forEach(function(id) { tracebackRecursive(id); });
  return placeMap;
};
