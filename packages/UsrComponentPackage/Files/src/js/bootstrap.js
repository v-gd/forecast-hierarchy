(function () {
    /* Load the AMD-based custom element */
    require.config({
        paths: {
            "forecast-hierarchy": Terrasoft.getFileContentUrl(
                "UsrComponentPackage",
                "src/js/forecast-hierarchy.js"
            ),
        },
    });

    /* Load the Module Federation remote module for Freedom UI Designer */
    var remoteEntryUrl = Terrasoft.getFileContentUrl(
        "UsrComponentPackage",
        "src/js/forecast_hierarchy/remoteEntry.js"
    );

    var script = document.createElement("script");
    script.src = remoteEntryUrl;
    script.type = "text/javascript";
    script.onload = function () {
        if (window.forecast_hierarchy) {
            var shareScopes = (typeof __webpack_share_scopes__ !== "undefined")
                ? __webpack_share_scopes__.default
                : {};
            window.forecast_hierarchy.init(shareScopes);
            window.forecast_hierarchy.get("./RemoteEntry").then(function (factory) {
                try { factory(); } catch(e) {
                    /* Ignore "already been used with this registry" — element already defined */
                    if (e.name !== "NotSupportedError") throw e;
                }
                console.log("Forecast hierarchy remote module initialized");
            }).catch(function(e) {
                console.warn("Forecast hierarchy remote init:", e);
            });
        }
    };
    document.head.appendChild(script);
})();
