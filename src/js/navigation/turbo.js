import * as Turbo from "@hotwired/turbo";
import postal from '@weavy/dropin-js/src/common/postal';
import navigation from './navigation';
import browser from './browser';
import WeavyConsole from '@weavy/dropin-js/src/common/console';

const console = new WeavyConsole("turbo");

var restorationVisit;
var isLoaded = false;
var isNavigating = false;

var progressShowTimeout;
var progressHideTimeout;

Turbo.setProgressBarDelay(200);

function showProgress() {
  window.clearTimeout(progressShowTimeout);
  window.clearTimeout(progressHideTimeout);

  progressShowTimeout = window.setTimeout(() => {
    try {
      Turbo.session.adapter.progressBar.setValue(0);
      Turbo.session.adapter.progressBar.show();
    } catch (e) { /* could not show progress */ }
  }, 200);

  progressHideTimeout = window.setTimeout(hideProgress, 30000);
}

function hideProgress() {
  window.clearTimeout(progressShowTimeout);
  window.clearTimeout(progressHideTimeout);

  try {
    Turbo.session.adapter.progressBar.hide();
    Turbo.session.adapter.progressBar.setValue(100);
  } catch (e) { /* could not hide progress */ }

}

// Show progress when navigating without Turbolinks
window.addEventListener("beforeunload", function (e) {
  if (postal.isLeader && !(browser.mobile && !browser.webView)) {
    console.debug("progress for unload", window.name);
    showProgress();
  }
});

window.addEventListener("unload", function () {
  hideProgress();
});

function sendData(url, action) {
  restorationVisit = false;
  var turbolinksAction;

  if (action) {
    console.debug("visit using action:", action);
    turbolinksAction = { action: action };
  }

  // visit url

  if (navigation.openExternal(url)) {
    return;
  }

  Turbo.visit(url, turbolinksAction);
}

function reload() {

  Turbo.visit(window.location.toString(), { action: 'replace' });
}

// Wrapper that ensures load events gets triggered initially
function on(eventName, handler) {
  if (eventName === "turbo:load" && isLoaded) {
    handler();
  }
  document.addEventListener(eventName, handler);
  return handler;
}

document.addEventListener("turbo:request-start", function (e) {
  isNavigating = true;
});

document.addEventListener("turbo:request-end", function (e) {
  isNavigating = false;
});


postal.on("turbo-visit", function (e) {
  var sameUrl = new URL(e.data.url).toString() === window.location.toString();
  if (!restorationVisit || restorationVisit && !sameUrl) {
    sendData(e.data.url, e.data.action);
  } else {
    console.debug("performing restoration, ignoring visit-request")
  }
})

postal.on("turbo-reload", function (e) {
  reload();
});

document.addEventListener("turbo:load", function () {
  //console.debug("turbolinks:load");
  isLoaded = true;
  restorationVisit = false;
});

// Restoration visits does not generate any visit URL, which we use for restoration detection

document.addEventListener("turbo:before-visit", function (e) {
  restorationVisit = false;
  //console.log("turbolinks:before-visit", e);
});

window.addEventListener("popstate", function () {
  restorationVisit = true;
  //console.log("turbolinks popstate", e);
});



export default {
  get isLoaded() { return isLoaded },
  get isNavigating() { return isNavigating },
  visit: sendData,
  on: on,
  reload: reload,
  showProgress: showProgress,
  hideProgress: hideProgress
};

