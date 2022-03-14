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
/// Controller for the <see cref="Comments"/> app.
/// </summary>
public class CommentsController : AreaController {

    /// <summary>
    /// Display specified comments app.
    /// </summary>
    /// <param name="id">App id.</param>
    /// <param name="query">Query options for paging etc.</param>
    /// <returns></returns>
    [HttpGet("{id:int}")]
    public IActionResult Get(int id, MessageQuery query) {
        var app = AppService.Get<Comments>(id);
        if (app == null) {
            return BadRequest();
        }

        query.AppId = app.Id;
        query.Parent = app;
        query.OrderBy = nameof(Message.Id);
        if (app.Reverse) {
            query.OrderBy += " DESC";
        }
        // limit page size to [1,25]
        query.Top = Math.Clamp(query.Top ?? PageSizeMedium, 1, PageSizeMedium);
        app.Items = MessageService.Search(query);

        if (Request.IsAjaxRequest()) {
            // infinite scroll, return partial view                
            return PartialView("_Comments", app.Items);
        }

        return View(app);
    }

    /// <summary>
    /// Inserts a new comment.
    /// </summary>
    /// <param name="id">App id.</param>
    /// <param name="model"></param>
    /// <returns></returns>
    [HttpPost("{id:int}")]
    public IActionResult Insert(int id, MessageModel model) {
        var app = AppService.Get<Comments>(id);
        if (app == null) {
            return BadRequest();
        }

        if (ModelState.IsValid) {
            var comment = new Message();
            comment.Text = model.Text;
            comment.MeetingId = model.MeetingId;
            comment = MessageService.Insert(comment, app, blobs: model.Blobs);

            if (Request.IsTurboStream()) {
                // clear form and insert comment
                ModelState.Clear();
                var result = new TurboStreamsResult();
                result.Streams.Add(TurboStream.Replace("comment-form", "_CommentForm", null));
                if (app.Reverse) {
                    result.Streams.Add(TurboStream.Prepend("comments", "_Comment", comment));
                } else {
                    result.Streams.Add(TurboStream.Append("comments", "_Comment", comment));
                }
                return result;
            }

            return SeeOtherAction(nameof(Get), new { id });
        }

        // validation error, display form again
        return PartialView("_CommentForm", model);
    }


    /// <summary>
    /// Returns a partial view with comment details. 
    /// </summary>
    /// <param name="id">Comment id.</param>
    /// <returns></returns>
    [HttpGet("{id:uid}")]
    public IActionResult Get(string id) {
        var comment = EntityService.Get<Message>(id);
        if (comment == null) {
            return BadRequest();
        }
        return PartialView("_Comment", comment);
    }

    /// <summary>
    /// Display comment edit form.
    /// </summary>
    /// <param name="id">Comment id.</param>
    /// <returns></returns>
    [HttpGet("{id:uid}/edit")]
    public IActionResult Edit(string id) {
        var comment = EntityService.Get<Message>(id);
        if (comment == null) {
            return BadRequest();
        }
        var model = new MessageModel {
            Message = comment,
            Text = comment.Text,
            Attachments = comment.AttachmentIds.ToArray(),
            MeetingId = comment.MeetingId
        };
        return PartialView("_Edit", model);
    }

    /// <summary>
    /// Update comment.
    /// </summary>
    /// <param name="id">Comment id.</param>
    /// <param name="model"></param>
    /// <returns></returns>
    [HttpPut("{id:uid}")]
    public IActionResult Update(string id, MessageModel model) {
        var comment = EntityService.Get<Message>(id);
        if (comment == null) {
            return BadRequest();
        }

        if (ModelState.IsValid) {
            // remove attachments that should no longer be associated with the comment
            foreach (var attachmentId in comment.AttachmentIds.Except(model.Attachments)) {
                FileService.Trash(attachmentId);
            }

            // update comment and attach additional blobs (if any)
            comment.Text = model.Text;
            comment.MeetingId = model.MeetingId;
            comment = MessageService.Update(comment, blobs: model.Blobs);

            return PartialView("_Comment", comment);
        }
        return PartialView("_Edit", comment);
    }

    /// <summary>
    /// Trash a comment.
    /// </summary>
    /// <param name="id">Id of the comment to trash.</param>
    /// <returns></returns>
    [HttpPost("{id:uid}/trash")]
    public IActionResult Trash(string id) {
        var comment = EntityService.Get<Message>(id, trashed: true);
        if (comment == null) {
            return BadRequest();
        }

        comment = MessageService.Trash(comment.Id);

        return PartialView("_Comment", comment);
    }

    /// <summary>
    /// Restore a trashed comment.
    /// </summary>
    /// <param name="id">Id of the comment to restore.</param>
    /// <returns></returns>
    [HttpPost("{id:uid}/restore")]
    public IActionResult Restore(string id) {
        var comment = EntityService.Get<Message>(id, trashed: true);
        if (comment == null) {
            return BadRequest();
        }

        comment = MessageService.Restore(comment.Id);

        return PartialView("_Comment", comment);
    }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    [HttpGet("turbostream-insert-comment/{id:uid}")]
    public IActionResult TurboStreamInsertComment(string id) {

        var message = EntityService.Get<Message>(id);
        if (message == null) {
            return BadRequest();
        }
        var result = new TurboStreamsResult();
        result.Streams.Add(TurboStream.Append("comments", "_Comment", message));
        return result;
    }
}
