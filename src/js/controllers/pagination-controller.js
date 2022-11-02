import { Controller } from "@hotwired/stimulus"
import { request } from "../utils/request-helpers"
import WeavyConsole from '../utils/console';
import { createScroller, createReverseScroller } from "../utils/infinite-scroll";
const console = new WeavyConsole("pagination");

export default class extends Controller {
  static targets = ["pager"]
  static values = {
    mode: {
      type: String, default: "regular"
    },
    deferred: {
      type: Boolean, default: false
    }
  }

  initialize() {
    this.currentPager = this.pager;
  }

  connect() {
    console.debug("connected");
    if (!this.deferredValue) {
      //console.debug("connect: Setting up infinite scroll: ", this.modeValue, this.pager)
      this.setup();
    }
  }

  pagerTargetConnected() {
    if (this.pager !== this.currentPager) {
      //console.debug("pagerTargetConnected: Setting up infinite scroll: ", this.modeValue, this.pager)
      this.setup();
      this.currentPager = this.pager;
    }
  }

  pagerTargetDisconnected() {
    this.scroller?.disconnect();
  }
  
  setup() {
    if (this.pager && !this.scroller || this.currentPager !== this.pager) {
      //console.debug("Setting up infinite scroll: ", this.modeValue, this.pager)

      if (this.modeValue === "regular") {
        this.scroller = createScroller(this.pager, async () => {
          this.scroller?.disconnect();

          //console.log("infinite-scroll: fetch next")
          var url = this.pager.dataset.next;
          const html = await request.get(url);
          this.pager.outerHTML = html;
          //console.log("infinite-scroll: fetch done")
        })
      } else if (this.modeValue === "reverse") {
        let pagination = this;

        pagination.scroller = createReverseScroller(pagination.pager, async () => {
          pagination.scroller?.disconnect();

          //console.log("infinite-scroll: fetch next")
          var url = this.pager.dataset.next;
          const html = await request.get(url);
          pagination.pager.outerHTML = html;
          //console.log("infinite-scroll: fetch done")
        })
      } else {
        console.warn("Pagination mode must be either regular (default) or reverse");
      }
    }
  }

  get pager() {
    const pagers = this.pagerTargets;
    if (pagers.length > 1) {
      console.warn("multiple pagers", pagers);
    }
    return pagers[pagers.length - 1];
  }

}
