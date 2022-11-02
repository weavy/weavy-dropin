import { Controller } from "@hotwired/stimulus"
import WeavyConsole from '../utils/console';

const console = new WeavyConsole("sort");

export default class extends Controller {

  connect() {
    console.debug("connected");

    // remove data-controller attribute to prevent subsequent sorts when elements are added back to the DOM.
    this.element.setAttribute("data-controller", this.element.getAttribute("data-controller").replace("sort", ""));
    let toSort = [].slice.call(this.element.parentNode.querySelectorAll("[data-sort-order]"));
    let sortOrder = this.element.dataset.sortDirection ?? "asc";

    toSort.sort(function (a, b) {
      let aInt = parseInt(a.dataset.sortOrder);
      let bInt = parseInt(b.dataset.sortOrder);
      return sortOrder === "desc" ? bInt - aInt : aInt - bInt;
    });

    // NOTE: prepend instead of append - to prevent pager from ending up as the first item in the list
    for (let i = toSort.length - 1; i >= 0 ; i--) {
      toSort[i].parentNode.prepend(toSort[i]);
    }
  }

  disconnect() {
    console.debug("disconnected");
  }
}
