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
        query.OrderBy = $"IsPinned DESC, {nameof(Message.Id)} DESC";
        query.Parent = app;
        // limit page size to [1,10]
        query.Top = Math.Clamp(query.Top ?? PageSizeSmall, 1, PageSizeSmall);
        app.Messages = MessageService.Search(query);

        if (Request.IsAjaxRequest()) {
            // infinite scroll, return partial view                
            return PartialView("_Posts", app.Messages);
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
            var post = new Message { Text = model.Text, EmbedId = model.EmbedId, MeetingId = model.MeetingId, Options = model.Options?.Select(x => new PollOption(x.Text)) };
            post = MessageService.Insert(post, app, blobs: model.Blobs);

            if (Request.IsTurboStream()) {                              
                var result = new TurboStreamsResult();

                // reset form
                ModelState.Clear();
                result.Streams.Add(TurboStream.Replace(TurboStreamHelper.DomId(this, "_PostForm", app), "_PostForm", new MessageModel { Parent = app }));

                // replace placeholder with inserted post 
                result.Streams.Add(TurboStream.Replace(TurboStreamHelper.DomId(this, "_PostPlaceholder", app), "~/Areas/Dropin/Views/Post/_Post.cshtml", post));
                return result;
            }

            return SeeOtherAction(nameof(Get), new { id });
        }

        // REVIEW: _PostForm tar inte in en MessageModel. Är det kanske _PostEditor vi ska returnera?
        // validation error, display form again
        model.Parent = app;
        return PartialView("_PostForm", model);
    }
}
