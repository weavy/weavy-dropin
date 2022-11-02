import * as signalR from "@microsoft/signalr";


const HUB_PATH = "/hubs/rtm";
const EVENT_NAMESPACE = ".connection";
const EVENT_CLOSE = "close";
const EVENT_RECONNECTING = "reconnecting";
const EVENT_RECONNECTED = "reconnected";

var connectionEvents = [];
var groups = [];

const connection = new signalR.HubConnectionBuilder()
  .withUrl(HUB_PATH)
  .withAutomaticReconnect()
  .configureLogging(signalR.LogLevel.Information)
  .build();

const whenConnectionStarted = connection.start();

connection.onclose(error => triggerHandler(EVENT_CLOSE, error));
connection.onreconnecting(error => triggerHandler(EVENT_RECONNECTING, error));
connection.onreconnected(connectionId => triggerHandler(EVENT_RECONNECTED, connectionId));

function triggerHandler(name, ...data) {
  name = name.endsWith(EVENT_NAMESPACE) ? name : name + EVENT_NAMESPACE;
  let event = new CustomEvent(name, { cancelable: false });

  connectionEvents.forEach((eventHandler) => {
    if (eventHandler.name === name) {
      eventHandler.handler(event, ...data);
    }
  });

  if (name === EVENT_RECONNECTED + EVENT_NAMESPACE) {
    // subscribe to signalr groups after reconnect
    for (var i = 0; i < groups.length; i++) {
      connection.invoke("Subscribe", groups[i]);
    }
  }
}

export async function subscribe(group, event, callback) {
  await whenConnectionStarted;
  
  let name = group ? group + ":" + event : event;
  groups.push(name);
  connection.invoke("Subscribe", name);
  connection.on(name, callback);
}

export async function unsubscribe(group, event, callback) {
  await whenConnectionStarted;

  let name = group ? group + ":" + event : event;
  const index = groups.findIndex(e => e === name);

  if (index !== -1) {
    // remove from internal groups array
    groups.splice(index, 1);    
    if (groups.findIndex(e => e === name) === -1) {
      // remove from signalr group if no more listeners exist
      connection.invoke("Unsubscribe", name);
    }
  }
    
  connection.off(name, callback);
}
