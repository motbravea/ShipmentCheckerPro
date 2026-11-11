namespace ShipmentCheckerPro.Api.Data;

public static class AppDataPaths
{
    public static string Root
    {
        get
        {
            var configuredRoot = Environment.GetEnvironmentVariable("SHIPMENTCHECKER_DATA_DIR");
            if (!string.IsNullOrWhiteSpace(configuredRoot))
            {
                return Path.GetFullPath(configuredRoot);
            }

            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            return Path.Combine(appData, "ShipmentCheckerProDemo");
        }
    }

    public static string DatabasePath => Path.Combine(Root, "data.db");
    public static string PhotosPath => Path.Combine(Root, "photos");
}
