import { Controller } from "@hotwired/stimulus"
import { EditorView, keymap, placeholder } from "@codemirror/view"
import { EditorState } from "@codemirror/state"
import { classHighlightStyle, defaultHighlightStyle } from "@codemirror/highlight"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { weavyKeymap } from "../lib/editor/commands"
import { b64toBlob } from "../utils/conversion-helpers"
import WeavyConsole from '../utils/console';
import throttle from "underscore/modules/throttle";
import { prefix } from "../utils/styles";

const console = new WeavyConsole("editor");

export default class extends Controller {

  static targets = ["container", "control", "form", "button", "attachments", "meetings"];
  static values = {
    typing: Boolean
  };

  appId = document.querySelector("body").dataset.appId;
  editor;
  throttledTyping;

  connect() {
    console.debug("connected");

    // define extensions
    var extensions = [
      placeholder(this.controlTarget.getAttribute("placeholder")),
      classHighlightStyle,
      defaultHighlightStyle,
      EditorView.lineWrapping,
      keymap.of([...weavyKeymap]),
      EditorView.domEventHandlers({
        paste(e, original, f) {
          var matchType = /image*/;
          var clipboardData = event.clipboardData;

          Array.prototype.forEach.call(clipboardData.types, function (type, i) {

            // if is image
            if (type.match(matchType) || clipboardData.items[i].type.match(matchType)) {
              var file = clipboardData.items[i].getAsFile();
              var reader = new FileReader();
              reader.onload = function (evt) {
                var contents = evt.target.result;
                var block = contents.split(";");
                // get the content type of the image
                var contentType = block[0].split(":")[1];// In this case "image/gif"
                // get the real base64 content of the file
                var realData = block[1].split(",")[1];// In this case "R0lGODlhPQBEAPeoAJosM...."
                // convert it to a blob to upload
                var blob = b64toBlob(realData, contentType);
                var fileOfBlob = new File([blob], file.name, { type: contentType });
                // dispatch event
                window.dispatchEvent(new CustomEvent("imagePasted", { detail: fileOfBlob }));
              };
              reader.readAsDataURL(file);
            }
          });
        }
      }),
      markdown({
        base: markdownLanguage
      })];

    let that = this;

    // hook up typing
    if (this.typingValue) {
      this.throttledTyping = throttle(function () { that.sendTyping() }, 2000);

      extensions.push(EditorView.updateListener.of(update => {
        // REVIEW: should probably reset state or something to stop typing after a message has been submitted, instead of checking if text is empty
        if (update.docChanged && this.editor.state.doc.toString().length > 0) {
          this.throttledTyping();
        }
      }));
    }

    // create editor
    this.editor = new EditorView({
      state: EditorState.create(
        {
          doc: this.controlTarget.value,
          extensions: extensions
        }
      ),
      parent: this.containerTarget,
    });

    // restore any unsent messages
    this.restoreDraft();

    // set focus to editor
    this.editor.focus();

    // listen for custom event (ctrl+enter)
    this.containerTarget.querySelector(".cm-editor").addEventListener("Weavy-SoftSubmit", this.submitForm.bind(this));

    // save unsent message on close tab
    window.addEventListener("beforeunload", (e) => {
      that.saveDraft();
      delete e["returnValue"];
    });
  }

  sendTyping() {
    console.debug("sendtyping")
    fetch("/dropin/messenger/" + this.appId + "/typing", { method: "POST" }).catch(err => { /* deal with error */ });
  }

  submitForm() {
    this.buttonTarget.click();
  }

  saveDraft() {
    // save text
    // TODO: should also persist blobs, meetings etc.
    var key = "text:" + this.appId;
    var value = this.editor.state.doc.toString();

    if (value && value.length) {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  }

  showPlaceholder(text) {
    // show placeholder
    let placeHolder = document.getElementById("message-placeholder");
    let clone = placeHolder.cloneNode(true);
    clone.querySelector(prefix('.message-text')).innerText = text;
    clone.hidden = false;
    clone.id = "message-ph";

    let messages = document.getElementById("messages");
    messages.appendChild(clone);
    document.scrollingElement.scrollTop = 99999999999;
  }

  restoreDraft() {
    // restore text
    // TODO: should also restore blobs, meetings etc.
    var key = "text:" + this.appId;
    var value = localStorage.getItem(key);

    if (value && value.length) {
      this.editor.dispatch({ changes: { from: 0, to: this.editor.state.doc.length, insert: value } });
    }
  }

  prepare() {
    console.debug("prepare");
    this.controlTarget.value = this.editor.state.doc.toString();

    if (this.controlTarget.value !== "" || this.attachmentsTarget.hasChildNodes() || this.meetingsTarget.hasChildNodes()) {
      this.showPlaceholder(this.controlTarget.value);
    }

    // clear text
    this.editor.dispatch({ changes: { from: 0, to: this.editor.state.doc.length, insert: "" } });

    if (this.throttledTyping) {
      this.throttledTyping.cancel();
    }
  }

  disconnect() {
    console.debug("disconnect");
    this.editor.destroy();
    this.saveDraft();
  }
}
