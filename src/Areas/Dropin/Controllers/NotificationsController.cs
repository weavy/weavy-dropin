using System;
using Microsoft.AspNetCore.Mvc;
using Weavy.Core;
using Weavy.Core.Http;
using Weavy.Core.Models;
using Weavy.Core.Mvc;
using Weavy.Core.Services;

namespace Weavy.Dropin.Controllers;

/// <summary>
/// Controller for the <see cref="Notifications"/> app.
/// </summary>
public class NotificationsController : AreaController { 

    /// <summary>
    /// Display notifications.
    /// </summary>
    /// <param name="id">App id.</param>
    /// <param name="query">Query options for paging etc.</param>
    /// <returns></returns>
    [HttpGet("{id:int}")]
    public IActionResult Get(int id, NotificationQuery query) {
        var app = AppService.Get<Notifications>(id);
        if (app == null) {
            return BadRequest();
        }

        query.UserId = WeavyContext.Current.User.Id;
        query.Top = Math.Clamp(query.Top ?? PageSizeMedium, 1, PageSizeMedium);
        query.Trashed = false;
        query.OrderBy = "Id DESC";

        app.Items = NotificationService.Search(query);

        if (Request.IsAjaxRequest()) {
            // infinite scroll, return partial view                
            return PartialView("_Notifications", app.Items);
        }

        return View(app);
    }


    /// <summary>
    /// Marks all notifications as read. 
    /// </summary>
    /// <returns></returns>
    [HttpPost("read")]
    public IActionResult ReadAll() {
        return BadRequest();
        //NotificationService.Read();
    }


    /// <summary>
    /// Marks notification as read. 
    /// </summary>
    /// <param name="id">Notification id.</param>
    /// <returns></returns>
    [HttpPost("read/{id:int}")]
    public IActionResult Read(int id) {
        var notification = NotificationService.Get(id);
        if (notification == null) {
            return BadRequest();
        }
        notification.ReadAt = DateTime.UtcNow;
        notification = NotificationService.Update(notification);

        return PartialView("_Notification", notification);
    }

    /// <summary>
    /// Marks notification as unread. 
    /// </summary>
    /// <param name="id">Notification id.</param>
    /// <returns></returns>
    [HttpPost("unread/{id:int}")]
    public IActionResult Unread(int id) {
        var notification = NotificationService.Get(id);
        if (notification == null) {
            return BadRequest();
        }
        notification.ReadAt = null;
        notification = NotificationService.Update(notification);

        return PartialView("_Notification", notification);
    }

    /// <summary>
    /// Trash a notification.
    /// </summary>
    /// <param name="id">Id of the notification to trash.</param>
    /// <returns></returns>
    [HttpPost("trash/{id:int}")]
    public IActionResult Trash(int id) {
        var notification = NotificationService.Get(id);
        if (notification == null) {
            return BadRequest();
        }
        notification = NotificationService.Trash(notification.Id);

        return PartialView("_Notification", notification);
    }

    /// <summary>
    /// Restore a trashed notification.
    /// </summary>
    /// <param name="id">Id of the notification to restore.</param>
    /// <returns></returns>
    [HttpPost("restore/{id:int}")]
    public IActionResult Restore(int id) {
        var notification = NotificationService.Get(id, trashed: true);
        if (notification == null) {
            return BadRequest();
        }
        notification = NotificationService.Restore(notification.Id);

        return PartialView("_Notification", notification);
    }

    /// <summary>
    /// Add a new notification.
    /// </summary>
    /// <param name="id">Id of the notification to add.</param>
    /// <returns></returns>
    [HttpGet("turbostream-insert-notification/{id:int}")]
    public IActionResult TurboStreamInsertNotification(int id) {
        var notification = NotificationService.Get(id, trashed: true);
        if (notification == null) {
            return BadRequest();
        }
        var result = new TurboStreamsResult();
        result.Streams.Add(TurboStream.Append("notifications", "_Notification", notification));

        return result;
    }
}
