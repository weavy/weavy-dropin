import { Controller } from "@hotwired/stimulus";
import { renderStreamMessage } from "@hotwired/turbo";
import WeavyConsole from '../utils/console';

const console = new WeavyConsole("polls");

export default class extends Controller {

  static targets = ["button", "list"];

  connect() {
    console.debug("connected");    
  }

  addPoll() {    
    if (this.listTarget.children.length === 0) {
      this.listTarget.hidden = false;
      this.addOption();
    } else if (this.listTarget.children.length > 0 && this.listTarget.hidden) {      
      this.listTarget.hidden = false
    } else {      
      this.listTarget.hidden = true
    }
    
  }

  addOption(evt) {    
    // only append new option if clicking on last input
    if (evt && evt.target.nextElementSibling !== null) return;

    // add new option
    const count = this.listTarget.children.length;
    const placeholder = document.createElement("div");
    placeholder.innerHTML = `<input class='wy-input' type='text' name='Options[${count}].Text' placeholder='+ add an option' data-action='focus->polls#addOption'/>`;
    while (placeholder.firstElementChild) {
      this.listTarget.append(placeholder.firstElementChild);
    }
  }

  vote(evt) {
    if (evt.target.classList.contains('wy-avatar') || evt.target.classList.contains('wy-facepile')) return;

    fetch("/dropin/" + evt.params.id + "/vote", { headers: { Accept: "text/vnd.turbo-stream.html" }, method: "POST" })
      .then(response => response.text())
      .then(html => {
        renderStreamMessage(html);
      });
  }

  disconnect() {
    console.debug("disconnected");    
  }
}
