import { Controller } from "@hotwired/stimulus";
import { renderStreamMessage } from "@hotwired/turbo";
import WeavyConsole from "../utils/console";

const console = new WeavyConsole("meetings");

export default class extends Controller {

  static targets = ["list"];
  static classes = ["uploading"];
  static values = {
    zoomAuthenticationUrl: String,
    teamsAuthenticationUrl: String,
  };

  handler = this.handleMessages.bind(this);

  connect() {
    console.debug("connected");
    window.addEventListener("message", this.handler)
  }

  disconnect() {
    console.debug("disconnected");
    window.removeEventListener("message", this.handler)
  }

  handleMessages(e) {
    
    switch (e.data.name) {
      case "zoom-signed-in":
        this.recreateMeeting("zoom");
        break;

      case "teams-signed-in":
        this.recreateMeeting("teams");
        break;
    }
  }

  recreateMeeting(provider) {
    
    const data = new FormData();
    data.append("provider", provider);

    fetch("/dropin/meeting", { headers: { Accept: "text/vnd.turbo-stream.html" }, method: "PUT", body: data })
      .then(response => response.text())
      .then(html => {
        renderStreamMessage(html);
      });
  }

  signIn(e) {
    e.preventDefault();

    const provider = e.params.provider;
    const state = e.params.state;

    console.debug("signIn:" + provider + ":" + state);

    switch (provider) {
      case "zoom": {
        const zoomAuthUrl = this.zoomAuthenticationUrlValue + "&state=" + state;

        //location.href = zoomAuthUrl;

        //return;
        window.open(zoomAuthUrl,
          "zoomAuthWin",
          "height=640,width=480");
        break;
      }
      case "teams": {
        const teamsAuthUrl = this.teamsAuthenticationUrlValue;

        window.open(teamsAuthUrl,
          "teamsAuthWin",
          "height=640,width=480");
        break;
      }
    }

  }

  clearMeetings(provider) {
    console.debug("clear");

    const list = this.listTarget;
    while (list.firstChild) {
      list.removeChild(list.firstChild);
    }
  }

  signOut(e) {
    console.debug("signOut");

    e.preventDefault();

    const provider = e.params.provider;

    const data = new FormData();
    var qs = "?provider=" + provider;
    fetch("/dropin/meeting/signout" + qs, { method: "POST", body: data })
      .then(response => response.text())
      .then(html => {
        this.clearMeetings(provider);
      });
  }



  add(e) {
    console.debug("add:" + event.params.provider);

    const list = this.listTarget;
    if (list.childElementCount > 0) return;

    const data = new FormData();
    data.append("provider", e.params.provider);

    // hide icon and show spinner
    this.element.classList.add(this.uploadingClass);

    fetch("/dropin/meeting", { method: "POST", body: data })
      .then(response => response.text())
      .then(html => {
        // parse incoming html into DOM elements and append to list
        const placeholder = document.createElement("div");
        placeholder.innerHTML = html;
        while (placeholder.firstElementChild) {
          list.append(placeholder.firstElementChild);
        }

        // show icon and hide spinner
        this.element.classList.remove(this.uploadingClass);
      });
  }

  // remove meeting from list
  remove(e) {
    e.currentTarget.parentElement.parentElement.remove();
  }

}
