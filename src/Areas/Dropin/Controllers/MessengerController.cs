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

        // add app to viewdata so that we can avoid lazy-loading Message.Parent when rendering messages
        ViewData[nameof(Message.Parent)] = model;

        if (Request.IsAjaxRequest()) {
            // infinite scroll, return partial view
            var result = ConversationService.GetMessages(model.Id, query);
            result.Reverse();
            return PartialView("_Messages", result);
        }

        // mark conversation as read (if needed)
        if (model.IsUnread()) {
            var member = model.Member();
            if (member.MarkedId == null) {
                // user has never read this conversation, mark as read and assign the model property to avoid rendering the "New messages" separator
                model = ConversationService.Mark(model.Id, model.LastMessageId.Value);
            } else {
                // mark as read, but do not assign the read conversation -> this will render the "New messages" separator in the correct place
                _ = ConversationService.Mark(model.Id, model.LastMessageId.Value);
            }
        }

        // get first page of messages (and reverse them for easier rendering in correct order)
        model.Messages = ConversationService.GetMessages(model.Id, query);
        model.Messages.Reverse();

        // get number of unread conversations
        ViewData["Badge"] = ConversationService.GetBadge(WeavyContext.Current.User.Id);

        return View(model);
    }

    /// <summary>
    /// Returns a partial view with the conversation (for displaying in a list).
    /// </summary>
    /// <param name="id">The conversation id.</param>
    /// <returns></returns>
    [HttpGet("turbostream-get-conversation/{id:int}")]
    public IActionResult TurboStreamGetConversation(int id) {
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
    /// <param name="id">Id of the updated <see cref="Message"/>.</param>
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
    [HttpGet("{id:eid}")]
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
        var query = new UserQuery() {
            Suspended = false,
            Trashed = false,
            OrderBy = nameof(Core.Models.User.DisplayName),
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
            conversation = ConversationService.GetOrCreatePrivateChat(WeavyContext.Current.User.Id, users[0]);
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
            var message = new Message { Text = model.Text, EmbedId = model.EmbedId, MeetingId = model.MeetingId, Options = model.Options?.Select(x => new PollOption(x.Text)) };
            message = MessageService.Insert(message, conversation, blobs: model.Blobs);

            if (Request.IsTurboStream()) {
                var result = new TurboStreamsResult();

                // reset form
                ModelState.Clear();
                result.Streams.Add(TurboStream.Replace(TurboStreamHelper.DomId(this, "_MessageForm", conversation), "_MessageForm", new MessageModel { Parent = conversation}));

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
    /// Search for users (when creating new message and when adding members).
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
        query.Autocomplete = true;
        query.Suspended = false;
        query.Trashed = false;
        query.OrderBy = nameof(Core.Models.User.DisplayName);
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
    /// Updates the room name.
    /// </summary>
    /// <param name="id">Id of the conversation to update.</param>
    /// <param name="model">The name of the room.</param>
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
            return SeeOtherAction(nameof(Get), new { id });
        }

        return View(nameof(Details), model);
    }

    /// <summary>
    /// Display list for adding conversation members.
    /// </summary>
    /// <param name="id">Conversation id.</param>
    /// <returns></returns>
    [HttpGet("{id:int}/members")]
    public IActionResult Members(int id) {
        var conversation = ConversationService.Get(id);
        if (conversation == null) {
            return NotFound();
        }

        // initial query
        var q = new UserQuery { NotAppId = conversation.Id, OrderBy = nameof(Core.Models.User.DisplayName) };
        var model = UserService.Search(q);
        return View(model);
    }

    /// <summary>
    /// Add new conversation members.
    /// </summary>
    /// <param name="id">Conversation id.</param>
    /// <param name="users">Ids of users to add.</param>
    /// <returns></returns>
    [HttpPost("{id:int}/members")]
    public IActionResult Members(int id, IEnumerable<int> users) {
        var conversation = ConversationService.Get(id);
        if (conversation == null) {
            return NotFound();
        }

        if (ModelState.IsValid) {
            foreach (var userid in users) {
                AppService.AddMember(id, userid);
            }
        }

        return SeeOtherAction(nameof(Get), new { id });
    }

    /// <summary>
    /// Remove conversation member.
    /// </summary>
    /// <param name="id">Conversation id.</param>
    /// <param name="uid">Id of user to remove.</param>
    /// <returns></returns>
    [HttpDelete("{id:int}/members/{uid:int}")]
    public IActionResult RemoveMember(int id, int uid) {
        var conversation = ConversationService.Get(id);
        if (conversation == null) {
            return NotFound();
        }

        var member = AppService.RemoveMember(id, uid);

        if (Request.IsTurboStream()) {
            ViewData[nameof(Conversation)] = conversation;
            return TurboStream.Remove("_Member", member);
        }

        return SeeOtherAction(nameof(Get), new { id });
    }

    /// <summary>
    /// Update conversation member.
    /// </summary>
    /// <param name="id">Conversation id.</param>
    /// <param name="uid">Id of user to update.</param>
    /// <param name="access">The access rights to set for the user.</param>
    /// <returns></returns>
    [HttpPut("{id:int}/members/{uid:int}")]
    public IActionResult UpdateMember(int id, int uid, Access access) {
        var conversation = ConversationService.Get(id);
        if (conversation == null) {
            return NotFound();
        }

        var member = AppService.AddMember(id, uid, access);

        if (Request.IsTurboStream()) {
            ViewData[nameof(Conversation)] = conversation;
            return TurboStream.Replace("_Member", member);
        }

        return SeeOtherAction(nameof(Get), new { id });
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

        conversation = ConversationService.SetPinned(conversation.Id, DateTime.UtcNow);
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

        conversation = ConversationService.SetPinned(conversation.Id, null);
        return TurboStream.Replace("_Conversation", conversation);
    }

    /// <summary>
    /// Mark the specified conversation as read.
    /// </summary>
    /// <param name="id">Id of the conversation.</param>
    /// <param name="messageId">Id of last read message.</param>
    /// <returns></returns>
    [HttpPost("{id:int}/read/{messageId:int}")]
    public IActionResult Read(int id, int messageId) {
        var conversation = ConversationService.Get(id);
        if (conversation == null) {
            return NotFound();
        }
        conversation = ConversationService.Mark(conversation.Id, messageId);

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

        conversation = ConversationService.Unmark(conversation.Id);
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
        var conversation = ConversationService.Get(id);
        if (conversation == null) {
            return NotFound();
        }
        EntityService.Typing(conversation);
        return Ok(id);
    }
}

