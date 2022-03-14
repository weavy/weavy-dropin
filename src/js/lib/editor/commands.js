export const weavyKeymap = [{ key: "Ctrl-Enter", run: softSubmit }];

function softSubmit() {
  // dispatch event on the outer codemirror dom element
  const event = new Event("Weavy-SoftSubmit");
  arguments[0].dom.dispatchEvent(event);  
  return true;
}
