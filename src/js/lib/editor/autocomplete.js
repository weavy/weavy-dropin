import { pickedCompletion } from "@codemirror/autocomplete";

let typed = null;

export async function autocomplete(context) {
  let before = context.matchBefore(/(?<!\]\()@[^@]+/);

  // If completion wasn't explicitly started and there
  // is no word before the cursor, don't open completions.
  if (!context.explicit && !before) return null

  typed = before.text.substring(1);

  const response = await fetch("/api/users/autocomplete?id=" + document.body.dataset['appId'] + "&q=" + typed, {
    credentials: "include"
  });
  const result = await response.json();

  let completions = [];

  if (result.data) {
    completions = result.data.filter(item => typeof (item.display_name) !== 'undefined').map((item) => {
      return {        
        item: item,
        label: item.display_name,
        apply: function (view, completion, from, to) {
          var toInsert = "[" + item.display_name + "](@u" + item.id.toString() + ")";
          var transaction = view.state.update({ changes: { from: from - 1, to: from } });
          view.dispatch(transaction);
          transaction = view.state.update({ changes: { from: from - 1, to: to - 1, insert: toInsert } });
          view.dispatch(transaction);
          view.dispatch(pickedCompletion);
        }      
      }
    });
  }

  return {
    from: before ? before.from + 1 : context.pos,
    options: completions,
    filter: false
  }
}
