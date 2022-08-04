using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Weavy.Core;
using Weavy.Core.Http;
using Weavy.Core.Models;
using Weavy.Core.Mvc;
using Weavy.Core.Services;
using Weavy.Core.Utils;
using Weavy.Dropin.Models;

namespace Weavy.Dropin.Controllers;

/// <summary>
/// Controller for the global messenger.
/// </summary>
public class MessengerController : AreaController {

    /// <summary>
    /// Display messenger app.
    /// </summary>
    /// <param name="query"></param>
    /// <returns></returns>
    [HttpGet("")]
    public IActionResult Index(ConversationQuery query) {
        var model = new Messenger();
        if (model == null) {
            return NotFound();
        }

        // find chat rooms and private chats for current user
        query.MemberId = WeavyContext.Current.User.Id;
        query.Contextual = false;

        // limit page size to [1,25}
        query.Top = Math.Clamp(query.Top ?? PageSizeMedium, 1, PageSizeMedium);
        query.OrderBy = "PinnedAt DESC, LastMessageAt DESC, CreatedAt DESC";
        var result = ConversationService.Search(query);

        if (Request.IsAjaxRequest()) {
            // infinite scroll, return partial view                
            return PartialView("_Conversations", result);
        }

        model.Conversations = result;
        return View(model);
    }

    /// <summary>
    /// Display the specified conversation.
    /// </summary>
    /// <param name="id">Id of the conversation.</param>
    /// <param name="query">Query options for paging etc.</param>
    [HttpGet("{id:int}")]
    public IActionResult Get(int id, MessageQuery query) {
        var model = ConversationService.Get(id);
        if (model == null) {
            return NotFound();
        }

        // limit page size to [1,25}
        query.Top = Math.Clamp(query.Top ?? PageSizeMedium, 1, PageSizeMedium);

        if (Request.IsAjaxRequest()) {
            // infinite scroll, return partial view
            var result = ConversationService.GetMessages(model.Id, query);
            result.Reverse();
            return PartialView("_Messages", result);
        }

        // mark conversation as read (if needed)
        if (model.Member?.ReadAt == null) {
            model = ConversationService.SetRead(model.Id, model.Member.Id, DateTime.UtcNow);
        } else if (model.Member?.ReadAt < model.LastMessage?.CreatedAt) {
            // NOTE: do not assign the read conversation to model since that will prevent rendering of the "New messages" separator
            _ = ConversationService.SetRead(model.Id, model.Member.Id, DateTime.UtcNow);
        }

        // get first page of messages (and reverse them for easier rendering in correct order)
        model.Messages = ConversationService.GetMessages(model.Id, query);
        model.Messages.Reverse();
        ViewData["Badge"] = ConversationService.GetBadge(model.Member.Id);

        return View(model);
    }

    /// <summary>
    /// Returns a partial view with the conversation (for displaying in a list).
    /// </summary>
    /// <param name="id">The conversation id.</param>
    /// <returns></returns>
    [HttpGet("add/{id:int}")]
    public IActionResult GetConversation(int id) {
        // REVIEW: Merge with TurboStreamInsertConversation(id)?
        var conversation = AppService.Get(id);
        if (conversation == null) {
            return NotFound();
        }
        return TurboStream.Append("conversations", "_Conversation", conversation);
    }

    /// <summary>
    ///  Called by messenger-controller to update ui after conversation was inserted.
    /// </summary>
    /// <param name="id">Id of the <see cref="Conversation"/>.</param>
    /// <returns></returns>
    [HttpGet("turbostream-insert-conversation/{id:int}")]
    public IActionResult TurboStreamInsertConversation(int id) {
        // REVIEW: Merge with GetConversation(id)?
        var conversation = ConversationService.Get(id);
        if (conversation == null) {
            return NotFound();
        }
        return TurboStream.Append("conversations", "_Conversation", conversation);
    }

    /// <summary>
    ///  Called by messenger-controller to update ui after conversation was inserted.
    /// </summary>
    /// <param name="id">Id of the <see cref="Conversation"/>.</param>
    /// <returns></returns>
    [HttpGet("turbostream-remove-conversation/{id:int}")]
    public IActionResult TurboStreamRemoveConversation(int id) {
        return TurboStream.Remove("_Conversation", "a" + id.ToString());
    }

    /// <summary>
    /// Called by messenger-controller to update ui after message was inserted.
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
    /// Called by messenger-controller to update ui after message was updated.
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    [HttpGet("turbostream-update-message/{id:int}")]
    public IActionResult TurboStreamUpdateMessage(int id) {
        var message = MessageService.Get(id);
        if (message == null) {
            return BadRequest();
        }

        return TurboStream.Replace("_Message", message);
    }

    /// <summary>
    /// Get a message as a partial.
    /// </summary>
    /// <param name="id">The message id.</param>        
    /// <returns></returns>
    [HttpGet("{id:uid}")]
    public IActionResult Get(string id) {
        // REVIEW: is this method used?
        var message = EntityService.Get<Message>(id);
        if (message == null) {
            return BadRequest();
        }

        return PartialView("_Message", message);
    }

    /// <summary>
    /// Display modal for creating conversation.
    /// </summary>
    /// <param name="id">Id of the messenger app.</param>
    /// <returns></returns>
    [HttpGet("new")]
    public IActionResult New() {
        // perform initial search
        // TODO: a "smart" algoritm for default users? maybe most recently contacted?
        var query = new UserQuery() {
            Suspended = false,
            Trashed = false,
            OrderBy = nameof(Core.Models.User.Name),
            Count = true,
            Top = PageSizeMedium
        };
        return View(UserService.Search(query));
    }

    /// <summary>
    /// Create a new conversation with the selected users.
    /// </summary>
    /// <param name="users"></param>
    /// <returns></returns>
    [HttpPost("new")]
    public IActionResult Create(List<int> users) {
        Conversation conversation = null;
        if (users?.Count == 1) {
            conversation = ConversationService.CreatePrivateChat(WeavyContext.Current.User.Id, users[0]);
        } else if (users?.Count > 1) {
            users.Add(WeavyContext.Current.User.Id);
            conversation = ConversationService.CreateRoom(null, users);
        }

        if (conversation == null) {
            return BadRequest();
        }

        return SeeOtherAction(nameof(Get), new { conversation.Id });
    }

    /// <summary>
    /// Insert a new message into the specified conversation.
    /// </summary>
    /// <param name="id">Id of the conversation.</param>
    /// <param name="model">The message to insert.</param>
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
    /// Search for users.
    /// </summary>
    /// <returns></returns>
    [HttpPost("users")]
    public IActionResult SearchUsers(UserQuery query, IEnumerable<int> users) {

        // get selected users
        ViewBag.Selected = new List<User>();
        if (users != null && users.Any()) {
            ViewBag.Selected = UserService.Get(users);
        }

        // perform search            
        query.Suspended = false;
        query.Trashed = false;
        query.OrderBy = nameof(Core.Models.User.Name);
        query.Count = true;
        query.Top = Math.Clamp(query.Top ?? PageSizeMedium, 1, PageSizeMedium);
        var model = UserService.Search(query);

        return PartialView("_SearchUsersResult", model);
    }

    /// <summary>
    /// Display details about the conversation.
    /// </summary>
    /// <param name="id">The id of the conversation to get details for.</param>
    /// <returns></returns>
    [HttpGet("{id:int}/details")]
    public IActionResult Details(int id) {
        var conversation = ConversationService.Get(id);
        if (conversation == null) {
            return NotFound();
        }

        ViewBag.Selected = UserService.Get(conversation.MemberIds);

        var model = new UpdateConversationModel() {
            Conversation = conversation,
            Name = conversation.DisplayName
        };

        // edit name field should be empty when name has not been explicitly set
        if (conversation.Name == null && conversation is ChatRoom) {
            model.Name = null;
        }

        return View(model);
    }

    /// <summary>
    /// Updates the conversation details.
    /// </summary>
    /// <param name="id">Id of the conversation to update.</param>
    /// <param name="model">The updated members and the name of the room.</param>
    /// <returns></returns>
    [HttpPost("{id:int}/details")]
    public IActionResult Update(int id, UpdateConversationModel model) {
        // NOTE: only rooms can be updated 
        var room = ConversationService.Get<ChatRoom>(id);
        if (room == null) {
            return NotFound();
        }

        if (ModelState.IsValid) {
            room.Name = model.Name.IsNullOrEmpty() ? null : model.Name;
            room = AppService.Update(room);

            var add = model.Users.Where(x => !room.MemberIds.Any(y => x == y));
            var remove = room.MemberIds.Where(x => !model.Users.Any(y => x == y));

            foreach (var userid in add) {
                AppService.AddMember(room.Id, userid);
            }

            foreach (var userid in remove) {
                AppService.RemoveMember(room.Id, userid);
            }
            return SeeOtherAction(nameof(Get), new { id });
        }

        ViewBag.Selected = model.Users;
        model.Conversation = room;
        return View(nameof(Details), room);
    }

    /// <summary>
    /// Pin the specified conversation.
    /// </summary>
    /// <param name="id">Id of the conversation to pin.</param>
    /// <returns></returns>
    [HttpPost("{id:int}/pin")]
    public IActionResult Pin(int id) {
        var conversation = ConversationService.Get(id);
        if (conversation == null) {
            return NotFound();
        }

        conversation = ConversationService.SetPinned(conversation.Id, WeavyContext.Current.User.Id, DateTime.UtcNow);
        return TurboStream.Replace("_Conversation", conversation);
    }

    /// <summary>
    /// Unpin the specified conversation.
    /// </summary>
    /// <param name="id">Id of the conversation to unpin.</param>
    /// <returns></returns>
    [HttpPost("{id:int}/unpin")]
    public IActionResult Unpin(int id) {
        var conversation = ConversationService.Get(id);
        if (conversation == null) {
            return NotFound();
        }

        conversation = ConversationService.SetPinned(conversation.Id, WeavyContext.Current.User.Id, null);
        return TurboStream.Replace("_Conversation", conversation);
    }

    /// <summary>
    /// Mark the specified conversation as read.
    /// </summary>
    /// <param name="id">Id of the conversation.</param>
    /// <returns></returns>
    [HttpPost("{id:int}/read")]
    public IActionResult Read(int id) {
        var conversation = ConversationService.Get(id);
        if (conversation == null) {
            return NotFound();
        }
        conversation = ConversationService.SetRead(conversation.Id, WeavyContext.Current.User.Id, DateTime.UtcNow);

        if (Request.IsTurboStream()) {
            // post from menu item
            return TurboStream.Replace("_Conversation", conversation);
        } else {
            // api call from stimulus controller
            return NoContent();
        }
    }

    /// <summary>
    /// Mark the specified conversation as unread.
    /// </summary>
    /// <param name="id">Id of the conversation.</param>
    /// <returns></returns>
    [HttpPost("{id:int}/unread")]
    public IActionResult Unread(int id) {
        var conversation = ConversationService.Get(id);
        if (conversation == null) {
            return NotFound();
        }

        conversation = ConversationService.SetRead(conversation.Id, WeavyContext.Current.User.Id, null);
        return TurboStream.Replace("_Conversation", conversation);
    }

    /// <summary>
    /// Leave the specified conversation.
    /// </summary>
    /// <param name="id">Id of the conversation.</param>
    /// <returns></returns>
    [HttpPost("{id:int}/leave")]
    public IActionResult Leave(int id) {
        var conversation = ConversationService.Get(id);
        if (conversation == null) {
            return NotFound();
        }

        AppService.RemoveMember(conversation.Id, WeavyContext.Current.User.Id);
        return SeeOtherAction(nameof(Index));
    }

    /// <summary>
    /// Called by current user to indicate that they are typing in a conversation.
    /// </summary>
    /// <param name="id">Id of conversation.</param>
    /// <returns></returns>
    [HttpPost]
    [Route("{id:int}/typing")]
    public IActionResult Typing(int id) {
        ConversationService.Typing(id, WeavyContext.Current.User.Id);
        return Ok(id);
    }
}

