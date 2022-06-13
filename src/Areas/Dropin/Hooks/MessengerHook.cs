using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using Weavy.Core.Events;
using Weavy.Core.Models;
using Weavy.Core.Services;
using Weavy.Core.Utils;

namespace Weavy.Dropin.Areas.Dropin.Hooks;

[Guid("0886F409-D12C-4DBE-9DCC-94FE2C915C21")]
public class MessengerHook : IHook<AfterReadConversation> {

    /// <summary>
    /// Updates the read-at indicator when a conversation is read / un-read.
    /// </summary>
    /// <param name="e"></param>
    public void Handle(AfterReadConversation e) {
        string template;

        if (e.Member.ReadAt == null) {
            // remove readat indicator
            template = @$"<turbo-stream action=""remove"" target=""readby-{e.Member.Id}""></turbo-stream>";
        } else {
            // append new readat indicator, readby stimulus controller will move the indicator to the correct position
            // IMPORTANT: match content with the _ReadBy partial
            template = @$"<turbo-stream action=""append"" target=""readby-append""><template><img id=""readby-{e.Member.Id}"" src=""{e.Member.AvatarUrl(18)}"" width=""18"" height=""18"" alt="""" class=""{ConfigurationService.ThemePrefix}-avatar"" hidden title=""{string.Format(CultureInfo.InvariantCulture, "Seen by {0} {1}", e.Member.GetDisplayName(), e.Member.ReadAt.Value.When())}"" data-controller=""readby"" data-readby-who-value=""{e.Member.Id}"" data-readby-when-value=""{e.Member.ReadAt.AsSortableDate()}""></template></turbo-stream>";
        }
        PushService.PushToGroup(e.Conversation.Uid(), "turbo-stream", template);
    }
}
