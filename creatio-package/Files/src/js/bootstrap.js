(function () {
    require.config({
        paths: {
            "forecast-hierarchy": Terrasoft.getFileContentUrl(
                "UsrComponentPackage",
                "src/js/forecast-hierarchy.js"
            ),
        },
    });
})();
