// chartWatermark.js
(function () {
    // Register a Chart.js plugin for adding a watermark
    if (typeof Chart !== "undefined") {
        Chart.register({
            id: "watermark",
            afterDraw: function (chart) {
                const ctx = chart.ctx;
                ctx.save();

                // Watermark properties styled to match styles.css
                ctx.font = "14px 'Roboto', Arial, sans-serif"; // Matches font-family from styles.css
                ctx.fillStyle = "rgba(52, 58, 64, 0.5)"; // Matches #343a40 with 50% opacity for subtlety
                ctx.textAlign = "right"; // Align to bottom-right
                ctx.textBaseline = "bottom";

                // Watermark text
                const watermarkText = "ouvamafrance.replit.app";
                const padding = 10; // Consistent with spacing in styles.css (e.g., padding: 10px)
                const x = chart.chartArea.right - padding;
                const y = chart.chartArea.bottom - padding;

                // Draw the watermark
                ctx.fillText(watermarkText, x, y);

                ctx.restore();
            },
        });
    } else {
        console.error(
            "Chart.js is not loaded. Watermark plugin cannot be registered.",
        );
    }
})();
