using System.ComponentModel.DataAnnotations;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Weavy.Core.Http;
using Weavy.Core.Models;
using Weavy.Core.Mvc;
using Weavy.Core.Services;
using Weavy.Core.Utils;
using Weavy.Dropin.Models;

namespace Weavy.Dropin.Controllers;

/// <summary>
/// Controller for the <see cref="File"/> object.
/// </summary>
public class FileController : AreaController {

    /// <summary>
    /// Display file.
    /// </summary>
    /// <param name="id">File id.</param>
    /// <param name="version">A specific version of the file.</param>
    /// <returns></returns>
    [HttpGet("{id:int}")]
    [HttpGet("{id:int}/v{version:long}")]
    public IActionResult Get(int id, long? version) {
        var file = version != null ? FileService.Get(id, version.Value) : FileService.Get(id);
        if (file == null) {
            return BadRequest();
        }

        (var prev, var next) = FileService.GetPreviousAndNextSiblings(file);

        var model = new PreviewModel {
            Current = file,
            Prev = prev,
            Next = next
        };

        return View(model);
    }

    /// <summary>
    /// Get the comments for the <see cref="File"/>.
    /// </summary>
    /// <param name="id">Id of the file.</param>
    /// <returns></returns>
    [HttpGet("{id:int}/comments")]
    public IActionResult Comments(int id) {
        var file = FileService.Get(id);
        if (file == null) {
            return BadRequest();
        }

        return PartialView("_Comments", file);
    }

    /// <summary>
    /// Get the versions for of a <see cref="File"/>.
    /// </summary>
    /// <param name="id">Id of the file.</param>
    /// <param name="version">The currently viewed version.</param>
    /// <returns></returns>
    [HttpGet("{id:int}/versions")]
    [HttpGet("{id:int}/versions/{version:long}")]
    public IActionResult Versions(int id, long? version = null) {
        var model = new VersionsModel {
            Current = version == null ? FileService.Get(id) : FileService.Get(id, version.Value),
            Versions = FileService.GetVersions(id)
        };

        if (Request.IsTurboStream()) {
            ModelState.Clear();
            var result = new TurboStreamsResult();
            result.Streams.Add(TurboStream.Replace("versions", "_Versions", model));
            result.Streams.Add(TurboStream.Replace("preview", "_Preview", model.Current));
            return result;
        }
        return PartialView("_Versions", model);
    }

    /// <summary>
    /// Reverts to a different version of the <see cref="File"/>.
    /// </summary>
    /// <param name="id">The id of the <see cref="File"/>.</param>
    /// <param name="version">The version to revert to.</param>
    /// <returns></returns>
    [HttpPost("{id:int}/version/{version:long}/revert")]
    public IActionResult Revert(int id, long version) {

        var model = new VersionsModel {
            Current = FileService.Revert(id, version),
            Versions = FileService.GetVersions(id)
        };

        if (Request.IsTurboStream()) {
            ModelState.Clear();
            var result = new TurboStreamsResult();
            result.Streams.Add(TurboStream.Replace("versions", "_Versions", model));
            result.Streams.Add(TurboStream.Replace("preview", "_Preview", model.Current));
            return result;
        }
        return PartialView("_Versions", model);
    }

    /// <summary>
    /// Deletes a version of the <see cref="File"/>.
    /// </summary>
    /// <param name="id">The id of the <see cref="File"/> to delete.</param>
    /// <param name="version">The verison to delete.</param>
    /// <returns></returns>
    [HttpDelete("{id:int}/version/{version:long}/delete")]
    public IActionResult DeleteVersion(int id, long version) {

        FileService.Delete(id, version);

        var model = new VersionsModel {
            Current = FileService.Get(id),
            Versions = FileService.GetVersions(id)
        };

        return PartialView("_Versions", model);
    }

    /// <summary>
    /// Display a rename form.
    /// </summary>
    /// <param name="id">Id of <see cref="File"/> to rename.</param>
    /// <returns></returns>
    [HttpGet("{id:int}/rename")]
    public IActionResult Edit(int id) {
        var file = FileService.Get(id);
        if (file == null) {
            return BadRequest();
        }

        return PartialView("_Rename", file);
    }

    /// <summary>
    /// Rename a <see cref="File"/>.
    /// </summary>
    /// <param name="id">Id of <see cref="File"/> to rename.</param>
    /// <param name="name">New file name.</param>
    /// <returns></returns>
    [HttpPost("{id:int}/rename")]
    public IActionResult Update(int id, [FromForm] string name) {
        var file = FileService.Get(id);
        if (file == null) {
            return BadRequest();
        }

        var oldname = file.Name;

        try {
            // try updating name
            file.Name = name;
            file = FileService.Update(file);
        } catch (ValidationException vex) {
            ModelState.AddModelError(nameof(file.Name), vex.Message);
        }

        if (Request.IsTurboStream()) {
            if (ModelState.IsValid) {
                return TurboStream.Replace($"_{GetLayout(file.Parent.Id)}File", file);
            } else {
                // save "old" name in view data
                ViewData["Name"] = oldname;
                return TurboStream.Replace("_Rename", file);
            }
        }

        return SeeOtherAction(nameof(Get), new { id = EntityUtils.ResolveAppId(file) });
    }

    /// <summary>
    /// Trash a <see cref="File"/>.
    /// </summary>
    /// <param name="id">Id of <see cref="File"/> to trash.</param>
    /// <param name="layout">The current layout.</param>
    /// <returns></returns>
    [HttpPost("{id:int}/trash")]
    public IActionResult Trash(int id) {
        var file = FileService.Get(id);
        if (file == null) {
            return BadRequest();
        }

        file = FileService.Trash(id);

        if (Request.IsTurboStream()) {
            return TurboStream.Replace($"_{GetLayout(file.Parent.Id)}File", file);
        }

        return SeeOtherAction(nameof(Get), new { id = EntityUtils.ResolveAppId(file) });
    }

    /// <summary>
    /// Restore a trashed <see cref="File"/>.
    /// </summary>
    /// <param name="id">Id of <see cref="File"/> to restore.</param>
    /// <param name="layout">The current layout.</param>
    /// <returns></returns>
    [HttpPost("{id:int}/restore")]
    public IActionResult Restore(int id) {
        var file = FileService.Get(id, trashed: true);
        if (file == null) {
            return BadRequest();
        }

        file = FileService.Restore(id);

        if (Request.IsTurboStream()) {
            return TurboStream.Replace($"_{GetLayout(file.Parent.Id)}File", file);
        }

        return SeeOtherAction(nameof(Get), new { id = EntityUtils.ResolveAppId(file) });
    }

    /// <summary>
    /// Permanently delete an <see cref="File"/>.
    /// </summary>
    /// <param name="id">Id of <see cref="File"/> to delete.</param>
    /// <param name="layout">The current layout.</param>
    /// <returns></returns>
    [HttpDelete("{id:int}")]
    public IActionResult Delete(int id) {
        var file = FileService.Get(id, trashed: true);
        if (file == null) {
            return BadRequest();
        }

        file = FileService.Delete(id);

        if (Request.IsTurboStream()) {
            return TurboStream.Remove($"_{GetLayout(file.Parent.Id)}File", file);
        }

        return SeeOtherAction(nameof(Get), new { id = EntityUtils.ResolveAppId(file) });
    }

    /// <summary>
    /// Inserts a new comment and attaches it to the specified <see cref="File"/>.
    /// </summary>
    /// <param name="id">The id of the <see cref="File"/> to attach the comment to.</param>
    /// <param name="model">The comment data.</param>
    /// <returns></returns>
    [HttpPost("{id:int}/comments")]
    public IActionResult InsertComment(int id, MessageModel model) {
        var file = FileService.Get(id);
        if (file == null) {
            return BadRequest();
        }


        if (ModelState.IsValid) {
            var comment = CommentService.Insert(new Comment { Text = model.Text, EmbedId = model.EmbedId, MeetingId = model.MeetingId, Options = model.Options?.Select(x => new PollOption(x.Text)) }, file, blobs: model.Blobs);

            if (Request.IsTurboStream()) {
                var result = new TurboStreamsResult();

                // reset form
                ModelState.Clear();
                result.Streams.Add(TurboStream.Replace(TurboStreamHelper.DomId(this, "_CommentForm", file), "_CommentForm", new MessageModel { Parent = file }));

                // replace placeholder with inserted comment
                result.Streams.Add(TurboStream.Replace(TurboStreamHelper.DomId(this, "_CommentPlaceholder", file), "_Comment", comment));
                return result;
            }
            return SeeOtherAction(nameof(Get), new { id });
        }

        // validation error, display form again
        model.Parent = file;
        return PartialView("_CommentForm", model);
    }

    /// <summary>
    /// Returns a partial view with comment details. 
    /// </summary>
    /// <param name="id">Comment id.</param>
    /// <returns></returns>
    [HttpGet("comments/{id:int}")]
    public IActionResult GetComment(int id) {
        var comment = CommentService.Get(id);
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
        var comment = CommentService.Get(id);
        if (comment == null) {
            return BadRequest();
        }
        comment = CommentService.Trash(comment.Id);

        var result = new TurboStreamsResult();
        result.Streams.Add(TurboStream.Replace("_Comment", comment));
        return result;
    }

    /// <summary>
    /// Restore a trashed comment.
    /// </summary>
    /// <param name="id">Id of the comment to restore.</param>
    /// <returns></returns>
    [HttpPost("comments/{id:int}/restore")]
    public IActionResult RestoreComment(int id) {
        var comment = CommentService.Restore(id);

        var result = new TurboStreamsResult();
        result.Streams.Add(TurboStream.Replace("_Comment", comment));
        return result;
    }

    /// <summary>
    /// Display comment edit form.
    /// </summary>
    /// <param name="id">Comment id.</param>
    /// <returns></returns>
    [HttpGet("comments/{id:int}/edit")]
    public IActionResult EditComment(int id) {
        var comment = CommentService.Get(id);
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
        var comment = CommentService.Get(id);
        if (comment == null) {
            return BadRequest();
        }

        if (ModelState.IsValid) {
            comment.AttachmentIds = model.Attachments;
            comment.EmbedId = model.EmbedId;
            comment.Text = model.Text;
            comment.MeetingId = model.MeetingId;
            comment.Options = model.Options?.Select(x => new PollOption { Id = x.Id, Text = x.Text });
            comment = CommentService.Update(comment, blobs: model.Blobs);

            return PartialView("_Comment", comment);
        }

        // validation error, display form again
        model.Parent = comment.Parent;
        model.Message = comment;
        return PartialView("_CommentForm", model);
    }
}
