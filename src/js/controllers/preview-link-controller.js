import { Controller } from "@hotwired/stimulus"
import postal from '../utils/postal-child';
import WeavyConsole from '../utils/console';

const console = new WeavyConsole("preview");
const target = "preview";

export default class extends Controller {

  connect() {
    console.debug("connected");
  }

  open(e) {
    if (e.defaultPrevented) {
      // event was cancelled
      return;
    }

    // get url to open from data-preview-url-param or a[href]
    let url = e.params.url;
    console.log("open", e.params);
    let action = e.target.getAttribute("data-action");
    if (e.target.tagName === "A" && action && action.includes("preview-link#open")) {
      url ??= e.target.getAttribute("href");

      // prevent default navigation (since we want to open a preview window)
      e.preventDefault();
    } else {
      // prevent click on some child elements from bubbling up and causing issues (multiple calls to open preview, dropdowns not closing etc.)
      var selector = "a, button, input, .dropdown";
      if (e.target.matches(selector) || e.target.closest(selector)) {
        return;
      }
    }

    if (url) {
      postal.whenLeader().then(function (isLeader) {
        if (isLeader) {
          try {
            // open preview in new tab when isLeader (standalone)
            window.open(url, target);
          } catch (e) {
            // couldn't open in tab, try "standard" navigation
            window.location.assign(url);
          }
        } else {
          // open preview in overlay iframe
          postal.postToParent({ name: "overlay-open", type: target, url: url, title: e.params.title, controls: { close: true } });
        }
      });
    }
  }

}
