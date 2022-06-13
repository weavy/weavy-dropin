/* global WEAVY_DEVELOPMENT */
import { delegate } from '../utils/utils';
import postal from '../utils/postal';
import turbo from './turbo';
import browser from '../utils/browser';
import WeavyConsole from '../utils/console';

const console = new WeavyConsole("overlay");

const _overlays = new Map();

document.addEventListener("click", delegate("a[href].close-back, button.close-back", closeOverlay), true);

function closeOverlay(e) {
  if (!isOpenedWindow() && !postal.isLeader) {
    //console.log("close-back embedded")

    if (e) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }

    postal.postToParent({ name: "request:close" });
  } else if (isOpenedWindow()) {
    //console.log("close-back opened window")

    if (e) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
    setTimeout(() => {
      window.close();
    }, 0);
  } else {
    //console.log("close-back normal navigation");
    if (!e) {
      var backButton = document.querySelector("a[href].close-back");
      if (backButton) {
        window.location.href = backButton.href;
      }
    }
  }
}

function closeAllOverlays() {
  _overlays.forEach((target, overlay) => {
    try {
      postal.unregisterContentWindow(overlay.name, true);
      overlay.close()
    }
    catch (e) { /* move on */ }
  });
  _overlays.clear()
}

postal.whenLeader().then(function (isLeader) {
  if (isLeader || isOpenedWindow()) {
    document.addEventListener("keyup", function (e) {
      if (e.which === 27) { // Esc
        var closeBack = document.querySelector("a[href].close-back");
        if (closeBack) {
          e.stopImmediatePropagation();
          closeBack.click();
        }
      }
      if (e.which === 37) { // Left
        if (allowedKeyTarget(e)) {
          navPrev();
        }
      }
      if (e.which === 39) { // Right
        if (allowedKeyTarget(e)) {
          navNext();
        }
      }
    }, true)
  } else {
    postal.on("key:trigger", function (e, key) {
      if (isOverlay()) {
        if (key.which === 27) {
          //console.log("esc requested");
          postal.postToParent({ name: "request:close" });
        }

        if (key.which === 37) {
          //console.log("prev requested");
          navPrev();
        }

        if (key.which === 39) {
          //console.log("next requested");
          navNext();
        }
      }
    });

    document.addEventListener("keyup", function (e) {
      if (allowedKeyTarget(e)) {
        if (e.which === 27) { // Esc
          if (isOpenedWindow()) {
            var closeBack = document.querySelector("a[href].close-back");
            if (closeBack) {
              e.stopImmediatePropagation();
              closeBack.click();
            }
          } else {
            e.stopImmediatePropagation();
            postal.postToParent({ name: "key:press", which: 27 });
          }
        }

        if (e.which === 37) { // Left
          e.stopImmediatePropagation();
          postal.postToParent({ name: "key:press", which: 37 })
        }

        if (e.which === 39) { // Right
          e.stopImmediatePropagation();
          postal.postToParent({ name: "key:press", which: 39 })
        }
      }
    })
  }
});

function allowedKeyTarget(e) {
  var noModalOpen = !document.documentElement.classList.contains("modal-open");
  var notInputField = !e.target.matches("input, textarea, select") && !e.target.closest('[contenteditable="true"]');
  return noModalOpen && notInputField;
}

function navPrev() {
  //console.log("navigating prev", !!document.querySelector(".nav-prev a"));
  var prevLink = document.querySelector(".nav-prev a");
  if (prevLink && prevLink.href) {
    turbo.visit(prevLink.href);
  }
}

function navNext() {
  //console.log("navigating next", !!document.querySelector(".nav-next a"));
  var nextLink = document.querySelector(".nav-next a");
  if (nextLink && nextLink.href) {
    turbo.visit(nextLink.href);
  }
}

function overlayNavigation(href, target) {
  //console.log("overlay navigation");
  var iOS = browser.platform === "iOS";
  if (browser.mobile || browser.desktop) {
    var overlayWindow = _overlays.get(target);

    if (overlayWindow && overlayWindow.closed) {
      //console.debug("removing previous closed window");
      try {
        postal.unregisterContentWindow(overlayWindow.name, true);
      } catch (e) { /* unable to unregister, no worries */ }

      _overlays.delete(target);
      overlayWindow = null;
    }

    if (overlayWindow) {
      postal.postToFrame(overlayWindow.name, true, { name: "turbo-visit", url: href });
      overlayWindow.focus();
    } else {
      if (WEAVY_DEVELOPMENT && !browser.webView && !iOS) {
        console.debug("WEAVY_DEVELOPMENT", "open overlay window", target)
        try {
          overlayWindow = window.open(href, "panel-overlay:" + target);
        } catch (e) { /* can't open window */ }
      }

      if (overlayWindow) {
        _overlays.set(target, overlayWindow);
        postal.registerContentWindow(overlayWindow, "panel-overlay:" + target, true, window.location.origin);
      } else {
        console.debug("opening " + target + " via referred turbo navigation");
        turbo.visit(href);
      }
    }
  } else {
    console.debug("opening overlay via turbo navigation");
    turbo.visit(href);
  }
}

function overlayLinkOpen(href, target, title) {
  // Check url validity
  var isSameDomain = window.location.origin === new URL(href, window.location).origin;

  if (!isSameDomain) {
    console.warn("invalid overlay url", href);
    return false;
  }

  target = target || "overlay";

  try {
    // Change focus to receive keypress events
    document.activeElement.blur()
    document.body.focus();
  } catch (e) { /* could not blur any element */  }

  postal.whenLeader().then(function (isLeader) {
    if (isLeader) {
      overlayNavigation(href, target);
    } else {
      postal.postToParent({ name: "overlay-open", type: target, url: href, title: title, controls: { close: true } });
    }
  });

}

postal.on("overlay-open", (overlayOpen) => {
  postal.whenLeader().then((isLeader) => {
    if (isLeader) {
      //console.debug("overlay-open received", overlayOpen.data);
      overlayNavigation(overlayOpen.data.url, overlayOpen.data.type);
    }
  })
})

function isOverlay() {
  try {
    return (postal && postal.parentName && postal.parentName.startsWith("panel-overlay")) || false;
  } catch (e) { /* no accessible parent name */ }
  return false;
}

function isModal() {
  try {
    return postal && postal.parentName && postal.parentName.startsWith("panel-overlay:modal") || false;
  } catch (e) { /* no accessible parent name */ }
  return false;
}

function isOpenedWindow() {
  try {
    return window.opener && window.opener !== window.self || false;
  } catch (e) { /* can't access any opener */ }
  return false;
}

postal.whenLeader().then(() => {
  if (isOverlay()) {
    document.documentElement.classList.add("overlay");
  }
})

export default {
  open: overlayLinkOpen,
  close: closeOverlay,
  closeAll: closeAllOverlays,
  isModal: isModal,
  isOverlay: isOverlay,
  isOpenedWindow: isOpenedWindow
}


