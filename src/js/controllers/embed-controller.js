import { Controller } from "@hotwired/stimulus";
import { renderStreamMessage } from "@hotwired/turbo";
import WeavyConsole from "../utils/console";
import { S4 } from '../utils/utils';

const console = new WeavyConsole("embed-controller");

// eslint-disable-next-line
const regexp = /(((https?|ftp):\/\/|(www|ftp)\.)[\w]+(.[\w]+)([\w\-\.,@?^=%&amp;:\/~\+#]*[\w\-\@?^=%&amp;\/~\+#]))/gmi;

export default class extends Controller {

  static targets = ["results", "form"]
  static classes = ["choose"];

  latest = [];
  embeds = [];
  candidates = {};
  rejected = [];
  failed = [];

  initialize() {
  }

  connect() {
    console.debug("connected");

    // hookup listener on form submit to prevent inactive embeds to be sent
    this.formTarget.addEventListener("submit", () => {
      for (var i = 1; i < this.resultsTarget.children.length; i++) {
        this.resultsTarget.children[i].setAttribute("disabled", "");
      }
    });
  }

  cycle() {
    // re-order embeds
    var elements = this.resultsTarget.children;
    this.resultsTarget.appendChild(elements[0]);
  }

  reject(event) {
    // remove embed and add to rejected array
    this.embeds = this.embeds.filter(url => url !== event.params.url);
    this.rejected.push(event.params.url);
    event.currentTarget.closest(".wy-embed").remove();

    // hide cycle btn
    if (this.embeds.length < 2) {
      this.element.classList.remove(this.chooseClass);
    }
  }

  fetchEmbed(match) {
    // make sure the results target has a unique id so that the turbo-stream results appends to the correct embed container
    var resultsId = this.resultsTarget.getAttribute("id");

    if (resultsId === null || resultsId === "") {
      resultsId = S4();
      this.resultsTarget.setAttribute("id", resultsId);
    }

    // create server embed
    const data = new FormData();
    data.append("url", match);
    data.append("target", resultsId);

    fetch("/dropin/embed", { headers: { Accept: "text/vnd.turbo-stream.html" }, method: "POST", body: data })
      .then(response => {
        if (!response.ok) {
          throw new Error();
        }
        return response.text();
      })
      .then(html => {
        this.embeds.push(match);
        renderStreamMessage(html);

        // show icon if more than 1 embed
        if (this.embeds.length > 1) {
          this.element.classList.add(this.chooseClass);
        }

        delete this.candidates[match];
      })
      .catch(() => {
        // error, add to failed so that we don't fetch again
        this.failed.push(match);
        delete this.candidates[match];
      });
  }

  updated({ detail: { content } }) {
    var matches = content.match(regexp);

    if (matches !== null) {

      matches = matches.map(url => {
        if (url.startsWith("//")) {
          return "http:" + url;
        } else if (!url.startsWith("http://") && !url.startsWith("https://")) {
          return "http://" + url;
        } else {
          return url;
        }
      });
    }

    if (matches === null || matches.length === 0) { // no matches      
      this.latest = [];
      this.rejected = [];

      // clear candidates
      for (let candidate in this.candidates) {
        clearTimeout(this.candidates[candidate]);
      }
      this.candidates = {};

    } else if (matches.length !== this.latest || matches !== this.latest) { // matches has changed

      // keep matches for comparing next time the doc is updated
      this.latest = matches;

      this.latest.forEach(match => {
        // add match if not already an embed, not failed or rejected before and not already a candidate 
        if (!this.embeds.includes(match) && !this.failed.includes(match) && !this.rejected.includes(match) && typeof (this.candidates[match]) === "undefined") {
          this.candidates[match] = setTimeout(() => { this.fetchEmbed(match); }, 500);
        }
      });

      // remove from rejected
      this.rejected = this.rejected.filter(rejected => this.latest.includes(rejected));

      // remove candidates
      for (let candidate in this.candidates) {
        if (!this.latest.includes(candidate)) {
          clearTimeout(this.candidates[candidate]);
          delete this.candidates[candidate];
        }
      }
    } else {
      // nothing has changed
    }
  }

  disconnect() {
    console.debug("disconnected");
  }
}
