import * as signalR from "@microsoft/signalr";

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

  console.debug("weavy-realtime:triggerHandler", name);

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
  groups.push(group);
  connection.invoke("AddToGroup", group);
  connection.on(event, callback);
}

export async function unsubscribe(group, event, callback) {
  await isConnectionStarted;
  groups = groups.filter(e => e !== group);
  connection.invoke("RemoveFromGroup", group);  
  connection.off(event, callback);
}
