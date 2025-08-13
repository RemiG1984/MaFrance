
// chartWatermark.js - Vue compatible watermark plugin
export const watermarkPlugin = {
  id: "watermark",
  afterDraw: function (chart) {
    const ctx = chart.ctx;
    ctx.save();

    // Watermark properties styled to match the original styles
    ctx.font = "14px 'Roboto', Arial, sans-serif";
    ctx.fillStyle = "rgba(52, 58, 64, 0.5)"; // Matches #343a40 with 50% opacity
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";

    // Watermark text
    const watermarkText = "https://ouvamafrance.replit.app";
    const padding = 10;
    const offset = 20;
    const x = chart.chartArea.left - padding + offset;
    const y = chart.chartArea.bottom - padding;

    // Draw the watermark
    ctx.fillText(watermarkText, x, y);

    ctx.restore();
  },
};

// Function to register the watermark plugin
export function registerWatermarkPlugin() {
  if (typeof Chart !== "undefined") {
    Chart.register(watermarkPlugin);
  }
}
