using System;
using System.Globalization;
using System.Runtime.InteropServices;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.SignalR;
using Weavy.Core.Events;
using Weavy.Core.Hubs;
using Weavy.Core.Models;
using Weavy.Core.Services;
using Weavy.Core.Utils;
using Weavy.Dropin.Controllers;


namespace Weavy.Dropin.Hooks;

/// <summary>
/// A hook for the drop-in ui.
/// </summary>
[Guid("DCF0585D-F97B-4D94-93E3-4989A19D988B")]
public class DropinHook : IHook<AfterInsertNotification>,
    IHook<AfterInsertMessage>,     
    IHook<AfterReaction>,
    IHook<AfterReadConversation> {

    private readonly IHubContext<RealTimeHub> _hubContext;
    private readonly LinkGenerator _linkGenerator;

    /// <summary>
    /// 
    /// </summary>
    /// <param name="hubContext"></param>
    /// <param name="linkGenerator"></param>    
    public DropinHook(IHubContext<RealTimeHub> hubContext, LinkGenerator linkGenerator) {
        _hubContext = hubContext;
        _linkGenerator = linkGenerator;
    }

    /// <summary>
    /// Notify followers and mentioned users when a notification is created.
    /// </summary>
    /// <param name="e"></param>        
    public void Handle(AfterInsertNotification e) {
        // u13:ui => url
        InvokeTurboFetch($"u{e.Inserted.UserId}:{PushService.EVENT_UI}", GetUrl(nameof(NotificationsController.TurboStreamInsertNotification), typeof(NotificationsController).ControllerName(), new { area = Constants.AREA_NAME, id = e.Inserted.Id }));
    }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="e"></param>        
    public void Handle(AfterReaction e) {
        // a23:ui => url
        InvokeTurboFetch($"a{EntityUtils.ResolveAppId(e.Entity)}:{PushService.EVENT_UI}", GetUrl(nameof(EntityController.TurboStreamToggleReaction), typeof(EntityController).ControllerName(), new { area = Constants.AREA_NAME, id = e.Entity.Uid() }));
    }

    /// <summary>
    /// Notify users when a new <see cref="Message"/> is created.
    /// </summary>
    /// <param name="e"></param>        
    public void Handle(AfterInsertMessage e) {
        var message = e.Inserted;

        var app = EntityUtils.ResolveApp(message);

        if (app is Conversation) {

            // a1:ui => url
            InvokeTurboFetch($"{app.Uid()}:{PushService.EVENT_UI}", GetUrl(nameof(MessengerController.TurboStreamInsertMessage), typeof(MessengerController).ControllerName(), new { area = Constants.AREA_NAME, id = e.Context?.Id, messageId = message.Id }));

            if (app is ChatRoom || app is PrivateChat) {
                // notify messenger (users in conversation)
                // u341:ui => url
                foreach (var memberId in app.MemberIds) {
                    InvokeTurboFetch($"u{memberId}:{PushService.EVENT_UI}", GetUrl(nameof(MessengerController.TurboStreamInsertConversation), typeof(MessengerController).ControllerName(), new { area = Constants.AREA_NAME, id = e.Context?.Id, conversationId = app.Id }));
                }
            }
        } else if (app is Posts) {
            // a12:ui => url
            InvokeTurboFetch($"{app.Uid()}:{PushService.EVENT_UI}", GetUrl(nameof(PostsController.TurboStreamInsertPost), typeof(PostsController).ControllerName(), new { area = Constants.AREA_NAME, id = message.Uid() }));
        } else if (app is Comments) {
            // a5:ui => url
            InvokeTurboFetch($"{app.Uid()}:{PushService.EVENT_UI}", GetUrl(nameof(CommentsController.TurboStreamInsertComment), typeof(CommentsController).ControllerName(), new { area = Constants.AREA_NAME, id = message.Uid() }));
        }
    }

    /// <summary>
    /// Notifies conversation members that someone read the conversation.
    /// </summary>
    /// <param name="e"></param>    
    public void Handle(AfterReadConversation e) {
        string template;

        if (e.Member.ReadAt == null) {
            // remove readat indicator
            template = @$"<turbo-stream action=""remove"" target=""readby-{e.Member.Id}""></turbo-stream>";
        } else {
            // append new readat indicator, readby stimulus controller will move the indicator to the correct position
            // IMPORTANT: match content with the _ReadAt partial
            template = @$"<turbo-stream action=""append"" target=""readby-append""><template><img id=""readby-{e.Member.Id}"" src=""{e.Member.AvatarUrl(18)}"" width=""18"" height=""18"" alt="""" class=""rounded-circle d-none"" title=""{string.Format(CultureInfo.InvariantCulture, "Seen by {0} {1}", e.Member.GetTitle(), e.Member.ReadAt.Value.When())}"" data-controller=""readby"" data-readby-who-value=""{e.Member.Id}"" data-readby-when-value=""{e.Member.ReadAt.AsSortableDate()}""></template></turbo-stream>";
        }
        _hubContext.Clients.Group($"{e.Conversation.Uid()}:{PushService.EVENT_UI}").SendAsync("turbo-stream", template);
    }

    /// <summary>
    /// Generates an url from an action, controller and route values
    /// </summary>
    /// <param name="action">The action.</param>
    /// <param name="controller">The controller.</param>
    /// <param name="values">The route values.</param>
    /// <returns></returns>
    private string GetUrl(string action, string controller, object values) {
        return _linkGenerator.GetPathByAction(action, controller, values);
    }

    /// <summary>
    /// Invoke "turbo-fetch" method on connections in the specified group.
    /// </summary>
    /// <param name="groupName">The name of the group.</param>
    /// <param name="url">The url to fetch the content from</param>
    private void InvokeTurboFetch(string groupName, string url) {
        _hubContext.Clients.Group(groupName).SendAsync("turbo-fetch", url);
    }
}
