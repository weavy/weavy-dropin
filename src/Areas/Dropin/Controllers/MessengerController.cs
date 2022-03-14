using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
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
    /// Display specified messenger app.
    /// </summary>
    /// <param name="id">Id of messenger app.</param>
    /// <param name="query"></param>
    /// <returns></returns>
    [HttpGet("{id:int}")]
    public IActionResult Index(int id, ConversationQuery query) {
        var model = AppService.Get<Messenger>(id);
        if (model == null) {
            return NotFound();
        }

        // find chat rooms and private chats
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
    /// <param name="id">Id of the messenger app.</param>
    /// <param name="conversationId">Id of the conversation.</param>
    /// <param name="query">Query options for paging etc.</param>
    [HttpGet("{id:int}/{conversationId:int}")]
    public IActionResult Get(int id, int conversationId, MessageQuery query) {
        var model = ConversationService.Get(conversationId);
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

        return View(model);
    }

    /// <summary>
    /// Returns a partial view with the conversation (for displaying in a list).
    /// </summary>
    /// <param name="id">The conversation id.</param>
    /// <returns></returns>
    [HttpGet("add/{id:int}")]
    public IActionResult GetConversation(int id) {
        // REVIEW: Merge with TurboStreamInsertConversation(id, conversationId)?
        var conversation = AppService.Get(id);
        if (conversation == null) {
            return NotFound();
        }
        return TurboStream.Append("conversations", "_Conversation", conversation);
    }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="id">The id of the messenger app.</param>
    /// <param name="conversationId">The id of the <see cref="Conversation"/>.</param>
    /// <returns></returns>
    [HttpGet("turbostream-insert-conversation/{id:int}/{conversationId:int}")]
    [SuppressMessage("Style", "IDE0060:Remove unused parameter", Justification = "Needed for routing.")]
    public IActionResult TurboStreamInsertConversation(int id, int conversationId) {
        // REVIEW: Merge with GetConversation(id)?
        var conversation = ConversationService.Get(conversationId);
        if (conversation == null) {
            return NotFound();
        }
        return TurboStream.Append("conversations", "_Conversation", conversation);
    }

    /// <summary>
    /// Called by turbo-stream-controller to update ui after message was inserted.
    /// </summary>
    /// <param name="id">The id of the messenger app.</param>
    /// <param name="messageId">The id of the inserted <see cref="Message"/>.</param>
    /// <returns></returns>
    [HttpGet("turbostream-insert-message/{id:int}/{messageId:int}")]
    [SuppressMessage("Style", "IDE0060:Remove unused parameter", Justification = "Needed for routing.")]
    public IActionResult TurboStreamInsertMessage(int id, int messageId) {
        var message = MessageService.Get(messageId);
        if (message == null) {
            return BadRequest();
        }

        var result = new TurboStreamsResult();        
        result.Streams.Add(TurboStream.Append("messages", "_Message", message));
        result.Streams.Add(TurboStream.Append("messages", "_MessageToast", message));
        return result;
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
    [HttpGet("{id:int}/new")]
    [SuppressMessage("Style", "IDE0060:Remove unused parameter", Justification = "Needed for routing.")]
    public IActionResult New(int id) {
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
    /// <param name="id">Id of the messenger app.</param>
    /// <param name="users"></param>
    /// <returns></returns>
    [HttpPost("{id:int}/new")] 
    public IActionResult Create(int id, List<int> users) {
        Conversation conversation = null;
        if (users?.Count == 1) {
            conversation = ConversationService.CreatePrivateChat(WeavyContext.Current.User.Id, users[0]);
        } else if (users?.Count > 1 ){
            users.Add(WeavyContext.Current.User.Id);
            conversation = ConversationService.CreateRoom(null, users);
        }

        if (conversation == null) {
            return BadRequest();
        }

        return SeeOtherAction(nameof(Get), new { id, conversationId = conversation.Id });
    }

    /// <summary>
    /// Insert a new message into the specified conversation.
    /// </summary>
    /// <param name="id">Id of the messenger app.</param>
    /// <param name="conversationId">Id of the conversation to add the message to.</param>
    /// <param name="model">The message to insert.</param>
    /// <returns></returns>
    [HttpPost("{id:int}/{conversationId:int}")]
    public IActionResult InsertMessage(int id, int conversationId, MessageModel model) {
        var conversation = ConversationService.Get(conversationId);
        if (conversation == null) {
            return NotFound();
        }

        if (ModelState.IsValid) {
            // HACK: pass in the Messenger app as Context, should ideally be implemented in a cleaner way but UIHook needs to know the id of the messenger app for the partial to render correctly...
            var messenger = AppService.Get(id);

            var message = new Message();
            message.Text = model.Text;
            message.MeetingId = model.MeetingId;
            message = MessageService.Insert(message, conversation, context: messenger, blobs: model.Blobs);

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
            return SeeOtherAction("Get", null, new { id, conversationId });
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
    /// <param name="conversationId">The id of the conversation to get details for.</param>
    /// <returns></returns>
    [HttpGet("{id:int}/{conversationId:int}/details")]
    [SuppressMessage("Style", "IDE0060:Remove unused parameter", Justification = "Needed for routing.")]
    public IActionResult Details(int id, int conversationId) {
        var conversation = ConversationService.Get(conversationId);
        if (conversation == null) {
            return NotFound();
        }

        ViewBag.Selected = UserService.Get(conversation.MemberIds);

        var model = new UpdateConversationModel() {
            Conversation = conversation,
            Name = conversation.GetTitle()
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
    /// <param name="id">Id of the messenger app.</param>
    /// <param name="conversationId">Id of the conversation to update.</param>
    /// <param name="model">The updated members and the name of the room.</param>
    /// <returns></returns>
    [HttpPost("{id:int}/{conversationId:int}/details")]
    public IActionResult Update(int id, int conversationId, UpdateConversationModel model) {
        // NOTE: only rooms can be updated 
        var room = ConversationService.Get<ChatRoom>(conversationId);
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
            return SeeOtherAction(nameof(Get), null, new { id, conversationId });
        }

        ViewBag.Selected = model.Users;
        model.Conversation = room;
        return View(nameof(Details), room);
    }

    /// <summary>
    /// Pin the specified conversation.
    /// </summary>
    /// <param name="id">Id of the messenger app.</param>
    /// <param name="conversationId">Id of the conversation to pin.</param>
    /// <returns></returns>
    [HttpPost("{id:int}/{conversationId:int}/pin")]
    [SuppressMessage("Style", "IDE0060:Remove unused parameter", Justification = "Needed for routing.")]
    public IActionResult Pin(int id, int conversationId) {
        var conversation = ConversationService.Get(conversationId);
        if (conversation == null) {
            return NotFound();
        }

        conversation = ConversationService.SetPinned(conversation.Id, WeavyContext.Current.User.Id, DateTime.UtcNow);
        return TurboStream.Replace("_Conversation", conversation);
    }

    /// <summary>
    /// Unpin the specified conversation.
    /// </summary>
    /// <param name="id">Id of the messenger app.</param>
    /// <param name="conversationId">Id of the conversation to unpin.</param>
    /// <returns></returns>
    [HttpPost("{id:int}/{conversationId:int}/unpin")]
    [SuppressMessage("Style", "IDE0060:Remove unused parameter", Justification = "Needed for routing.")]
    public IActionResult Unpin(int id, int conversationId) {
        var conversation = ConversationService.Get(conversationId);
        if (conversation == null) {
            return NotFound();
        }

        conversation = ConversationService.SetPinned(conversation.Id, WeavyContext.Current.User.Id, null);
        return TurboStream.Replace("_Conversation", conversation);
    }

    /// <summary>
    /// Mark the specified conversation as read.
    /// </summary>
    /// <param name="id">Id of the messenger app.</param>
    /// <param name="conversationId">Id of the conversation.</param>
    /// <returns></returns>
    [HttpPost("{id:int}/{conversationId:int}/read")]
    [SuppressMessage("Style", "IDE0060:Remove unused parameter", Justification = "Needed for routing.")]
    public IActionResult Read(int id, int conversationId) {
        var conversation = ConversationService.Get(conversationId);
        if (conversation == null) {
            return NotFound();
        }

        conversation = ConversationService.SetRead(conversation.Id, WeavyContext.Current.User.Id, DateTime.UtcNow);

        // REVIEW: merge with SetRead(id)?
        //if (Request.IsTurboStream()) {
        //    // post from menu item
        //    return TurboStream.Replace("_Conversation", conversation);
        //} else {
        //    // api call from stimulus controller
        //    return Ok();
        //}
        
        return TurboStream.Replace("_Conversation", conversation);
    }

    /// <summary>
    /// Mark the specified conversation as read.
    /// </summary>
    /// <param name="id">The id of the conversation.</param>
    /// <returns></returns>
    [HttpPost("{id:int}/read")]
    public IActionResult SetRead(int id) {
        var conversation = ConversationService.Get(id);
        if (conversation == null) {
            return NotFound();
        }
        
        conversation = ConversationService.SetRead(conversation.Id, WeavyContext.Current.User.Id, DateTime.UtcNow);

        // REVIEW: merge with SetRead(id)?
        //if (Request.IsTurboStream()) {
        //    // post from menu item
        //    return TurboStream.Replace("_Conversation", conversation);
        //} else {
        //    // api call from stimulus controller
        //    return Ok();
        //}

        return Ok();
    }

    /// <summary>
    /// Mark the specified conversation as unread.
    /// </summary>
    /// <param name="id">Id of the messenger app.</param>
    /// <param name="conversationId">Id of the conversation.</param>
    /// <returns></returns>
    [HttpPost("{id:int}/{conversationId:int}/unread")]
    public IActionResult Unread(int conversationId) {
        var conversation = ConversationService.Get(conversationId);
        if (conversation == null) {
            return NotFound();
        }

        conversation = ConversationService.SetRead(conversation.Id, WeavyContext.Current.User.Id, null);
        return TurboStream.Replace("_Conversation", conversation);
    }

    /// <summary>
    /// Leave the specified conversation.
    /// </summary>
    /// <param name="id">Id of the messenger app.</param>
    /// <param name="conversationId">Id of the conversation.</param>
    /// <returns></returns>
    [HttpPost("{id:int}/{conversationId:int}/leave")]
    public IActionResult Leave(int id, int conversationId) {
        var conversation = ConversationService.Get(conversationId);
        if (conversation == null) {
            return NotFound();
        }

        AppService.RemoveMember(conversation.Id, WeavyContext.Current.User.Id);
        return SeeOtherAction(nameof(Index), new { id });
    }

    /// <summary>
    /// Called by current user to indicate that they are typing in a conversation.
    /// </summary>
    /// <param name="id">Id of conversation.</param>
    /// <returns></returns>
    [HttpPost]
    [Route("{id:int}/typing")]
    public IActionResult Typing(int id) {
        // push typing event to other conversation members
        // NOTE: instead of sending the entire user object we extract the minimal data needed to update the ui
        var user = new { WeavyContext.Current.User.Id, Name = WeavyContext.Current.User.GetTitle() };
        var data = new { AppId = id, User = user };
        PushService.PushToGroup($"a{id}:{PushService.EVENT_TYPING}", PushService.EVENT_TYPING, data);
        return Ok(id);
    }


}

