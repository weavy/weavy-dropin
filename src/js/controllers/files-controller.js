import { Controller } from "@hotwired/stimulus";
import WeavyConsole from '../utils/console';
import Modal from 'bootstrap/js/dist/modal';

const console = new WeavyConsole("files");

export default class extends Controller {

  static values = { app: Number };
  static targets = ["input", "content", "dragzone", "dropzone", "progressBar", "modal", "modalBody"];
  static classes = ["uploading"];
  uploadProgress = [];
  modal = null;
  conflicts = [];

  
  connect() {
    console.debug("connected");

    let that = this;
    let hightlightTimer = null;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      this.dragzoneTarget.addEventListener(eventName, preventDefaults, false)
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      this.dragzoneTarget.addEventListener(eventName, highlight, false)
    });

    ['dragleave', 'drop'].forEach(eventName => {
      this.dragzoneTarget.addEventListener(eventName, unhighlight, false)
    });

    this.dropzoneTarget.addEventListener('drop', this.handleDrop.bind(this), false);

    function preventDefaults(e) {
      e.preventDefault()
      e.stopPropagation()
    }

    function highlight(e) {
      
      if (that.containsFiles(e)) {
        that.dropzoneTarget.classList.add('wy-files-dragging');
        clearTimeout(hightlightTimer);
      }
      
    }

    function unhighlight(e) {
      hightlightTimer = setTimeout(() => that.dropzoneTarget.classList.remove('wy-files-dragging'), 50)
    }

    document.addEventListener("paste", this.handlePaste.bind(this));
  }

  disconnect() {
    document.removeEventListener("paste", this.handlePaste.bind(this));
    this.dropzoneTarget.removeEventListener();
  }

  // check if drag and drop contains files
  containsFiles(evt) {

    if (evt.dataTransfer.types) {
      for (var i = 0; i < evt.dataTransfer.types.length; i++) {
        if (evt.dataTransfer.types[i] === "Files") {
        return true;
      }
    }
  }

  return false;

}

  // Selected file(s) from file dialog
  handleSelect() {    
    this.conflicts = [];
    this.handleFiles(this.inputTarget.files);
    this.inputTarget.value = '';
  }

  // Dropped file(s)
  handleDrop(evt) {
    console.debug('File(s) dropped');

    if (this.modalTarget.classList.contains("show")) return;

    let dt = evt.dataTransfer;
    let files = dt.files;

    if (!files.length) { return; }

    this.conflicts = [];
    this.handleFiles(files);    
    
  }

  // Pasted file(s)
  handlePaste(evt) {

    console.debug('File(s) pasted');

    if (this.modalTarget.classList.contains("show")) return;

    let files = [];    
    const items = (evt.clipboardData || evt.originalEvent.clipboardData).items;
    for (let index in items) {
      const item = items[index];
      if (item.kind === 'file') {
        files = [...files, item.getAsFile()];
      }
    }

    if (!files.length) { return; }

    this.conflicts = [];

    this.handleFiles(files);

  }


  // Prepare for upload
  async handleFiles(files, force = false) {
    const content = this.contentTarget;
    var that = this;
    files = [...files];
    this.initializeProgress(files.length);

    try {
      var uploaded = await Promise.all(files.map(async (f, i) => {

        try {
          let response = await this.upload(f, i, force);

          // remove existing file row if replacing file
          if (force) {
            var existing = content.querySelector(`[data-preview-title-param="${f.name}" i]`);
            if (existing) {
              content.removeChild(existing);
            }
          }

          const placeholder = document.createElement("tbody");
          placeholder.innerHTML = response.target.responseText;
          while (placeholder.firstElementChild) {
            content.append(placeholder.firstElementChild);
          }

          return {
            status: "fulfilled"
          };
        } catch (error) {
          return {
            file: f,
            status: "rejected",
            code: error.statuscode, // Will be `undefined` if not an HTTP error
            message: that.isJsonString(error.message) ? (JSON.parse(error.message).detail || JSON.parse(error.message).title) : error.message,
          };
        }

      })
      );

    } catch (error) {
      console.error("Some files could not be uploaded:", error)
    }

    // check for errors
    that.errors = [];
    uploaded.forEach((result) => {
      if (result.status === "rejected") {
        switch (result.code) {
          case 409:
            console.error(`File ${result.message} already exist!`);
            that.errors.push({ file: result.file, message: "File already exists", error: `File ${result.message} already exist!`, type: 'conflict', conflict_index: that.conflicts.length });
            that.conflicts.push({ file: result.file})
            break;
          case 415:
            console.error(`File ${result.file.name} could not be uploaded! ${result.message}!`);
            that.errors.push({ file: result.file, message: "File type not allowed", error: `File ${result.file.name} could not be uploaded! ${result.message}`, type: 'error' });            
            break;
          case 400:
          case 403:
          case 500:
            console.error(`File ${result.file.name} could not be uploaded! ${result.message}`);
            that.errors.push({ file: result.file, message: "File could not be uploaded", error: `File ${result.file.name} could not be uploaded! ${result.message}`, type: 'error' });
            break;
        }
      }
    });
    
    // display any errors
    if (that.errors.length > 0) {

      // close modal if already showing
      if (this.modal) {
        this.modal.hide();
      }

      this.modal = new Modal(that.modalTarget);
      
      var modalBody = that.modalBodyTarget;
      modalBody.innerHTML = "";
      // REVIEW: we should avoid unlocalized text in javascript, better to use server rendered html if possible (maybe via turbo stream?)
      for (var i = 0; i < that.errors.length; i++) {
        modalBody.insertAdjacentHTML("beforeEnd", `
<div title="${that.errors[i].error}" class="wy-upload-error-row">
  <div class="wy-upload-error-row-title">${that.errors[i].file.name}</div>
  <div class="wy-upload-error-row-message ${'wy-upload-error-row-' + that.errors[i].type}">${that.errors[i].message}</div>
${(that.errors[i].type === 'conflict' ? '<div><button class="wy-button wy-button-primary" data-action="click->files#skip">Skip</button> <button class="wy-button wy-button-primary" data-file data-action="click->files#replace" data-files-index-param="' + that.errors[i].conflict_index + '">Replace</button></div>' : '')}
</div>
`);
      }

      this.modal.show();
    }

    this.progressBarTarget.style.visibility = 'hidden';
  }

  // trigger file selection
  select(e) {
    e.preventDefault();
    this.inputTarget.click();
  }
    
  // init progress bar
  initializeProgress(numFiles) {
    this.progressBarTarget.value = 0
    this.uploadProgress = []

    for (let i = numFiles; i > 0; i--) {
      this.uploadProgress.push(0)
    }

    this.progressBarTarget.style.visibility = 'visible';
  }

  // update progress bar
  updateProgress(i, progress) {
    this.uploadProgress[i] = progress
    let total = this.uploadProgress.reduce((tot, curr) => tot + curr, 0) / this.uploadProgress.length;
    this.progressBarTarget.value = total;
  }

  upload(file, i, force = false) {
    let that = this;

    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      var url = `/dropin/files/${that.appValue}/upload?force=${force}`;
      let data = new FormData();

      data.append("blob", file);      
      xhr.open('POST', url, true);

      xhr.upload.addEventListener("progress", function (e) {
        that.updateProgress(i, (e.loaded * 100.0 / e.total) || 100)
      })

      xhr.onload = (evt) => {
        if (evt.target.status === 200) { resolve(evt); }
        else { reject({ index: i, message: evt.target.responseText, blob: file, statuscode: evt.target.status }); }
      };
      xhr.onerror = reject;
      xhr.send(data);
    });
  }

  replace(evt) {    
    let files = [this.conflicts[evt.params.index].file];
    this.handleFiles(files, true);

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

  isJsonString(str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }
}
