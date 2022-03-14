import { Controller } from "@hotwired/stimulus"
import postal from "@weavy/dropin-js/src/common/postal";

export default class extends Controller {

  static targets = ["list"];

  handler = this.receiveFiles.bind(this);

  connect() {
    console.debug("file-picker:connected");

    // listen to messages from weavy client    
    postal.on("addExternalBlobs", this.handler);
  }

  receiveFiles(e) {
    console.debug("Files received from client: ", e.data);

    this.attach(e.data.blobs, e.data.open);

    // close file browser
    postal.postToParent({ name: "file-browser-close" });

  }

  attach(blobs, open) {
    console.debug("file-picker:attach");
    let self = this;

    // insert external blobs 
    let data = JSON.stringify(blobs);
    fetch("/dropin/externalblobs", {
      method: "POST", body: data, headers: {
        'Content-Type': 'application/json'
      }
    }).then((response) => {
      if (!response.ok) {
        throw Error(response.statusText);        
      }      
      
      return response.text();
    })
      
      .then(html => {        
        self.listTarget.insertAdjacentHTML('beforeend', html);        
      }).catch((err) => {
        console.error("Weavy: Error attaching external blobs. Check the logfile for more information.", err)
      });
  }

  open(e) {
    e.preventDefault();

    // open file-browser
    postal.postToParent({ name: "file-browser-open" });
  }


  disconnect() {
    console.debug("file-picker:disconnected");
    postal.off("addExternalBlobs", this.handler);
  }
}
