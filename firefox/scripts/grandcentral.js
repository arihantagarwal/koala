function SessionCentral() {
  let me = this;
  me.utils = new KoalaUtils();
}

SessionCentral.prototype.getSessionGraph = function(historyId, p, c) {
  let me = this;
  let graph = new Graph();
  
  (function recursiveSessionGraph(historyId, p, c) {
    if (historyId && historyId > 0) {
      if (p) {graph.addNode(p); graph.addEdge(p, placeId)}
      if (c) {graph.addNode(c); graph.addEdge(placeId, c)}
      let placeId = me.utils.getData(["place_id"], {"id":historyId}, "moz_historyvisits")[0]["place_id"];
      graph.addNode(placeId);
      me.utils.getData(["from_visit"],{"id":historyId},"moz_historyvisits")
        .map(function(h) {return h["from_visit"];})
        .forEach(function(hid){recursiveSessionGraph(hid, null, placeId)});
      me.utils.getData(["id"],{"from_visit":historyId},"moz_historyvisits")
        .map(function(h) {return h["id"];})
        .forEach(function(hid){recursiveSessionGraph(hid, placeId, null)});
    }
    return;
  })();
  
  return graph;
}

SessionCentral.prototype.getCurrentSessionGraph = function() {

}

/*
 * metrics for long run hubs, start with basics.
 */
function SiteCentral() {
  let me = this;
  me.utils = new KoalaUtils();
}

SiteCentral.prototype.getSiteHubList = function(placeId) {
  let me = this
  // reportError(placeId);
  let items = me.utils.getData(["rev_host"], {"id":placeId}
    , "moz_places")
  let revHost = items.length > 0 ? items[0]["rev_host"] : null;
  if (!revHost) {
    return [];
  }
  return me.utils.getData(["id", "visit_count"],{"rev_host":revHost},"moz_places")
    .map(function(d) {return [d["id"], d["visit_count"]];})
    .sort(function(a,b) {return b[1] - a[1]});
}

SiteCentral.prototype.isSiteHub = function(placeId) {
  let me = this;
  let hubList = me.getSiteHubList(placeId);
  if (hubList.length == 0)
    return false; // TODO: could this be done better?
  let hub = hubList[0][0]; // first, then pid
  return hub == placeId;
}
