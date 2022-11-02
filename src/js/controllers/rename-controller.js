import { Controller } from "@hotwired/stimulus";

export default class extends Controller {

  static targets = ["name", "form", "input", "submit"];

  #oldname = "";
  #newname = "";
  #editing = true;

  nameTargetConnected(el) {
    this.#oldname = this.nameTarget.innerText;
  }

  inputTargetConnected(el) {
    el.addEventListener("keydown", (e) => {
      if (e.code === "Escape") {
        // reset input to prevent submit
        this.inputTarget.value = this.#oldname;
        this.close();
      }
    });

    el.addEventListener("change", (e) => {
      // we only track that a change happened, submit is handled by blur
      this.#newname = this.inputTarget.value;
    });

    el.addEventListener("blur", (e) => {
      // cannot do formTarget.submit() since it bypasses turbo-stream functionality, instead we trigger a click on the (hidden) submit button
      this.submitTarget.click();
    });

    // open if invalid
    if (el.classList.contains("wy-is-invalid")) {
      this.nameTarget.hidden = true;
      this.formTarget.hidden = false;
      this.focus();
    }
  }

  formTargetConnected(el) {
    this.#editing = true;

    el.addEventListener("submit", (e) => {

      if (!this.#editing) {
        e.preventDefault();
        return false;
      }

      this.#editing = false;

      if (this.#newname.trim().length === 0 || this.#newname === this.#oldname) {
        // no change, prevent submit
        e.preventDefault();
        // restore input to original value (only needed when blank)
        this.inputTarget.value = this.#oldname;
      } else {
        // optimistic update for better perceived performance
        this.nameTarget.innerText = this.#newname;
      }
      this.close();
    });
  }

  open() {
    this.nameTarget.hidden = true;
    this.formTarget.hidden = false;

    // fix for renaming cards. Better way?
    if (this.element.classList.contains("wy-card-hover")) {
      this.element.classList.remove("wy-card-hover")
    }

    this.focus();
  }

  focus() {
    // focus and select file name without extension
    this.inputTarget.focus();
    const i = this.inputTarget.value.lastIndexOf(".");
    if (i === -1) {
      this.inputTarget.select();
    } else {
      this.inputTarget.setSelectionRange(0, i);
    }
  }

  close() {
    this.nameTarget.hidden = false;
    this.formTarget.hidden = true;
  }
}
