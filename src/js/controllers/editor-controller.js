import { Controller } from "@hotwired/stimulus"
import { EditorView, keymap, placeholder, dropCursor } from "@codemirror/view"
import { EditorState } from "@codemirror/state"
import { markdown } from "@codemirror/lang-markdown"
import { languages } from "@codemirror/language-data"
import { weavyKeymap } from "../lib/editor/commands"
import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language"
import throttle from "underscore/modules/throttle"
import { autocompletion } from "@codemirror/autocomplete"
import { autocomplete } from "../lib/editor/autocomplete"
import { mentions } from "../lib/editor/mentions"
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"

export default class extends Controller {

  static targets = ["container", "control", "form", "button", "attachments", "meetings", "polls", "placeholder"];
  static values = {
    autofocus: { type: Boolean, default: false },
    placeholder: { type: String, default: "" },
    draft: { type: Boolean, default: true },
    typing: { type: Boolean, default: false }
  };

  appId = document.querySelector("body").dataset.appId;
  editor;
  throttledTyping;

  connect() {
    let that = this;

    // define extensions
    let extensions = [
      autocompletion({
        override: [autocomplete],
        closeOnBlur: false,
        icons: false,
        addToOptions: [
          {
            render: function (completion, state) {
              let div = document.createElement("div");
              div.classList.add("wy-item");
              div.classList.add("wy-item-hover");

              if (!completion.item.is_member) {
                div.classList.add("wy-disabled");
              }

              let img = document.createElement("img");
              img.classList.add("wy-avatar");
              img.src = completion.item.avatar_url;

              let name = document.createElement("div");
              name.classList.add("wy-item-body");
              name.innerText = (completion.item.display_name);

              div.appendChild(img);
              div.appendChild(name);
              return div;
            },
            position: 10
          }
        ]
      }),
      history(),
      dropCursor(),
      mentions,
      placeholder(this.placeholderValue),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      EditorView.lineWrapping,
      keymap.of([...weavyKeymap]),
      markdown({ codeLanguages: languages }),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap
      ]),
      EditorView.domEventHandlers({
        paste(e, original, f) {
          let files = [];
          const items = (e.clipboardData || e.originalEvent.clipboardData).items;
          for (let index in items) {
            const item = items[index];
            if (item.kind === 'file') {
              files = [...files, item.getAsFile()];
            }
          }

          that.dispatch("filePasted", { detail: files })
        }
      })
    ];

    // hook up typing
    this.throttledTyping = throttle(function () { that.sendTyping() }, 2000);

    extensions.push(EditorView.updateListener.of(update => {
      // REVIEW: should probably reset state or something to stop typing after a message has been submitted, instead of checking if text is empty
      let content = this.editor.state.doc.toString();

      if (update.docChanged && content.length > 0) {
        if (this.typingValue) {
          this.throttledTyping();
        }
        this.sendDocUpdated(content);
      }
    }));

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
    if (this.autofocusValue) {
      this.editor.focus();
    }

    // listen for custom event (ctrl+enter)
    this.containerTarget.querySelector(".cm-editor").addEventListener("Weavy-SoftSubmit", this.submitForm.bind(this));

    // save unsent message on close tab
    window.addEventListener("beforeunload", (e) => {
      that.saveDraft();
      delete e["returnValue"];
    });
  }

  sendTyping() {
    fetch("/dropin/messenger/" + this.appId + "/typing", { method: "POST" }).catch(err => { /* deal with error */ });
  }

  sendDocUpdated(content) {
    this.dispatch("updated", { detail: { content: content } })
  }

  submitForm() {
    this.buttonTarget.click();
  }

  saveDraft() {

    if (!this.draftValue) return;
    // save text
    // TODO: should also persist blobs, meetings etc.
    let key = "text:" + this.appId;
    let value = this.editor.state.doc.toString();

    if (value && value.length) {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  }

  restoreDraft() {
    if (!this.draftValue) return;

    // restore text
    // TODO: should also restore blobs, meetings etc.
    let key = "text:" + this.appId;
    let value = localStorage.getItem(key);

    if (value && value.length) {
      this.editor.dispatch({ changes: { from: 0, to: this.editor.state.doc.length, insert: value } });
    }
  }

  prepare() {

    this.controlTarget.value = this.editor.state.doc.toString();

    if (this.controlTarget.value !== "" || this.attachmentsTarget.children.length > 0 || (this.hasMeetingsTarget && this.meetingsTarget.children.length > 0) || (this.hasPollsTarget && this.pollsTarget.children.length > 0)) {
      this.dispatch("placeholder", { detail: { content: this.controlTarget.value } })
    }

    // clear text
    this.editor.dispatch({ changes: { from: 0, to: this.editor.state.doc.length, insert: "" } });

    if (this.throttledTyping) {
      this.throttledTyping.cancel();
    }
  }

  disconnect() {
    this.editor.destroy();
    this.saveDraft();
  }
}
