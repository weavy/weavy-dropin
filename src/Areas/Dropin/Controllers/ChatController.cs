using System;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Weavy.Core.Http;
using Weavy.Core.Hubs;
using Weavy.Core.Models;
using Weavy.Core.Mvc;
using Weavy.Core.Services;
using Weavy.Dropin.Models;

namespace Weavy.Dropin.Controllers;

/// <summary>
/// Controller for the <see cref="Chat"/> app.
/// </summary>
public class ChatController : AreaController {

    private readonly IHubContext<RealTimeHub> _hubContext;

    /// <summary>
    /// 
    /// </summary>
    public ChatController(IHubContext<RealTimeHub> hubContext) {
        _hubContext = hubContext;
    }

    /// <summary>
    /// Display specified chat app.
    /// </summary>
    /// <param name="id">App id.</param>
    /// <param name="query">Query options for paging etc.</param>
    /// <returns></returns>
    [HttpGet("{id:int}")]
    public IActionResult Get(int id, MessageQuery query) {
        var app = ConversationService.Get<Chat>(id);
        if (app == null) {
            return BadRequest();
        }

        query.AppId = app.Id;
        query.Parent = app;
        query.OrderBy = nameof(Message.Id);
        // limit page size to [1,25]
        query.Top = Math.Clamp(query.Top ?? PageSizeMedium, 1, PageSizeMedium);

        app.Messages = MessageService.Search(query);

        if (Request.IsAjaxRequest()) {
            // infinite scroll, return partial view                
            return PartialView("_Messages", app.Messages);
        }

        return View(app);
    }

    /// <summary>
    /// Insert a new message into the specified conversation.
    /// </summary>
    /// <param name="id">Conversation id.</param>
    /// <param name="model"></param>
    /// <returns></returns>
    [HttpPost("{id:int}")]
    public IActionResult InsertMessage(int id, MessageModel model) {
        var conversation = ConversationService.Get(id);
        if (conversation == null) {
            return NotFound();
        }

        if (ModelState.IsValid) {
            var message = new Message { Text = model.Text, MeetingId = model.MeetingId };
            message = MessageService.Insert(message, conversation, blobs: model.Blobs);

            if (Request.IsTurboStream()) {
                // clear form and append message
                ModelState.Clear();
                var result = new TurboStreamsResult();
                result.Streams.Add(TurboStream.Replace("message-form", "_MessageForm", null));

                // replace placeholder with message and make sure no existing one in the list
                result.Streams.Add(TurboStream.Remove("_Message", message));
                result.Streams.Add(TurboStream.Replace("message-ph", "_Message", message));
                return result;
            }
            return SeeOtherAction(nameof(Get), new { id });
        }

        // validation error, display form again
        return PartialView("_MessageForm", model);
    }

    /// <summary>
    /// Called by chat-controller to update ui after message was inserted.
    /// </summary>
    /// <param name="id">Id of the inserted <see cref="Message"/>.</param>
    /// <returns></returns>
    [HttpGet("turbostream-insert-message/{id:int}")]
    public IActionResult TurboStreamInsertMessage(int id) {
        var message = MessageService.Get(id);
        if (message == null) {
            return BadRequest();
        }
        var result = new TurboStreamsResult();
        result.Streams.Add(TurboStream.Append("messages", "_Message", message));
        result.Streams.Add(TurboStream.Append("messages", "_MessageToast", message));
        return result;
    }

    /// <summary>
    /// Called by chat-controller to update ui after message was updated.
    /// </summary>
    /// <param name="id">Id of the <see cref="Message"/>.</param>
    /// <returns></returns>
    [HttpGet("turbostream-update-message/{id:int}")]
    public IActionResult TurboStreamUpdateMessage(int id) {
        var message = MessageService.Get(id);
        if (message == null) {
            return BadRequest();
        }

        return TurboStream.Replace("_Message", message);
    }

}
