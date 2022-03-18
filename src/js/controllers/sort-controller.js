import { Controller } from "@hotwired/stimulus"
import WeavyConsole from '@weavy/dropin-js/src/common/console';

const console = new WeavyConsole("sort");

export default class extends Controller {

  connect() {
    console.debug("connected");

    // remove data-controller attribute to prevent subsequent sorts when elements are added back to the DOM.
    this.element.removeAttribute("data-controller");
    let toSort = [].slice.call(this.element.parentNode.querySelectorAll("[data-sort-order]"));
    let sortOrder = this.element.dataset.sortDirection ?? "asc";

    toSort.sort(function (a, b) {
      let aInt = parseInt(a.dataset.sortOrder);
      let bInt = parseInt(b.dataset.sortOrder);
      return sortOrder === "desc" ? bInt - aInt : aInt - bInt;
    });

    for (let i = 0; i < toSort.length; i++) {
      toSort[i].parentNode.appendChild(toSort[i]);
    }
  }

  disconnect() {
    console.debug("disconnected");
  }
}
