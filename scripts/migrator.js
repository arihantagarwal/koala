/*
 * Utility to move data from FinderFox to Koala.
 */
function KoalaMigrator() {
  reportError("migrating");
  let me = this;
  me.utils = new KoalaUtils();
  let query = "SELECT CASE WHEN (type>1) THEN 2 ELSE 1 END AS type, "+
    "place_id, COUNT(1) as count, (datetime/(1000*60*60)) as time "+
    "FROM moz_tracker WHERE place_id != 'undefined' AND place_id !=0 AND "+
    "url LIKE '%http%' GROUP BY time,place_id";
  let stm = Svc.History.DBConnection.createAsyncStatement(query);
  try {
  Utils.queryAsync(stm, ["type", "place_id", "count", "time"]).forEach(function(record) {
    me.utils.insertData({
      "type": record.type,
      "place_id": record.place_id,
      "count": record.count,
      "time": record.time
    },"moz_koala")
  });
  } catch (ex) {}
}

