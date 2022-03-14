import { Controller } from "@hotwired/stimulus"
import { subscribe, unsubscribe } from "../helpers/connection-helpers.js"
import postal from "@weavy/dropin-js/src/common/postal";

export default class extends Controller {

  static values = { apps: Array };  

  badgeHandler = this.badge.bind(this);

  badge(count) {    
    postal.postToParent({ name: "badge", count: count });   
  }

  async connect() {
    console.debug("badge:connected:", this.appsValue.length);
    
    for (var i = 0; i < this.appsValue.length; i++) {            
      let id = this.appsValue[i];

      // initial badge, needed??
      //fetch("/dropin/badge/" + id, { method: "GET" })
      //  .then(response => response.json())
      //  .then(count => {          
      //    this.badgeHandler(count, id);
      //  });

      // realtime
      subscribe(id + ":badge", "badge", this.badgeHandler);    
    }    
  }

  disconnect() {
    console.debug("badge:disconnected:", this.appValue);
    for (var i = 0; i < this.appsValue.length; i++) {
      unsubscribe(this.appsValue[i] + ":badge", "badge", this.badgeHandler);
    }
  }
}
