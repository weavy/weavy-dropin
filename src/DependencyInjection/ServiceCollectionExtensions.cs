using System;
using System.Reflection;
using Microsoft.AspNetCore.Builder;

namespace Microsoft.Extensions.DependencyInjection;

/// <summary>
/// 
/// </summary>
public static class ServiceCollectionExtensions {

    /// <summary>
    /// Register assembly to be scanned for plugins.
    /// </summary>
    public static WeavyOptions AddDropin(this WeavyOptions opts) {
        // add current assembly to list of assemblies that are scanned for plugins
        opts.PluginAssemblies.Add(Assembly.GetExecutingAssembly());
        return opts;

    }
}
