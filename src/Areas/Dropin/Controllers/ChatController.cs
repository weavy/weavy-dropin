using System;
using System.Linq;
using DocumentFormat.OpenXml.EMMA;
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
        var chat = ConversationService.Get<Chat>(id);
        if (chat == null) {
            return BadRequest();
        }

        query.AppId = chat.Id;
        query.Parent = chat;
        query.OrderBy = "Id DESC";
        // limit page size to [1,25]
        query.Top = Math.Clamp(query.Top ?? PageSizeMedium, 1, PageSizeMedium);

        var result = MessageService.Search(query);
        result.Reverse();
        chat.Messages = result;

        // add app to viewdata so that we can avoid lazy-loading Message.Parent when rendering messages
        ViewData[nameof(Message.Parent)] = chat;

        if (Request.IsAjaxRequest()) {
            // infinite scroll, return partial view                
            return PartialView("_Messages", chat.Messages);
        }

        return View(chat);
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
            message = MessageService.Insert(message, conversation, blobs: model.Blobs, options: model.Options?.Select(x => new PollOption { Id = x.Id, Text = x.Text }));

            if (Request.IsTurboStream()) {
                var result = new TurboStreamsResult();

                // clear form and append message
                ModelState.Clear();
                result.Streams.Add(TurboStream.Replace(TurboStreamHelper.DomId(this, "_MessageForm", conversation), "_MessageForm", new MessageModel { Parent = conversation }));
                
                // REVIEW: why are we removing existing message here? because it might have been injected via realtime?
                result.Streams.Add(TurboStream.Remove("_Message", message));

                // replace placeholder with inserted message
                conversation = ConversationService.Get(id);
                ViewData[nameof(Message.Parent)] = conversation;
                result.Streams.Add(TurboStream.Replace(TurboStreamHelper.DomId(this, "_MessagePlaceholder", conversation), "_Message", message));
                return result;
            }
            return SeeOtherAction(nameof(Get), new { id });
        }

        // validation error, display form again
        model.Parent = conversation;
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
