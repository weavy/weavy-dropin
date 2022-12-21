
/**
 * Gets the next positioned child relative to the element.
 * 
 * @param {Element} el - Reference element in the scrollable area
 * @returns Element
 */
export function getNextPositionedChild(el, reverse = false) {
  while (el) {
    el = reverse ? el.previousElementSibling : el.nextElementSibling;
    if (/absolute|sticky|fixed/.test(getComputedStyle(el).position) === false) {
      return el;
    }
  }
}

/**
 * Finds the nearest scrollable area. Defaults to document.scrollingElement.
 * 
 * @param {Element?} element - Reference element in the scrollable area
 * @param {boolean} [includeHidden=false] - Treat elements with `overflow: hidden` as scrollable areas.
 * @returns Element
 */
export function getScrollParent(element, includeHidden) {
  if (element) {
    var style = getComputedStyle(element);
    var excludeStaticParent = style.position === "absolute";
    var overflowRegex = includeHidden ? /(auto|scroll|overlay|hidden)/ : /(auto|overlay|scroll)/;

    if (style.position === "fixed") {
      return document.scrollingElement;
    }

    for (var parent = element; (parent = parent.parentElement);) {
      style = getComputedStyle(parent);

      if (excludeStaticParent && style.position === "static") {
        continue;
      }
      if (overflowRegex.test(style.overflow + style.overflowY + style.overflowX)) {
        return parent;
      }
    }
  }

  return document.scrollingElement;
}

/**
 * Checks if a parent scroll container is scrolled to bottom
 * @param {Element?} element 
 * @param {number} [bottomThreshold=32] - Nearby limit for the bottom. Needs to be at least 1 to catch float calculation errors.
 * @returns boolean
 */
export function isParentAtBottom(element, bottomThreshold) {
  if (element) {
    bottomThreshold ??= 32; // Minimum 1 to catch float errors

    let area = getScrollParent(element);

    // We need to account for scrollTop being a float
    return Math.abs((area.scrollTop + area.clientHeight) - area.scrollHeight) <= bottomThreshold;
  }
  return false;
}

/**
 * Scrolls a parent scroll container to the bottom using a reference element in the scrollable area.
 * 
 * @param {Element?} element - Element in the scroll area
 * @param {boolean} [smooth] - Use smooth scrolling instead of instant scrolling
 */
export async function scrollParentToBottom(element, smooth) {
  if (element) {
    let area = getScrollParent(element);

    // Don't bother if the scroll already is correct, diff by 1px to avoid float errors
    if (Math.abs((area.scrollTop + area.clientHeight) - area.scrollHeight) > 1) {
      if (smooth) {
        area.scrollTo({
          top: area.scrollHeight,
          left: 0,
          behavior: 'smooth'
        });
      } else {
        area.scrollTop = area.scrollHeight;
      }
    }

    // Check when the scroll is done
    await new Promise((resolve) => {
      let lastScrollTop = area.scrollTop;
      let scrollCheck = () => {
        if (smooth && area.scrollTop === lastScrollTop) {          
          area.scrollTop = area.scrollHeight;
        }

        lastScrollTop = area.scrollTop;

        // We need to account for scrollTop being a float by using 1px diff
        if (Math.abs((area.scrollTop + area.clientHeight) - area.scrollHeight) > 1) {
          requestAnimationFrame(scrollCheck);
        } else {
          resolve();
        }
      }

      requestAnimationFrame(scrollCheck);
    })
  }
}
