import * as signalR from "@microsoft/signalr";
import WeavyConsole from './console';

const console = new WeavyConsole("realtime");

const HUB_PATH = "/hubs/rtm";
const EVENT_NAMESPACE = ".connection";
const EVENT_CLOSE = "close";
const EVENT_RECONNECTING = "reconnecting";
const EVENT_RECONNECTED = "reconnected";
let connectionEvents = [];
let groups = [];

function triggerHandler(name, ...data) {
  name = name.endsWith(EVENT_NAMESPACE) ? name : name + EVENT_NAMESPACE;
  let event = new CustomEvent(name, { cancelable: false });

  console.debug("triggerHandler", name);

  connectionEvents.forEach((eventHandler) => {
    if (eventHandler.name === name) {
      eventHandler.handler(event, ...data);
    }
  });

  if (name === EVENT_RECONNECTED + EVENT_NAMESPACE) {
    // re-add to signalr groups after reconnect
    for (var i = 0; i < groups.length; i++) {
      connection.invoke("AddToGroup", groups[i]);
    }
  }
}

let connection = connection = new signalR.HubConnectionBuilder()
  .withUrl(HUB_PATH)
  .withAutomaticReconnect()
  .configureLogging(signalR.LogLevel.Information)
  .build();

const isConnectionStarted = connection.start();

connection.onclose(error => triggerHandler(EVENT_CLOSE, error));
connection.onreconnecting(error => triggerHandler(EVENT_RECONNECTING, error));
connection.onreconnected(connectionId => triggerHandler(EVENT_RECONNECTED, connectionId));

export async function subscribe(group, event, callback) {
  await isConnectionStarted;
  
  let name = group ? group + ":" + event : event;
  groups.push(name);
  connection.invoke("AddToGroup", name);
  connection.on(name, callback);
}

export async function unsubscribe(group, event, callback) {
  await isConnectionStarted;

  let name = group ? group + ":" + event : event;    
  const index = groups.findIndex(e => e === name);

  if (index !== -1) {
    groups = groups.splice(index, 1);    
    if (!groups.find(e => e === name)) {
      connection.invoke("RemoveFromGroup", name);
    }
    
  }
    
  connection.off(name, callback);
}
