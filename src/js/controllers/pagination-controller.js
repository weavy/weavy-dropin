import { Controller } from "@hotwired/stimulus"
import { delay, nextFrame } from "../helpers/timing-helpers"
import { request } from "../helpers/request-helpers"
import WeavyConsole from '@weavy/dropin-js/src/common/console';

const console = new WeavyConsole("pagination");

// inspired by https://world.hey.com/daniel.colson/adventures-in-infinite-scrolling-9b4abaa4?ref=bestwebsite.gallery
export default class extends Controller {
  static targets = ["pager"]
  static values = { rootMargin: String }

  initialize() {
    setTimeout(function (that) { that.observePager() }, 500, this);
  }

  connect() {
    console.debug("connected");
  }

  async loadNextPage(event) {
    event?.preventDefault();
    var url = this.pager.dataset.next;
    console.debug("loading", url);
    const html = await request.get(url);
    await nextFrame();

    // keep scroll position by scrolling one vertical pixel before appending html
    if (window.scrollY === 0) {
      window.scroll(window.screenX, 1);
    }

    this.pager.outerHTML = html;    
    await delay(500);
    this.observePager();
  }

  async observePager() {
    await nextFrame();
    const { pager, intersectionOptions } = this;
    if (!pager) {
      return;
    }

    if (pager.dataset.preload === "true") {
      this.loadNextPage();
    } else {
      await nextIntersection(pager, intersectionOptions);
      this.loadNextPage();
    }
  }

  get pager() {
    const pagers = this.pagerTargets;
    if (pagers.length > 1) {
      console.warn("multiple pagers", pagers);
    }
    return pagers[pagers.length - 1];
  }

  get intersectionOptions() {
    const options = {
      root: this.scrollableOffsetParent,
      rootMargin: this.rootMarginValue
    };
    for (const [key, value] of Object.entries(options)) {
      if (value) {
        continue;
      }
      delete options[key];
    }
    return options;
  }

  get scrollableOffsetParent() {
    const root = this.element.offsetParent;
    return root && root.scrollHeight > root.clientHeight ? root : null;
  }
}

function nextIntersection(element, options = {}) {
  return new Promise(resolve => {
    new IntersectionObserver(([entry], observer) => {
      if (!entry.isIntersecting) {
        return;
      }
      observer.disconnect();
      resolve();
    }, options).observe(element);
  })
}
