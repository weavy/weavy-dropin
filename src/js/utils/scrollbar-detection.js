import WeavyPromise from './promise';
import WeavyUtils from './utils';

// SCROLLBAR DETECTION

export var whenScrollbarsChecked = new WeavyPromise();

// visible scrollbar detection
export function checkScrollbar(entries) {
  var element, overflowWidth;
  for (var entry in entries) {
    element = entries[entry].target;
    try {
      overflowWidth = element === document.documentElement ? window.innerWidth : element.clientWidth;
      if (overflowWidth !== element.offsetWidth) {
        // we have visible scrollbars, add .scrollbar to html element
        document.documentElement.classList.add("wy-scrollbars");
      } else {
        document.documentElement.classList.remove("wy-scrollbars");
      }
      whenScrollbarsChecked.resolve(document.documentElement.classList.contains("wy-scrollbars"));
    } catch (e) {
      console.warn("scrollbar detection failed", e);
    }
  }
}

// insert scrollbar detection element
var scrollCheck = document.createElement("div");
scrollCheck.className = "wy-scrollbar-detection";
document.documentElement.insertBefore(scrollCheck, document.body);

// register scrollbar detection

var scrollRO = new ResizeObserver(checkScrollbar);
scrollRO.observe(scrollCheck);


// scrollbar adjustment
var adjustRO = new ResizeObserver(checkScrollbarAdjust);

export function registerScrollbarAdjustElements() {
  document.documentElement.style.removeProperty('--wy-scrollbar-adjust-top');
  document.documentElement.style.removeProperty('--wy-scrollbar-adjust-bottom');
  adjustRO.disconnect();

  whenScrollbarsChecked.then(() => {
    if (document.documentElement.classList.contains("wy-scrollbars")) {

      let scrollbarAdjustElements = document.querySelectorAll("[data-adjust-scrollbar-top], [data-adjust-scrollbar-bottom]");
      if (scrollbarAdjustElements) {
        scrollbarAdjustElements.forEach((target) => {
          checkScrollbarAdjust([{ target: target }]);
          adjustRO.observe(target);
        });
      }
    }

  });
}

export function checkScrollbarAdjust(entries) {
  for (var entry in entries) {
    let target = entries[entry].target;
    let targetStyle = getComputedStyle(target);
    if (target.dataset.adjustScrollbarTop !== undefined) {
      document.documentElement.style.setProperty('--wy-scrollbar-adjust-top', targetStyle.height);
    }
    if (target.dataset.adjustScrollbarBottom !== undefined) {
      document.documentElement.style.setProperty('--wy-scrollbar-adjust-bottom', targetStyle.height);
    }
  }
}

WeavyUtils.ready(registerScrollbarAdjustElements);
document.addEventListener("turbo:render", registerScrollbarAdjustElements);
document.addEventListener("popstate", () => requestAnimationFrame(registerScrollbarAdjustElements));
