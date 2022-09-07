import { delegate } from '../utils/utils';
import postal from '../utils/postal-child';
import turbo from './turbo';
import overlay from './overlay';
import browser from '../utils/browser';
import WeavyConsole from '../utils/console';

const console = new WeavyConsole("navigation");

// Opens url in _blank if possible
function openExternal(url, force) {
  var link = new URL(url, window.location);
  var isSameDomain = window.location.origin === link.origin;
  var isJavascript = link.protocol === "javascript:";
  var isHashLink = url.charAt(0) === '#';
  var isHttp = link.protocol.indexOf("http") === 0;

  // force, external domain and not javascript
  if (force || !(isSameDomain || isJavascript || isHashLink)) {
    console.log("external navigation");

    setTimeout(turbo.hideProgress, 1);

    try {
      if (typeof window.parent.Native !== "undefined") {
        window.parent.Native('linkCallback', { url: url });
        return true;
      }
    } catch (e) { /* cant access any parent.Native */ }

    if (isHttp) {
      // Open http/https links in a new tab
      window.open(url, "_blank", "noopener");
    } else {
      // Open custom protocols in the top browser window
      window.open(url, "_top");
    }

    return true;
  }
  console.log("not external");
  return false;
}

// Open downloads natively in mobile
function openDownload(url, link) {
  var downloadUrl = new URL(url, window.location);
  var isHttp = downloadUrl.protocol.indexOf("http") === 0;
  var isDownload = downloadUrl.searchParams.has("d");
  var linkIsDownload = link && link.hasAttribute("download");

  if (linkIsDownload || isDownload && isHttp) {
    console.log("download url");

    setTimeout(turbo.hideProgress, 1);

    // Open download links using system in Android webview
    try {
      if (typeof window.parent.Native !== "undefined" && browser.platform === "Android") {
        window.parent.Native('linkCallback', { url: url });
        return "native";
      }
    } catch (e) { /* can't access any parent.Native */ }


    if (linkIsDownload) {
      // a[download]
      link.target = "_top";
    } else if (!postal.isLeader) {
      // ?d url
      window.open(url, "_top");
      return "window";
    }

    return true;
  }

  return false;
}

function openOverlay(href, linkOrTarget) {
  var link = typeof linkOrTarget !== "string" && linkOrTarget;
  var overlayUrl = new URL(href, window.location);
  var target = link && (link.dataset.target || link.target) || typeof linkOrTarget === "string" && linkOrTarget;
  var title = link && (link.dataset.title || link.title);
  var isSameDomain = window.location.origin === overlayUrl.origin;
  var isDownload = overlayUrl.searchParams.has("d");
  var linkIsDownload = link && link.hasAttribute && link.hasAttribute("download");

  if (!isSameDomain || isDownload || linkIsDownload) {
    console.log("openOverlay", { isSameDomain, isDownload, linkIsDownload });
    return;
  }

  if (target === "overlay" || target === "modal" || target === "preview") {
    console.log("open overlay");
    overlay.open(href, target, title);
    return true;
  } else if (!target) {
      let overlayLink = getTransformedLink(href);
      console.log("no target, checking link", overlayLink)
      if (overlayLink) {
        //console.log("open file overlay based on href");
        overlay.open(overlayLink.href, overlayLink.target);
        return true;
      }
  }

  console.log("not overlay")

  return false;
}

// check if the specified url could be an url that we want to open in our overlay
function getTransformedLink(url) {
  var link = new URL(url, window.location);
  var match = link.href.match("^(https?://[^/]+)/");
  if (match) {
    var origin = match[1];
    if (origin === window.location.origin) {

      // Note: Let click endpoint take care of content urls.

      // User profile
      match = link.pathname.match("^/u(-?\\d+)$");
      if (match) {
        return { href: match[0], target: "modal" };
      }

      // /attachment/id
      match = link.pathname.match("^/f(\\d+)/");
      if (match) {
        console.log("matching file")
        return { href: "/dropin/preview/" + match[1], target: "preview" };
      }
    }
  }
}

turbo.on("turbo:load", function (e) {
  if (postal) {
    var navbarMiddle = document.querySelector(".navbar-middle");
    var title = navbarMiddle && navbarMiddle.innerText || "";
    postal.postToParent({ name: "ready", location: window.location.href, title: title, statusCode: 200, statusDescription: "OK" });
  }

  // if url has #fragment, we should scroll target element into view
  if (window.location.hash) {
    setTimeout(function () {
      var element = document.getElementById(window.location.hash.substring(1));
      if (element) {
        console.debug("scrolling into view", window.location.hash.substring(1))
        element.scrollIntoView();
      }
    }, 1)
  }
});

// Catch navigating links before turbolinks:click
// TODO: remove this?
document.addEventListener("click", delegate("a[href], [data-href]", function (e) {
  var nearestClickable = e.target.closest("A[href], BUTTON, .btn, input[type='button'], [data-href]");

  if (!e.defaultPrevented && (!nearestClickable || nearestClickable === this)) {
    console.log("click");

    var nearestDropdown = nearestClickable.closest(".dropdown-menu");
    var href = this.dataset.href || this.href;
    var target = this.dataset.target || this.target;

    // Turbolinks listens to a[href]:not([target]):not([download])
    // Turbolinks filters out extensions ending on other than .htm .html .xhtml

    var isHashLink = href.toString().charAt(0) === '#';

    var targetIsBlank = target === '_blank';
    var targetIsTop = target === '_top';
    var isWebView = browser.webView;

    var forceExternal = targetIsBlank || isWebView && targetIsTop;

    if (!isHashLink) {
      console.log("checking external and overlay")
      if (openExternal(href, forceExternal) || openOverlay(href, this)) {
        // If open new window
        e.preventDefault();
        e.stopPropagation();
        if (nearestDropdown) {
          nearestDropdown.classList.remove("show")
        }
      } else {
        // If url is a download-url
        var hasOpenedDownload = openDownload(href, this);
        if (hasOpenedDownload) {
          if (hasOpenedDownload === "native" || hasOpenedDownload === "window") {
            e.preventDefault();
          }
          e.stopPropagation();
          if (nearestDropdown) {
            nearestDropdown.classList.remove("show")
          }
        }
      }
    }
  }
}), { capture: true });


document.addEventListener("turbo:click", function (e) {
  //console.log("turbolinks:click")
  // anchors in same page should not be requested with turbolinks
  if (e.target.getAttribute("href").charAt(0) === '#') {
    console.log("Cancelling turbolinks navigation");
    return e.preventDefault();
  }
});

document.addEventListener("turbo:before-visit", function (e) {
  // Clicked external links will never reach this, but Turbolinks.visit() will
  // Including overlays here will cause a navigation loop
  console.log("turbo:before-visit checking external and download")
  if (openExternal(e.detail.url) || openDownload(e.detail.url)) {
    e.preventDefault();
  }
});

// Turbo form redirects

document.addEventListener("turbo:submit-end", (e) => {
  let response = e.detail.fetchResponse.response;
  if (response.redirected) {
    var redirectLocation = response.url;
    if (redirectLocation && overlay.isOverlay()) {
      document.addEventListener("turbo:before-visit", (visit) => {
        if (visit.detail.url === redirectLocation) {
          visit.preventDefault();

          console.log("turbo modal form overlay redirect", redirectLocation);
          postal.postToParent({ name: "navigation-open", route: redirectLocation });
        }
      }, { once: true })
    }
  }
});

export default {
  openExternal: openExternal,
  openDownload: openDownload,
  openOverlay: openOverlay
};

