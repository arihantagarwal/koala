/*
 * Brainiac is a classifier that tries to detect if a site
 * is interesting based on parameters. It uses bookmarks as
 * training data.
 *
 * This is initially based on neural networks from the brain
 * library.
 */

function Brainiac() {
  let me = this;
  me.net = new brain.NeuralNetwork();
  me.trainBookmarks();
  me.utils = new KoalaUtils();
}

/* use bookmarks as training data */
Brainiac.prototype.trainBookmarks = function() {
  reportError("training brainiac");
}

/*
 * input: placeId, n - the number of days to look over
 * @return p - the proportion of the last n days the site was visited on
 */
Brainiac.prototype.getProportionDays = function(placeId, n) {
  let d = me.utils.getCurrentTime('d');
  let query = "SELECT COUNT(*) AS count FROM  (SELECT *, (time / 24) as date," +
    "COUNT(1) FROM moz_koala WHERE  place_id=:placeId "+
    "AND (:today - date < :n) GROUP BY date)";

  let params = {
    "today": d,
    "n": n,
    "placeId": placeId
  };
  
  let result = me.utils.getDataQuery(query, params, ["count"])[0]["count"]
  return count / n;
}
