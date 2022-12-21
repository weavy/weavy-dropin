import { Controller } from "@hotwired/stimulus"

export default class extends Controller {

  static values = { percent: Number };

  percentValueChanged() {
    var svg = this.element;
    var circle = svg.querySelector("circle[stroke-dashoffset]");
    if (circle) {
      circle.setAttribute("stroke-dashoffset", 100 - this.percentValue);
    }
  }
}
