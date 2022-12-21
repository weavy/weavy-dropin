using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Weavy.Core.Http;
using Weavy.Core.Models;
using Weavy.Core.Mvc;
using Weavy.Core.Services;
using Weavy.Dropin.Models;

namespace Weavy.Dropin.Controllers;

/// <summary>
/// Controller for a single post.
/// </summary>
public class PostController : AreaController {

    /// <summary>
    /// Returns a partial view with post details. 
    /// </summary>
    /// <param name="id">Post id.</param>
    /// <returns></returns>
    [HttpGet("{id:int}")]
    public IActionResult Get(int id) {
        var post = MessageService.Get(id);
        if (post == null) {
            return BadRequest();
        }
        if (Request.IsTurboStream()) {
            return TurboStream.Prepend("posts", "_Post", post);
        }

        return PartialView("_Post", post);
    }

    /// <summary>
    /// Display post edit form.
    /// </summary>
    /// <param name="id">Comment id.</param>
    /// <returns></returns>
    [HttpGet("{id:int}/edit")]
    public IActionResult Edit(int id) {
        var post = MessageService.Get(id);
        if (post == null) {
            return BadRequest();
        }
        var model = new MessageModel {
            Parent = post.Parent,
            Message = post,
            Text = post.Text,
            Attachments = post.AttachmentIds.ToArray(),
            EmbedId = post.EmbedId,
            MeetingId = post.MeetingId
        };
        return PartialView("_PostForm", model);
    }

    /// <summary>
    /// Update post.
    /// </summary>
    /// <param name="id">Post id.</param>
    /// <param name="model"></param>
    /// <returns></returns>
    [HttpPut("{id:int}")]
    public IActionResult Update(int id, MessageModel model) {
        var post = MessageService.Get(id);
        if (post == null) {
            return BadRequest();
        }

        if (ModelState.IsValid) {
            post.AttachmentIds = model.Attachments;
            post.EmbedId = model.EmbedId;
            post.MeetingId = model.MeetingId;
            post.Text = model.Text;
            post.Options = model.Options?.Select(x => new PollOption { Id = x.Id, Text = x.Text });
            post = MessageService.Update(post, blobs: model.Blobs);
            return PartialView("_Post", post);
        }
        model.Parent = post.Parent;
        model.Message = post;
        return PartialView("_PostForm", model);
    }

    /// <summary>
    /// Pin a post.
    /// </summary>
    /// <param name="id">Id of the post to pin.</param>
    /// <returns></returns>
    [HttpPost("{id:int}/pin")]
    public IActionResult Pin(int id) {
        var post = MessageService.Get(id);
        if (post == null) {
            return BadRequest();
        }

        post = MessageService.Pin(post.Id);
        return PartialView("_Post", post);
    }

    /// <summary>
    /// Unpin a post.
    /// </summary>
    /// <param name="id">Id of the post to pin.</param>
    /// <returns></returns>
    [HttpPost("{id:int}/unpin")]
    public IActionResult Unpin(int id) {
        var post = MessageService.Get(id);
        if (post == null) {
            return BadRequest();
        }

        post = MessageService.Unpin(post.Id);
        return PartialView("_Post", post);
    }

    /// <summary>
    /// Trash a post.
    /// </summary>
    /// <param name="id">Id of the post to trash.</param>
    /// <returns></returns>
    [HttpPost("{id:int}/trash")]
    public IActionResult Trash(int id) {
        var post = MessageService.Get(id);
        if (post == null) {
            return BadRequest();
        }

        post = MessageService.Trash(post.Id);
        return PartialView("_Post", post);
    }

    /// <summary>
    /// Restore a trashed post.
    /// </summary>
    /// <param name="id">Id of the post to restore.</param>
    /// <returns></returns>
    [HttpPost("{id:int}/restore")]
    public IActionResult Restore(int id) {
        var post = MessageService.Get(id, trashed: true);
        if (post == null) {
            return BadRequest();
        }

        post = MessageService.Restore(post.Id);
        return PartialView("_Post", post);
    }

    /// <summary>
    /// Get the comments for the post.
    /// </summary>
    /// <param name="id">Id of the post.</param>
    /// <returns></returns>
    [HttpGet("{id:int}/comments")]
    public IActionResult Comments(int id) {
        var post = MessageService.Get(id);
        if (post == null) {
            return BadRequest();
        }
        return PartialView("_Comments", post);
    }

    /// <summary>
    /// Inserts a new comment.
    /// </summary>
    /// <param name="id">Post id.</param>
    /// <param name="model"></param>
    /// <returns></returns>
    [HttpPost("{id:int}/comments")]
    public IActionResult InsertComment(int id, MessageModel model) {
        var post = MessageService.Get(id);
        if (post == null) {
            return BadRequest();
        }

        if (ModelState.IsValid) {
            var comment = MessageService.Insert(new Message { Text = model.Text, EmbedId = model.EmbedId, MeetingId = model.MeetingId, Options = model.Options?.Select(x => new PollOption(x.Text)) }, post, blobs: model.Blobs);

            if (Request.IsTurboStream()) {
                var result = new TurboStreamsResult();

                // get post again (for updated comment count)
                post = MessageService.Get(id);

                // reset form
                ModelState.Clear();               
                result.Streams.Add(TurboStream.Replace(TurboStreamHelper.DomId(this, "_CommentForm", post), "_CommentForm", new MessageModel { Parent = post }));

                // replace placeholder with inserted comment
                result.Streams.Add(TurboStream.Replace(TurboStreamHelper.DomId(this, "_CommentPlaceholder", post), "_Comment", comment));

                // update comment count
                result.Streams.Add(TurboStream.Replace("_CommentCount", post));
                return result;
            }
            return SeeOtherAction(nameof(Get), new { id });
        }

        // validation error, display form again
        model.Parent = post;
        return PartialView("_CommentForm", model);
    }

    /// <summary>
    /// Returns a partial view with comment details. 
    /// </summary>
    /// <param name="id">Comment id.</param>
    /// <returns></returns>
    [HttpGet("comments/{id:int}")]
    public IActionResult GetComment(int id) {
        var comment = MessageService.Get(id);
        if (comment == null) {
            return BadRequest();
        }

        if (Request.IsTurboStream()) {
            return TurboStream.Append("comments", "_Comment", comment);
        }

        return PartialView("_Comment", comment);
    }

    /// <summary>
    /// Trash a comment.
    /// </summary>
    /// <param name="id">Id of the comment to trash.</param>
    /// <returns></returns>
    [HttpPost("comments/{id:int}/trash")]
    public IActionResult TrashComment(int id) {
        var comment = MessageService.Get(id);
        if (comment == null) {
            return BadRequest();
        }

        comment = MessageService.Trash(comment.Id);

        var result = new TurboStreamsResult();
        result.Streams.Add(TurboStream.Replace("_Comment", comment));
        result.Streams.Add(TurboStream.Replace("_CommentCount", comment.Parent));
        return result;

    }

    /// <summary>
    /// Restore a trashed comment.
    /// </summary>
    /// <param name="id">Id of the comment to restore.</param>
    /// <returns></returns>
    [HttpPost("comments/{id:int}/restore")]
    public IActionResult RestoreComment(int id) {
        var comment = MessageService.Get(id, trashed: true);
        if (comment == null) {
            return BadRequest();
        }

        comment = MessageService.Restore(comment.Id);

        var result = new TurboStreamsResult();
        result.Streams.Add(TurboStream.Replace("_Comment", comment));
        result.Streams.Add(TurboStream.Replace("_CommentCount", comment.Parent));
        return result;
    }

    /// <summary>
    /// Display comment edit form.
    /// </summary>
    /// <param name="id">Comment id.</param>
    /// <returns></returns>
    [HttpGet("comments/{id:int}/edit")]
    public IActionResult EditComment(int id) {
        var comment = MessageService.Get(id);
        if (comment == null) {
            return BadRequest();
        }
        var model = new MessageModel {
            Parent = comment.Parent,
            Message = comment,
            Text = comment.Text,
            Attachments = comment.AttachmentIds.ToArray(),
            EmbedId = comment.EmbedId,
            MeetingId = comment.MeetingId
        };
        return PartialView("_CommentForm", model);
    }

    /// <summary>
    /// Update comment.
    /// </summary>
    /// <param name="id">Comment id.</param>
    /// <param name="model"></param>
    /// <returns></returns>
    [HttpPut("comments/{id:int}")]
    public IActionResult UpdateComment(int id, MessageModel model) {
        var comment = MessageService.Get(id);
        if (comment == null) {
            return BadRequest();
        }

        if (ModelState.IsValid) {
            comment.AttachmentIds = model.Attachments;
            comment.EmbedId = model.EmbedId;
            comment.MeetingId = model.MeetingId;
            comment.Text = model.Text;
            comment.Options = model.Options?.Select(x => new PollOption { Id = x.Id, Text = x.Text });
            comment = MessageService.Update(comment, blobs: model.Blobs);
            return PartialView("_Comment", comment);
        }

        // validation error, display form again
        model.Parent = comment.Parent;
        model.Message = comment;
        return PartialView("_CommentForm", model);
    }
}
