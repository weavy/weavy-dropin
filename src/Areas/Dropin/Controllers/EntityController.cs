using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EmojiToolkit;
using Microsoft.AspNetCore.Http;
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
    /// Upload a blob. The request format is expected to be multipart/form-data.
    /// After upload the blob can be used as reference when creating attachments. 
    /// </summary>
    /// <returns>The uploaded blobs.</returns>
    [HttpPost("attachments")]
    public async Task<IActionResult> Upload() {
        var blob = await Request.SaveBlobAsync();
        if (blob == null) {
            return BadRequest();
        }
        return PartialView("_Blob", blob);
    }

    /// <summary>
    /// Insert an external blob.
    /// After insert the blob can be used as reference when creating attachments. 
    /// </summary>
    /// <param name="model"></param>
    /// <returns></returns>
    [HttpPost("external")]
    public IActionResult ExternalBlobs([FromBody] ExternalBlob model) {
        var blob = BlobService.Insert(model);
        return PartialView("_Blob", blob);
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
        return TurboStream.Replace($"new_{model.Provider}_meeting", "_MeetingRow", meeting);
    }

    /// <summary>
    /// Signs out from a meeting provider
    /// </summary>
    /// <returns></returns>
    [HttpPost("meeting/signout")]
    public IActionResult MeetingSignOut(string provider) {
        ExternalTokenService.Delete(WeavyContext.Current.User.Id, provider);
        return Ok();
    }

    /// <summary>
    /// Creates a new <see cref="Embed"/>.
    /// </summary>
    /// <param name="url">The url to scrape.</param>
    /// <param name="target">The id of the target dom element.</param>
    /// <returns></returns>
    [HttpPost("embed")]
    public IActionResult Embed(string url, string target) {
        var embed = EmbedService.Insert(url);
        if (embed == null) {
            return NotFound();
        }
        return TurboStream.Prepend(target, "_Embed", embed);
    }

    /// <summary>
    /// Vote for a poll option.
    /// </summary>
    /// <param name="id">Poll option id.</param>
    /// <returns></returns>
    [HttpPost("{id:int}/vote")]
    public IActionResult Vote(int id) {
        var option = PollService.Vote(id);
        var poll = option.Parent as Msg;
        return TurboStream.Replace("_Poll", poll);
    }

    /// <summary>
    /// Get who voted for a specific poll option.
    /// </summary>
    /// <param name="id">Poll option id.</param>
    /// <returns></returns>
    [HttpGet("{id:int}/votes")]
    public IActionResult Votes(int id) {
        var option = PollService.GetOption(id);
        return View("_VotesSheet", option);
    }

    /// <summary>
    /// Like the specified entity.
    /// </summary>
    /// <param name="id">Entity id.</param>
    /// <returns></returns>
    [HttpPost("{id:eid}/like")]
    public IActionResult Like(string id) {
        var likeable = EntityService.Get<IReactable>(id);
        if (likeable == null) {
            return BadRequest();
        }

        // like
        ReactionService.Like(likeable);

        // get updated entity
        likeable = EntityService.Get<IReactable>(id);

        var result = new TurboStreamsResult();
        result.Streams.Add(TurboStream.Replace("_Likes", likeable));
        result.Streams.Add(TurboStream.Replace("_Reactions", likeable));
        result.Streams.Add(TurboStream.Replace("_ReactionForm", likeable));
        return result;
    }

    /// <summary>
    /// Unlike the specified entity.
    /// </summary>
    /// <param name="id">Entity identifier.</param>
    /// <returns></returns>
    [HttpPost("{id:eid}/unlike")]
    public IActionResult Unlike(string id) {
        var likeable = EntityService.Get<IReactable>(id);
        if (likeable == null) {
            return BadRequest();
        }
        // unlike
        ReactionService.Unlike(likeable);

        // get updated entity
        likeable = EntityService.Get<IReactable>(id);

        var result = new TurboStreamsResult();
        result.Streams.Add(TurboStream.Replace("_Likes", likeable));
        result.Streams.Add(TurboStream.Replace("_Reactions", likeable));
        result.Streams.Add(TurboStream.Replace("_ReactionForm", likeable));
        return result;
    }

    /// <summary>
    /// Toggle reaction to the specified entity.
    /// </summary>
    /// <param name="id">Entity identifier.</param>
    /// <param name="content"></param>
    /// <returns></returns>
    [HttpPost("{id:eid}/react")]
    public IActionResult ToggleReaction(string id, string content) {
        var reactable = EntityService.Get<IReactable>(id);
        if (reactable == null) {
            return BadRequest();
        }

        // convert to unicode
        content = Emoji.Raw(content);

        // toggle reaction
        var reaction = ReactionService.Get(reactable, WeavyContext.Current.User.Id);
        if (reaction != null && reaction.Content == content) {
            ReactionService.Unreact(reactable);
        } else {
            ReactionService.React(reactable, content);
        }

        // get updated entity
        reactable = EntityService.Get<IReactable>(id);

        var result = new TurboStreamsResult();
        result.Streams.Add(TurboStream.Replace("_Reactions", reactable));
        result.Streams.Add(TurboStream.Replace("_ReactionForm", reactable));
        if (content == ReactionService.LIKE) {
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
    [HttpGet("{id:eid}/react")]
    public IActionResult PartialReactable(string id) {
        var reactable = EntityService.Get<IReactable>(id);
        if (reactable == null) {
            return BadRequest();
        }

        return PartialView("_Reactions", reactable);
    }

    /// <summary>
    /// Display modal with reactions to the specified entity.
    /// </summary>
    /// <param name="id">Entity identifier.</param>
    /// <returns></returns>
    [HttpGet("{id:eid}/reactions")]
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
    [HttpGet("{id:eid}/reaction-form")]
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
    [HttpPost("{id:eid}/star")]
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
    [HttpPost("{id:eid}/unstar")]
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
    /// Follow the specified entity.
    /// </summary>
    /// <param name="id">Entity identifier.</param>
    /// <returns></returns>
    [HttpPost("{id:eid}/follow")]
    public IActionResult Follow(string id) {
        var followable = EntityService.Get<IFollowable>(id);
        if (followable == null) {
            return BadRequest();
        }
        followable = EntityService.Follow(followable);
        var result = new TurboStreamsResult();
        result.Streams.Add(TurboStream.Replace("_FollowMenuItem", followable));
        return result;
    }

    /// <summary>
    /// Un-follow the specified entity.
    /// </summary>
    /// <param name="id">Entity identifier.</param>
    /// <returns></returns>
    [HttpPost("{id:eid}/unfollow")]
    public IActionResult Unfollow(string id) {
        var followable = EntityService.Get<IFollowable>(id);
        if (followable == null) {
            return BadRequest();
        }
        followable = EntityService.Unfollow(followable);
        var result = new TurboStreamsResult();
        result.Streams.Add(TurboStream.Replace("_FollowMenuItem", followable));
        return result;
    }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="id"></param>
    /// <param name="reaction"></param>
    /// <returns></returns>
    [HttpGet("turbostream-toggle-reaction/{id:eid}/react")]
    public IActionResult TurboStreamToggleReaction(string id, string reaction) {
        var reactable = EntityService.Get<IReactable>(id);
        if (reactable == null) {
            return BadRequest();
        }

        var result = new TurboStreamsResult();
        result.Streams.Add(TurboStream.Replace("_Reactions", reactable));
        result.Streams.Add(TurboStream.Replace("_ReactionForm", reactable));
        if (reaction == ReactionService.LIKE) {
            // also update likes 
            result.Streams.Add(TurboStream.Replace("_Likes", reactable));
        }

        return result;
    }
}
