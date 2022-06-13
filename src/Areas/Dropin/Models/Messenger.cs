using System;
using System.Runtime.InteropServices;
using Weavy.Core.Services;

namespace Weavy.Core.Models;

/// <summary>
/// A view component for displaying the messenger.
/// </summary>
public class Messenger : IBadge {

    /// <summary>
    /// Gets the list of conversations.
    /// </summary>
    public ConversationSearchResult Conversations { get; set; } = new ConversationSearchResult();

    /// <summary>
    /// Get the number of unread conversations for the specified member.
    /// </summary>
    /// <param name="memberId"></param>
    /// <returns>The number of unread messages</returns>
    public long GetBadge(int memberId) {
        var query = new ConversationQuery {
            MemberId = memberId,
            Contextual = false, // chat rooms and private chats
            Unread = true,
            CountOnly = true,
            Sudo = true
        };

        return ConversationService.Search(query).TotalCount ?? 0;
    }
}
