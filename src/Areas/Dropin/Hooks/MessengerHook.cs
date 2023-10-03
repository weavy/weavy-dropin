using System;
using System.Globalization;
using System.Runtime.InteropServices;
using Weavy.Core.Events;
using Weavy.Core.Models;
using Weavy.Core.Mvc;
using Weavy.Core.Services;
using Weavy.Core.Utils;

namespace Weavy.Dropin.Areas.Dropin.Hooks;

[Guid("0886F409-D12C-4DBE-9DCC-94FE2C915C21")]
public class MessengerHook : IHook<ConversationMarked> {

    /// <summary>
    /// Updates the "read by" indicator when a conversation is read/unread.
    /// </summary>
    /// <param name="e"></param>
    public async void Handle(ConversationMarked e) {
        string template;

        if (e.MarkedId == null) {
            // remove "read by" indicator
            template = @$"<turbo-stream action=""remove"" target=""readby-{e.Actor.Id}""></turbo-stream>";
        } else {
            // append new "read by" indicator (stimulus controller will move the indicator to the correct position)            
            var domId = TurboStreamHelper.DomId("/Areas/dropin/Views/Shared/_ReadBy.cshtml", "m" + e.MarkedId.Value);

            // NOTE: must match markup in _ReadBy.cshtml
            template = $"""
            <turbo-stream target="{domId}" action="append">
                <template>
                    <img id="readby-{e.Actor.Id}" class="wy-avatar" src="{e.Actor.AvatarUrl(18)}" width="18" height="18" alt="" title="Seen by {e.Actor.DisplayName} {e.MarkedAt.Value.When()}" data-controller="readby" data-readby-who-value="{e.Actor.Id}" hidden>
                </template>
            </turbo-stream>
            """;
        }
        await PushService.PushToGroupAsync(e.Conversation.Eid(), "read_by", template);
    }
}
