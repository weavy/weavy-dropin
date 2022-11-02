import { Controller } from "@hotwired/stimulus";
import { renderStreamMessage } from "@hotwired/turbo";
import WeavyConsole from '../utils/console';

const console = new WeavyConsole("version");

export default class extends Controller {

  connect() {
    console.debug("connected");
  }
   
  load(evt) {
    
    // prevent click on some child elements from bubbling up and triggering navigation
    var selector = "a, button, input, .dropdown";
    if (evt.target.matches(selector) || evt.target.closest(selector)) {
      return;
    }

    evt.preventDefault();
    fetch("/dropin/file/" + evt.params.id + "/versions/" + evt.params.v, { headers: { Accept: "text/vnd.turbo-stream.html" }, method: "GET" })
      .then(response => response.text())
      .then(html => {
        renderStreamMessage(html);
      });
  }

  revert(evt) {

    // prevent click on some child elements from bubbling up and triggering navigation
    var selector = "a, button, input, .dropdown";
    if (evt.target.matches(selector) || evt.target.closest(selector)) {
      return;
    }

    evt.preventDefault();
    fetch("/dropin/file/" + evt.params.id + "/version/" + evt.params.v + "/revert" , { headers: { Accept: "text/vnd.turbo-stream.html" }, method: "POST" })
      .then(response => response.text())
      .then(html => {
        renderStreamMessage(html);
      });
  }

  disconnect() {
    console.debug("disconnected");
  }
}
