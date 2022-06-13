import utils from './utils';

// prevent browser from automatically restoring scroll position on back, forward, reload
//window.history.scrollRestoration = "manual";

var keepStates = [];
var scrollSleep = true;

function keepScroll() {
  //keepStates = [];

  document.querySelectorAll("[data-scroll-keep]").forEach(function (scrollY) {
    if (utils.isVisible(scrollY)) {
      let scrollId = scrollY.dataset.scrollKeep || scrollY.id;
      if (scrollId) {
        let isReversed = "scrollToBottom" in scrollY.dataset;
        //console.log("keeping " + (isReversed ? "reversed " : "") + "scroll-y", scrollId, isReversed ? scrollY.scrollHeight - scrollY.scrollTop - scrollY.clientHeight : scrollY.scrollTop);

        keepStates[scrollId] = isReversed ? scrollY.scrollHeight - scrollY.scrollTop - scrollY.clientHeight : scrollY.scrollTop;
      } else {
        console.error("[data-scoll-keep] is missing id");
      }
    }
  });
}

export function removeScroll(scrollId) {
  // keepstates
  if (scrollId in keepStates) {
    delete keepStates[scrollId];
  }

  // scrollstates
  var historyState = window.history.state || {};
  var scrollStates = historyState.scrolling || [];

  if (scrollId in scrollStates) {
    delete scrollStates[scrollId];
    historyState.scrolling = scrollStates;
    window.history.replaceState(historyState, document.title);
  }
}

export function saveScroll() {
  if (scrollSleep) {
    return;
  }

  var historyState = window.history.state || {};
  var scrollStates = historyState.scrolling || [];
  var doScrollSave = false;

  document.querySelectorAll("[data-scroll-save]").forEach(function (scrollY) {
    if (utils.isVisible(scrollY)) {
      let scrollId = scrollY.dataset.scrollSave || scrollY.id;
      if (scrollId) {
        let isReversed = "scrollToBottom" in scrollY.dataset;

        //console.log("saving scroll-y", scrollId, scrollY.scrollTop);
        doScrollSave = true;
        scrollStates[scrollId] = isReversed ? scrollY.scrollHeight - scrollY.scrollTop - scrollY.clientHeight : scrollY.scrollTop;
      } else {
        console.error("[data-scoll-save] is missing id");
      }
    }
  });

  if (doScrollSave) {
    //console.log("save scroll-y state", scrollStates, window.location.href);

    historyState.scrolling = scrollStates;
    window.history.replaceState(historyState, document.title);

  }
}

export function restoreScroll(noDelete) {
  var scrollStates = window.history.state && window.history.state.scrolling || [];

  for (let scrollId in keepStates) {
    let scrollY = document.querySelector("[data-scroll-keep=" + scrollId + "], #" + scrollId + "[data-scroll-keep]");
    if (scrollY) {
      let isReversed = "scrollToBottom" in scrollY.dataset;
      let hasChanged = (isReversed ? scrollY.scrollHeight - scrollY.clientHeight - scrollY.scrollTop : scrollY.scrollTop) !== keepStates[scrollId];
      let isAvailable = !!scrollY.scrollHeight;
      let isWithinLimits = scrollY.scrollHeight - scrollY.clientHeight >= keepStates[scrollId];

      //console.log("trying keep scroll-y", scrollId, { isReversed, hasChanged, isAvailable, isWithinLimits })
      if (isAvailable) {
        if (isWithinLimits || noDelete) {
          if (hasChanged) {
            //console.debug("restoring keep scroll-y", scrollId, keepStates[scrollId])
            scrollY.scrollTop = isReversed ? scrollY.scrollHeight - scrollY.clientHeight - keepStates[scrollId] : keepStates[scrollId];
          }
        } else {
          if (!noDelete) {
            console.warn("Invalid keep scroll-y range.", scrollId);
            delete keepStates[scrollId];
          }
        }
      }
    }
  }

  for (let scrollId in scrollStates) {
    let scrollY = document.querySelector("[data-scroll-save=" + scrollId + "], #" + scrollId + "[data-scroll-save]");
    if (scrollY) {
      let isReversed = "scrollToBottom" in scrollY.dataset;
      let hasChanged = (isReversed ? scrollY.scrollHeight - scrollY.clientHeight - scrollY.scrollTop : scrollY.scrollTop) !== scrollStates[scrollId];
      let isAvailable = !!scrollY.scrollHeight;
      let isWithinLimits = scrollY.scrollHeight - scrollY.clientHeight >= scrollStates[scrollId];

      if (isAvailable) {
        if (isWithinLimits || noDelete) {
          if (hasChanged) {
            //console.debug("restoring scroll-y", scrollId, scrollStates[scrollId]);
            scrollY.scrollTop = isReversed ? scrollY.scrollHeight - scrollY.clientHeight - scrollStates[scrollId] : scrollStates[scrollId];
          }
        } else {
          if (!noDelete) {
            console.warn("Invalid scroll-y range.", scrollId);
            delete scrollStates[scrollId];
          }
        }
      }
    }
  }

  let scrollToBottoms = document.querySelectorAll("[data-scroll-to-bottom]");

  scrollToBottoms.forEach((scrollY) => {
    let hasKeep = "scrollKeep" in scrollY.dataset && (scrollY.dataset.scrollKeep || scrollY.id) in keepStates;
    let hasScroll = "scrollSave" in scrollY.dataset && (scrollY.dataset.scrollSave || scrollY.id) in scrollStates;

    if (!hasKeep && !hasScroll) {
      if (scrollY.scrollTop === 0 && scrollY.scrollTop + scrollY.clientHeight !== scrollY.scrollHeight) {
        //console.log("scroll-y to bottom", scrollY.id, scrollY.scrollHeight - scrollY.clientHeight);
        scrollY.scrollTop = scrollY.scrollHeight - scrollY.clientHeight;
      }
    }
  })
}




var finalRestore = () => {
  restoreScroll();
  scrollSleep = false;
};

// Save scroll positions to turbolinks cache
window.addEventListener("unload", saveScroll);
document.addEventListener("turbo:visit", saveScroll);
document.addEventListener("turbo:before-render", keepScroll);
document.addEventListener("turbo:render", () => {
  scrollSleep = true;
  queueMicrotask(() => restoreScroll(true));
  requestAnimationFrame(finalRestore);
});

requestAnimationFrame(restoreScroll);

utils.ready(() => {
  restoreScroll(true);
  requestAnimationFrame(finalRestore)
});

// Handles scroll restoration with responsive layouts
window.addEventListener("resize", utils.debounce(() => {
  restoreScroll()
}, 1), { passive: true })

// TODO: use this resizeobserver instead of resize event
// register scrollbar detection
//try {
//  var ro = new ResizeObserver(utils.debounce(() => {
//    restoreScroll()
//  }));
//  ro.observe(someElement);
//} catch (e) {
//  // fallback check
//}

export function sleep() {
  scrollSleep = true;
}

