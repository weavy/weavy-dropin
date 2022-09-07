using System;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Weavy.Core.Http;
using Weavy.Core.Models;
using Weavy.Core.Mvc;
using Weavy.Core.Services;
using Weavy.Dropin.Models;

namespace Weavy.Dropin.Controllers;

/// <summary>
/// Controller for the <see cref="Posts"/> app.
/// </summary>
public class PostsController : AreaController {

    /// <summary>
    /// Display posts for specified app.
    /// </summary>
    /// <param name="id">App id.</param>
    /// <param name="query"></param>
    /// <returns></returns>
    [HttpGet("{id:int}")]
    public IActionResult Get(int id, MessageQuery query) {
        var app = AppService.Get<Posts>(id);
        if (app == null) {
            return BadRequest();
        }

        query.AppId = app.Id;
        query.OrderBy = nameof(Message.Id) + " DESC";
        query.Parent = app;
        // limit page size to [1,10]
        query.Top = Math.Clamp(query.Top ?? PageSizeSmall, 1, PageSizeSmall);
        app.Items = MessageService.Search(query);

        if (Request.IsAjaxRequest()) {
            // infinite scroll, return partial view                
            return PartialView("_Posts", app.Items);
        }

        return View(app);
    }

    /// <summary>
    /// Insert a new post into the specified posts app.
    /// </summary>
    /// <param name="id">App id.</param>
    /// <param name="model"></param>
    /// <returns></returns>
    [HttpPost("{id:int}")]
    public IActionResult Insert(int id, MessageModel model) {
        var app = AppService.Get<Posts>(id);
        if (app == null) {
            return BadRequest();
        }

        if (ModelState.IsValid) {
            var post = new Message();
            post.Text = model.Text;
            post.MeetingId = model.MeetingId;
            post = MessageService.Insert(post, app, blobs: model.Blobs);

            if (Request.IsTurboStream()) {
                // clear form and insert post
                ModelState.Clear();
                var result = new TurboStreamsResult();
                result.Streams.Add(TurboStream.Replace("post-form", "_PostForm", null));
                result.Streams.Add(TurboStream.Prepend("posts", "_Post", post));
                return result;
            }

            return SeeOtherAction(nameof(Get), new { id });
        }

        // validation error, display form again
        return PartialView("_PostForm", model);
    }

    /// <summary>
    /// Returns a partial view with post details. 
    /// </summary>
    /// <param name="id">Post id.</param>
    /// <returns></returns>
    [HttpGet("{id:eid}")]
    public IActionResult Get(string id) {
        var post = EntityService.Get<Message>(id);
        if (post == null) {
            return BadRequest();
        }
        return PartialView("_Post", post);
    }

    /// <summary>
    /// Display post edit form.
    /// </summary>
    /// <param name="id">Comment id.</param>
    /// <returns></returns>
    [HttpGet("{id:eid}/edit")]
    public IActionResult Edit(string id) {
        var post = EntityService.Get<Message>(id);
        if (post == null) {
            return BadRequest();
        }
        var model = new MessageModel {
            Message = post,
            Text = post.Text,
            Attachments = post.AttachmentIds.ToArray(),
            MeetingId = post.MeetingId
        };
        return PartialView("_Edit", model);
    }

    /// <summary>
    /// Update post.
    /// </summary>
    /// <param name="id">Post id.</param>
    /// <param name="model"></param>
    /// <returns></returns>
    [HttpPut("{id:eid}")]
    public IActionResult Update(string id, MessageModel model) {
        var post = EntityService.Get<Message>(id);
        if (post == null) {
            return BadRequest();
        }

        if (ModelState.IsValid) {
            // remove attachments that should no longer be associated with the comment
            foreach (var attachmentId in post.AttachmentIds.Except(model.Attachments)) {
                FileService.Trash(attachmentId);
            }

            // update post and attach additional blobs (if any)
            post.Text = model.Text;
            post.MeetingId = model.MeetingId;
            post = MessageService.Update(post, blobs: model.Blobs);

            return PartialView("_Post", post);
        }
        return PartialView("_Edit", post);
    }


    /// <summary>
    /// Trash a post.
    /// </summary>
    /// <param name="id">Id of the post to trash.</param>
    /// <returns></returns>
    [HttpPost("{id:eid}/trash")]
    public IActionResult Trash(string id) {
        var post = EntityService.Get<Message>(id, trashed: true);
        if (post == null) {
            return BadRequest();
        }

        post = MessageService.Trash(post.Id);

        return PartialView("_Post", post);
    }

    /// <summary>
    /// Restore a trashed comment.
    /// </summary>
    /// <param name="id">Id of the comment to restore.</param>
    /// <returns></returns>
    [HttpPost("{id:eid}/restore")]
    public IActionResult Restore(string id) {
        var post = EntityService.Get<Message>(id, trashed: true);
        if (post == null) {
            return BadRequest();
        }

        post = MessageService.Restore(post.Id);

        return PartialView("_Post", post);
    }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    [HttpGet("turbostream-insert-post/{id:eid}")]
    public IActionResult TurboStreamInsertPost(string id) {

        var message = EntityService.Get<Message>(id);
        if (message == null) {
            return BadRequest();
        }
        var result = new TurboStreamsResult();
        result.Streams.Add(TurboStream.Prepend("posts", "_Post", message));
        return result;
    }
}
