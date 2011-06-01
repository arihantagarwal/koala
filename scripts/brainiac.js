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
  let placeId = me.utils.getCurrentPlace();
}

/* use bookmarks as training data */
Brainiac.prototype.trainBookmarks = function() {
  reportError("training brainiac");
}

Brainiac.prototype.classify = function(placeId) {

}


