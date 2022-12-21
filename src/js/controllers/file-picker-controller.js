import { Controller } from "@hotwired/stimulus"
import postal from "../utils/postal-child";
import WeavyConsole from '../utils/console';
import Modal from 'bootstrap/js/dist/modal';
const console = new WeavyConsole("file-picker");

export default class extends Controller {

  static values = {
    url: { type: String, default: "/dropin/external" }    
  };
  static targets = ["list", "modal", "modalBody"];
  
  handler = this.receiveFiles.bind(this);
  closeHandler = this.close.bind(this);
  modal = null;
  conflicts = [];
  isActive = false;

  connect() {
    console.debug("connected");

    // listen to messages from weavy client    
    postal.on("add-external-blobs", this.handler);
    postal.on("file-browser-closed", this.closeHandler);
  }
    
  open(e) {
    e.preventDefault();

    // set current instance to active
    this.isActive = true;
    
    // open file-browser
    postal.postToParent({ name: "request:file-browser-open" });
  }

  close(e) {    
    // reset active state    
    this.isActive = false;
  }

  receiveFiles(e) {
    console.debug("File(s) received");
        
    if (!this.isActive) return;

    this.attach(e.data.blobs);

    // close file browser
    postal.postToParent({ name: "request:file-browser-close" });

    // reset active state    
    this.isActive = false;

  }

  async attach(blobs) {
    let self = this;

    try {
      var uploaded = await Promise.all(blobs.map(async (b, i) => {
        try {
          let data = JSON.stringify(b);
          let response = await fetch(this.urlValue, {
            method: "POST",
            headers: {
              'Content-Type': 'application/json'
            },
            body: data            
          });

          if (response.ok) {
            
            var html = await response.text();
            self.listTarget.insertAdjacentHTML('beforeend', html);

            return {
              status: "fulfilled"
            };
          } else {            
            return {
              blob: b,
              status: "rejected",
              code: response.status,
              message: await response.text(),
            };
          }
        } catch (error) {
          return {
            blob: b,
            status: "rejected",
            code: error.status,
            message: "Error uploading file",
          };
        }
      })
      );
    } catch (error) {
      console.error("Some files could not be attached:", error)
    }
        
    // check for errors
    self.errors = [];
    uploaded.forEach((result) => {
      if (result.status === "rejected") {
        switch (result.code) {
          case 409:
            console.error(`File ${result.message} already exist!`);
            self.errors.push({ blob: result.blob, message: `File already exists`, error: `File ${result.message} already exist!`, type: 'conflict', conflict_index: self.conflicts.length });
            self.conflicts.push({ blob: result.blob })
            break;
          case 415:
            console.error(`File ${result.blob.name} could not be uploaded! ${result.message}!`);
            self.errors.push({ blob: result.blob, message: `File type not allowed`, error: `File ${result.blob.name} could not be uploaded! ${result.message}`, type: 'error' });
            break;
          case 500:
            console.error(`File ${result.blob.name} could not be uploaded! ${result.message}`);
            self.errors.push({ blob: result.file, message: `File is too `, error: `File ${result.blob.name} could not be uploaded! ${result.message}`, type: 'error' });
            break;
        }
      }
    });

    // display any errors
    if (self.errors.length > 0) {

      // close modal if already showing
      if (self.modal) {
        self.modal.hide();
      }

      self.modal = new Modal(self.modalTarget);

      var modalBody = self.modalBodyTarget;
      modalBody.innerHTML = "";
      // REVIEW: we should avoid unlocalized text in javascript, better to use server rendered html if possible (maybe via turbo stream?)
      for (var i = 0; i < self.errors.length; i++) {
        modalBody.insertAdjacentHTML("beforeEnd", `
<div title="${self.errors[i].error}" class="wy-upload-error-row">
  <div class="wy-upload-error-row-title">${self.errors[i].blob.name}</div>
  <div class="wy-upload-error-row-message ${'wy-upload-error-row-' + self.errors[i].type}">${self.errors[i].message}</div>
${(self.errors[i].type === 'conflict' ? '<div><button class="wy-button wy-button-primary" data-action="click->file-picker#skip">Skip</button> <button class="wy-button wy-button-primary" data-file data-action="click->file-picker#replace" data-file-picker-index-param="' + self.errors[i].conflict_index + '">Replace</button></div>' : '')}
</div>
`);
      }

      self.modal.show();
    }
  }

  //open(e) {
  //  e.preventDefault();
  //  console.log("Open...")
  //  // open file-browser
  //  postal.postToParent({ name: "file-browser-open" });
  //}

  replace(evt) {
    let blobs = [this.conflicts[evt.params.index].blob];
    this.attach(blobs, false, true);

    // remove row
    var modalBody = this.modalBodyTarget;
    modalBody.removeChild(evt.target.parentElement.parentElement);

    // close modal if no more errors
    if (modalBody.children.length === 0) {
      this.modal.hide();
    }
  }

  skip(evt) {
    // remove row
    var modalBody = this.modalBodyTarget;
    modalBody.removeChild(evt.target.parentElement.parentElement);

    // close modal if no more errors
    if (modalBody.children.length === 0) {
      this.modal.hide();
    }
  }

  disconnect() {
    console.debug("disconnected");
    postal.off("add-external-blobs", this.handler);
  }
}
