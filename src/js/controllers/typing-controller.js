import { Controller } from "@hotwired/stimulus"
import { subscribe, unsubscribe } from "../helpers/connection-helpers.js"
import WeavyConsole from '@weavy/dropin-js/src/common/console';

const console = new WeavyConsole("typing");

export default class extends Controller {

  static values = { app: Number };
  static targets = ["element", "indicator"]
  static classes = ["isTyping"]

  activeTypers = [];
  typingTimeout = null;
  typingHandler = this.typing.bind(this);
  stopTypingHandler = this.stopTyping.bind(this);

  typing(data) {
    
    if (data.appId === this.appValue && data.user.id.toString() !== document.querySelector('body').dataset.userId) {      
      let typers = this.activeTypers;
      // remove existing typing events by this user (can only type in one conversation at a time)
      typers.forEach(function (item, index) {
        if (item.user.id === data.user.id) {
          typers.splice(index, 1);
        }
      });

      // track time when we received this event
      data.time = Date.now();
      typers.push(data);

      this.updateTyping();
    }
  }

  stopTyping(msg) {
    
    if (msg.parent.id === this.appValue) {
      console.debug("stop");
      let typers = this.activeTypers;
      
      // remove typing indicator for message sender
      typers.forEach(function (item, index) {
        if (item.user.id === msg.createdById) {
          typers.splice(index, 1);
        }
      });
            
      this.updateTyping();
    }
  }

  updateTyping() {

    let typers = this.activeTypers;
    
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }

    // discard typing events older than 5 seconds
    var now = Date.now();
    typers.forEach(function (item, index) {
      if (now - item.time > 5 * 1000) {
        typers.splice(index, 1);
      }
    });
    // remove old typing indicators
    this.elementTarget.classList.remove(this.isTypingClass);
    
    if (typers.length) {
      // use age of typing event to animate ellipsis...
      var dots = (Math.round((now - Math.max.apply(null, typers.map(function (x) { return x.time; }))) / 1000) % 3) + 1;
      var ellipsis = (".").repeat(dots) + "<span class=invisible>" + (".").repeat(3 - dots) + "</span>";

      // merge names of people typing
      var names = typers.map((item) => item.user.name).sort();

      var text = "";
      for (var i = 0; i < names.length; i++) {
        if (i > 0) {
          if (i === (names.length - 1)) {
            text += " " + "and" + " ";
          } else {
            text += ", ";
          }
        }
        text += names[i];
      }
      if (names.length === 1) {
        text += " " + "is typing";
      } else {
        text += " " + "are typing";
      }

       // update gui
      this.indicatorTarget.innerHTML = text + ellipsis;
      this.elementTarget.classList.add(this.isTypingClass);

      // schedule another call to updateTyping in 1 second
      this.typingTimeout = setTimeout(this.updateTyping.bind(this), 1000);
    }
  }

  async connect() {
    //console.debug("typing:connected:", this.appValue);
    subscribe(this.appValue + ":typing", "typing", this.typingHandler);
    subscribe(this.appValue + ":message-inserted", "message-inserted", this.stopTypingHandler);
  }

  disconnect() {
    //console.debug("typing:disconnected:", this.appValue);
    unsubscribe(this.appValue + ":typing", "typing", this.typingHandler);
    unsubscribe(this.appValue + ":message-inserted", "message-inserted", this.stopTypingHandler);
  }
}
