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
            try { window.forecast_hierarchy.init(shareScopes); } catch(e) { /* already initialized */ }
            console.log("Forecast hierarchy remote module loaded");
        }
    };
    document.head.appendChild(script);
})();
