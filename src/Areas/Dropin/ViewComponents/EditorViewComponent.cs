using Microsoft.AspNetCore.Mvc;

namespace Weavy.Dropin.ViewComponents;

/// <summary>
/// 
/// </summary>
public class EditorViewComponent : ViewComponent {


    /// <summary>
    /// 
    /// </summary>        
    /// <param name="placeholder"></param>
    /// <param name="sendButton"></param>        
    /// <returns></returns>
    public IViewComponentResult Invoke(string placeholder, string sendButton) {
        ViewBag.Placeholder = placeholder;
        ViewBag.SendButton = sendButton;
        return View();
    }
}
