import { getNextPositionedChild, getScrollParent } from "./scroll-position"

const _threshold = 0; // as soon as even one pixel is visible, the callback will be run
const _rootMargin = "0px"; // margin around the root, used to grow or shrink the root element's bounding box before computing intersections

/**
 * Creates a new regular scroll listener
 * 
 * @param {Element} observeElement 
 * @param {Function} whenNext
 * @returns IntersectionObserver
 */
export function createScroller(observeElement, whenNext) {

  var parent = getScrollParent(observeElement);

  // Disable scroll anchoring https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-anchor/Guide_to_scroll_anchoring
  parent.style.overflowAnchor = "none";

  // Bug using scrollingElement in frames. See https://github.com/w3c/IntersectionObserver/issues/372
  var intersectionParent = (parent === document.documentElement ? document : parent);

  whenNext ??= () => Promise.reject(new Error("No scroller handler function defined")); // default

  const nextObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        whenNext();
      }
    });
  }, { root: intersectionParent, threshold: _threshold, rootMargin: _rootMargin });

  nextObserver.observe(observeElement);

  return nextObserver;
}

/**
 * Creates a new reverse scroll listener
 * 
 * @param {Element} observeElement 
 * @param {Function} whenNext 
 * @returns IntersectionObserver
 */
export function createReverseScroller(observeElement, whenNext) {
  // inverted infinite scroll (e.g. for messages)
  let prevSleep = false;

  //console.log("creating reverse scroller");
  var parent = getScrollParent(observeElement);

  // Disable scroll anchoring https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-anchor/Guide_to_scroll_anchoring
  parent.style.overflowAnchor = "none";

  // Bug using scrollingElement in frames. See https://github.com/w3c/IntersectionObserver/issues/372
  var intersectionParent = (parent === document.documentElement ? document : parent);

  whenNext ??= () => Promise.reject(new Error("No reverse scroller handler function defined")); // default

  const prevObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && !prevSleep) {
        prevSleep = true;

        // find first child (that is regularly positioned)
        var nextPositionedChild = getNextPositionedChild(entry.target);

        var prevScrollHeight = parent.scrollHeight;
        var childOffsetBefore = nextPositionedChild.offsetTop;

        //console.log("intersecting", childOffsetBefore);

        let afterNext = () => {
          queueMicrotask(() => { // Place last in microtask queue
            // scroll parent so that first child remains in the same position as before
            // NOTE: when this is called via observer we need to requestAnimationFrame, otherwise scrolling happens to fast (before the DOM has been updated)
            if (prevScrollHeight !== parent.scrollHeight) {
              // layout already rendered
              let diff = nextPositionedChild.offsetTop - childOffsetBefore;
              //console.log("infinite scroll updated instantly", diff);
              parent.scrollTop += diff;
              requestAnimationFrame(() => prevSleep = false);
            } else {
              queueMicrotask(() => {
                if (prevScrollHeight !== parent.scrollHeight) {
                  // layout rendered after 
                  let diff = nextPositionedChild.offsetTop - childOffsetBefore; 
                  //console.log("infinite scroll updated by microtask", diff);
                  parent.scrollTop += diff;
                  requestAnimationFrame(() => prevSleep = false);
                } else {
                  // layout not rendered yet
                  requestAnimationFrame(() => {
                    let diff = nextPositionedChild.offsetTop - childOffsetBefore;
                    //console.log("infinite scroll updated by animationframe", diff);
                    parent.scrollTop += diff;
                    requestAnimationFrame(() => prevSleep = false); 
                  });
                }
              });
            }
          });
        }; 

        let whenNextResult = whenNext();

        if (whenNextResult) {
          whenNextResult.then(afterNext);
        } else {
          afterNext();
        }
      }
    })
  }, { root: intersectionParent, threshold: _threshold, rootMargin: _rootMargin });

  prevObserver.observe(observeElement);

  return prevObserver;
}
