/*
 * GandalfScout - scout.js
 * Author: Abhinav Sharma <me@abhinavsharma.me>
 *
 * The Gandalf Scout is responsible for ranking/
 * detecting websites using the data from moz_tracker
 */

GandalfScout = function() {
  let me = this;
  me.Cu = Components.utils;
  me.Cu.import("resource://services-sync/util.js");
  let me = this;
  me.utils = new GandalfUtils();

};

GandalfScout.prototype.findHub = function(placeId) {
  let me = this;
  let historyVisits = me.utils.getHistoryVisitsForPlace(placeId);
  let nodes = {};
};

GandalfScout.prototype.getTrackerDict = function() {
  let me = this;
  let stm = Svc.History.DBConnection.createAsyncStatement(
    "SELECT place_id, url, anno, datetime, type FROM moz_tracker;");
  let result = Utils.queryAsync(stm, ["place_id", "url", "anno", "datetime", "type"]);
  let placesMap = {};

  /* populate fields from moz_tracker */
  result.forEach(function({place_id, url, anno, datetime, type}) {
    if (!(place_id in placesMap)) {
      placesMap[place_id] = {1:[], 2:[], 3:[], 4:[], 5:[]};
    }
    placesMap[place_id][type].push(datetime);
  });

  /* create a dateset field */
  for (let url in placesMap) {
    let visits = {};
    for (let action in placesMap[url]) {
      let epochTimeList = placesMap[url][action];
      epochTimeList.forEach(function(epochTime) {
        let d = new Date(epochTime);
        let datestring = d.getDate() + "/" + d.getMonth() + "/" + d.getFullYear();
        if (!(datestring in visits)) {
          visits[datestring] = 1;
        }
      });
    }
    let visitArray = [];
    for (let key in visits) {
      visitArray.push(key);
    }
    placesMap[url][6] = visitArray;
  }

  /* return final results */
  return placesMap;
};

GandalfScout.prototype.getSortedTracker = function(sortBy) {
  let me = this;
  let trackerDict = me.getTrackerDict();
  let sortable = [];
  for (let k in trackerDict) {
    sortable.push([k, trackerDict[k][sortBy]]);
  }
  let sorted = sortable.sort(function(a,b) { return b[1].length - a[1].length; });
  return sorted;
};

