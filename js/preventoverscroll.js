//module.exports = function(el) {
function preventoverscroll(el) {
  el.addEventListener('touchstart', function() {
      var top = el.scrollTop;
      var totalScroll = el.scrollHeight;
      var currentScroll = top + el.offsetHeight;

    // If we're at the top or the bottom of the containers scroll,
    // push up or down one pixel. This prevents the scroll from
    // "passing through" to the body.
    if (top === 0) {
      el.scrollTop = 1
    }
    else if (currentScroll === totalScroll) {
      el.scrollTop = top - 1
    }
  });

  el.addEventListener('touchmove', function(evt) {
    //if the content is actually scrollable, i.e. the content is long enough
    //that scrolling can occur
    if(el.offsetHeight < el.scrollHeight)
      evt._isScroller = true
  });
}

//document.body.addEventListener('touchmove', function(evt) {
//  //In this case, the default behavior is scrolling the body, which
//  //would result in an overflow.  Since we don't want that, we preventDefault.
//  if(!evt._isScroller) {
//    evt.preventDefault()
//  }
//});
