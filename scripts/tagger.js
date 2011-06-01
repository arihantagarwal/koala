/*
 * Koala tagger is an extended feature of Koala that 
 * is used by Gandalf. Koala keeps track of important
 * tags in a page. Then, Gandalf can look at what tags
 * don't change over time. This is likely to result in
 * better tags.
 *
 * Takes utils from tracker since its always a part of
 * the tracker.
 */

KoalaTagger = function() {
  let me = this;
  // Cu.reportError("starting koala tagger");
  me.utils = new KoalaUtils();
}

KoalaTagger.prototype.snapshot = function() {
  let url = me.utils.getCurrentURL();
  let placeId = me.utils.getPlaceIdFromURL(url);
  let tags  = me.extractTags();
  me.storeTags(tags, placeId, url);
};

KoalaTagger.prototype.extractTags = function() {
  // TODO: finish this method
  let currentDocument = me.utils.getCurrentDocument();
}

KoalaTagger.prototype.storeTags = function(tags, placeId, url) {
  let today = me.utils.getCurrentDate('d');
  for ([tag, score] in Iterator(tags)) {
    // TODO: check first if this placeId, date combo does not exist.
    me.utils.insertData({
      'place_id' : placeId,
      'tag': tag,
      'type': 1,
      'confidence': score,
      'date': today,
    }, "moz_koala_tags");
  }
};

