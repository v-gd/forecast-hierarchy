(function () {
    require.config({
        paths: {
            "forecast-hierarchy": Terrasoft.getFileContentUrl(
                "ForecastHierarchy",
                "src/js/forecast-hierarchy.js"
            ),
        },
    });
})();
