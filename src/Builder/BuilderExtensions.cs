using System.Reflection;

namespace Weavy.Core.Builder;

/// <summary>
/// Helper class for registering the Dropin area/module.
/// </summary>
public static class BuilderExtensions {

    /// <summary>
    /// Register assembly to be scanned for plugins.
    /// </summary>
    public static WeavyOptions AddDropin(this WeavyOptions opts) {
        // add current assembly to list of assemblies that are scanned for plugins
        opts.PluginAssemblies.Add(Assembly.GetExecutingAssembly());
        return opts;
    }
}
