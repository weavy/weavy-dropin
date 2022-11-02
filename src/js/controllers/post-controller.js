import { Controller } from '@hotwired/stimulus';

export default class extends Controller {

  static targets = ["comments", "placeholder"];

  // inject a placeholder post that will be visible during the submit phase
  showPlaceholder(data) {

    // clone placeholder
    let clone = this.placeholderTarget.cloneNode(true);
    // copy domid from placeholder data-id attribute to clone.id
    clone.id = this.placeholderTarget.dataset.id;

    // split content into words and wrap in span.wy-placeholder
    var text = data.detail.content.trim();
    if (text.length) {
      const lines = text.split(/(\n+)/);
      const html = lines.map((l) => {
        const words = l.split(/(\s+)/);
        return `<div>${words.map(str => `<span class="wy-placeholder">${str}</span>`).join(" ")}</div>`;
      }).join(" ");
      clone.querySelector(".wy-content").innerHTML = html;
    } else {
      // keep default "lorem ipsum..."
    }

    // add clone after placeholder
    this.placeholderTarget.after(clone);

    // show cloned placeholder
    clone.hidden = false;
  }

  toggleComments(e) {
    e.preventDefault()
    e.stopPropagation()
    // toggle hidden attribute -> when shown it will trigger the lazy loading of comments
    this.commentsTarget.hidden = !this.commentsTarget.hidden;
  }

}
