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
  Cu.reportError("starting koala tagger");
  me.utils = new KoalaUtils();
  me.createTaggerDB();
}

KoalaTagger.prototype.snapshot = function() {

}

KoalaTagger.prototype.createTaggerDB = function() {
  let me = this;
  Cu.reportError("crating taggee db");
  let taggerSchema = "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                     "place_id INTEGER," +
                     "tag LONGVARCHAR," +
                     "type INTEGER, " +
                     "confidence FLOAT," +
                     "date INTEGER";
  me.utils.createDB("moz_koala_tags", taggerSchema);
};
