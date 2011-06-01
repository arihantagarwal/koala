function  GrandCentral() {
  let me = this;
  me.utils = new KoalaUtils();
};

GrandCentral.prototype.findHubFromPlace = function(placeId) {
  let me = this;
  // TODO: write this function
  Cu.reportError(placeId);
  //let revHost = me.utils.getData(["rev_host"],{"id":placeId},"moz_places")[0]["rev_host"];
  
  /*
  let stm = Svc.History.DBConnection.createAsyncStatement(
    "SELECT id FROM moz_places where rev_host = :revHost ORDER BY visit_count DESC LIMIT 1");
  stm.params.revHost = revHost;
  return Utils.queryAsync(stm, ["id"])[0]["id"];
  */
  return 1376;
};

GrandCentral.prototype.isHub = function(placeId) {
  // TODO: make efficient, cant make so many queries
  return true;
  let me = this;
  let hub = me.findHubFromPlace(placeId);
  return (hub == placeId);

}
