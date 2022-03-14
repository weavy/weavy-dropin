using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
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
/// Controller for common entity related actions.
/// </summary>
[Route("[area]")]
public class EntityController : AreaController {

    /// <summary>
    /// Uploads new blob(s). The request format is expected to be multipart/form-data.
    /// After upload the blob(s) can be used as references when creating attachments. 
    /// </summary>
    /// <returns>The uploaded blobs(s).</returns>
    [HttpPost("attachments")]
    public async Task<IActionResult> Upload() {
        var blobs = await Request.SaveBlobsAsync();
        return PartialView("_Blobs", blobs);
    }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="external"></param>
    /// <returns></returns>
    [HttpPost("externalblobs")]
    public IActionResult ExternalBlobs([FromBody] IEnumerable<ExternalBlob> external) {
        List<Blob> blobs = new List<Blob>();
        foreach (var eb in external) {
            var blob = BlobService.Insert(eb);
            blobs.Add(blob);
        }

        var uploadedBlobs = BlobService.Get(blobs.Select(x => x.Id));

        return PartialView("_Blobs", uploadedBlobs);
    }

    /// <summary>
    /// Get the badge for the specified app        
    /// </summary>
    /// <returns>The badge count</returns>
    [HttpGet("badge/{id:int}")]
    public IActionResult Badge(int id) {
        var app = AppService.Get(id);
        if (app is IBadge badgeApp) {
            return new JsonResult(badgeApp.GetBadge(WeavyContext.Current.User.Id));
        }
        return new JsonResult(null);
    }


    /// <summary>
    /// Creates a new meeting        
    /// </summary>
    /// <returns>The uploaded meeting(s).</returns>
    [HttpPost("meeting")]
    public IActionResult Meeting(MeetingModel model) {

        var meeting = MeetingService.CreateMeeting(model.Provider);
        return PartialView("_MeetingRow", meeting);
    }

    /// <summary>
    /// Updates an existing new meeting        
    /// </summary>
    /// <returns>The uploaded meeting(s).</returns>
    [HttpPut("meeting")]
    public IActionResult UpdateMeeting(MeetingModel model) {

        var meeting = MeetingService.CreateMeeting(model.Provider);
        var result = new TurboStreamsResult();
        result.Streams.Add(TurboStream.Replace($"new_{model.Provider}_meeting", "_MeetingRow", meeting));

        return result;


    }

    /// <summary>
    /// Signs out from a meeting provider
    /// </summary>
    /// <returns></returns>
    [HttpPost("meeting/signout")]
    public IActionResult MeetingSignOut(string provider) {
        TokenService.Clear(provider);
        return Ok();
    }

    /// <summary>
    /// Like the specified entity.
    /// </summary>
    /// <param name="id">Entity id.</param>
    /// <returns></returns>
    [HttpPost("{id:uid}/like")]
    public IActionResult Like(string id) {
        var likeable = EntityService.Get(id).Value() as IReactable;
        if (likeable == null) {
            return BadRequest();
        }
        likeable = EntityService.Like(likeable);

        var result = new TurboStreamsResult();
        result.Streams.Add(TurboStream.Replace("_Likes", likeable));
        result.Streams.Add(TurboStream.Replace("_ReactionList", likeable));
        result.Streams.Add(TurboStream.Replace("_ReactionForm", likeable));
        return result;
    }

    /// <summary>
    /// Unlike the specified entity.
    /// </summary>
    /// <param name="id">Entity identifier.</param>
    /// <returns></returns>
    [HttpPost("{id:uid}/unlike")]
    public IActionResult Unlike(string id) {
        var likeable = EntityService.Get(id).Value() as IReactable;
        if (likeable == null) {
            return BadRequest();
        }
        likeable = EntityService.Unlike(likeable);

        // TODO: also push update over signalr
        var result = new TurboStreamsResult();
        result.Streams.Add(TurboStream.Replace("_Likes", likeable));
        result.Streams.Add(TurboStream.Replace("_ReactionList", likeable));
        result.Streams.Add(TurboStream.Replace("_ReactionForm", likeable));
        return result;
    }


    /// <summary>
    /// React to the specified entity.
    /// </summary>
    /// <param name="id">Entity identifier.</param>
    /// <param name="reaction"></param>
    /// <returns></returns>
    [HttpPost("{id:uid}/react")]
    public IActionResult ToggleReaction(string id, string reaction) {
        var reactable = EntityService.Get<IReactable>(id);
        if (reactable == null) {
            return BadRequest();
        }

        // convert to unicode
        reaction = Emojione.UnifyUnicode(reaction);

        if (reactable.HasReacted(reaction)) {
            reactable = EntityService.Unreact(reactable);
        } else {
            reactable = EntityService.React(reactable, reaction);
        }

        var result = new TurboStreamsResult();
        result.Streams.Add(TurboStream.Replace("_ReactionList", reactable));
        result.Streams.Add(TurboStream.Replace("_ReactionForm", reactable));
        if (reaction == "👍") {
            // also update likes 
            result.Streams.Add(TurboStream.Replace("_Likes", reactable));
        }

        return result;
    }

    /// <summary>
    /// Get a reactable as a partial.
    /// </summary>
    /// <param name="id">Entity identifier.</param>
    /// <returns></returns>
    [HttpGet("{id:uid}/react")]
    public IActionResult PartialReactable(string id) {
        var reactable = EntityService.Get<IReactable>(id);
        if (reactable == null) {
            return BadRequest();
        }

        return PartialView("_ReactionList", reactable);
    }

    /// <summary>
    /// Display modal with reactions to the specified entity.
    /// </summary>
    /// <param name="id">Entity identifier.</param>
    /// <returns></returns>
    [HttpGet("{id:uid}/reactions")]
    public IActionResult ReactionsModal(string id) {
        var reactable = EntityService.Get<IReactable>(id);
        if (reactable == null) {
            return BadRequest();
        }

        return View("_ReactionsModal", reactable);
    }

    /// <summary>
    /// Display reaction form for specified entity.
    /// </summary>
    /// <param name="id">Entity identifier.</param>
    /// <returns></returns>
    [HttpGet("{id:uid}/reaction-form")]
    public IActionResult ReactionForm(string id) {
        var reactable = EntityService.Get<IReactable>(id);
        if (reactable == null) {
            return BadRequest();
        }

        return View("_ReactionForm", reactable);
    }


    /// <summary>
    /// Star the specified entity.
    /// </summary>
    /// <param name="id">Entity identifier.</param>
    /// <returns></returns>
    [HttpPost("{id:uid}/star")]
    public IActionResult Star(string id) {
        var starrable = EntityService.Get<IStarrable>(id);
        if (starrable == null) {
            return BadRequest();
        }
        starrable = EntityService.Star(starrable);
        var result = new TurboStreamsResult();
        result.Streams.Add(TurboStream.Replace("_StarButton", starrable));
        result.Streams.Add(TurboStream.Replace("_StarMenuItem", starrable));
        return result;
    }

    /// <summary>
    /// Unstar the specified entity.
    /// </summary>
    /// <param name="id">Entity identifier.</param>
    /// <returns></returns>
    [HttpPost("{id:uid}/unstar")]
    public IActionResult Unstar(string id) {
        var starrable = EntityService.Get<IStarrable>(id);
        if (starrable == null) {
            return BadRequest();
        }
        starrable = EntityService.Unstar(starrable);
        var result = new TurboStreamsResult();
        result.Streams.Add(TurboStream.Replace("_StarButton", starrable));
        result.Streams.Add(TurboStream.Replace("_StarMenuItem", starrable));
        return result;
    }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="id"></param>
    /// <param name="reaction"></param>
    /// <returns></returns>
    [HttpGet("turbostream-toggle-reaction/{id:uid}/react")]
    public IActionResult TurboStreamToggleReaction(string id, string reaction) {
        var reactable = EntityService.Get<IReactable>(id);
        if (reactable == null) {
            return BadRequest();
        }

        var result = new TurboStreamsResult();
        result.Streams.Add(TurboStream.Replace("_ReactionList", reactable));
        result.Streams.Add(TurboStream.Replace("_ReactionForm", reactable));
        if (reaction == "👍") {
            // also update likes 
            result.Streams.Add(TurboStream.Replace("_Likes", reactable));
        }

        return result;
    }
}
