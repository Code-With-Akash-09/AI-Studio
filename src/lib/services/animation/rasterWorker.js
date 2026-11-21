/** worker_threads rasterizer: SVG string → PNG bytes (resvg). */
import { parentPort } from "node:worker_threads";
import { Resvg } from "@resvg/resvg-js";

parentPort.on("message", ({ id, svg }) => {
    const png = new Resvg(svg, { font: { loadSystemFonts: false } })
        .render()
        .asPng();
    const out = new Uint8Array(png);
    parentPort.postMessage({ id, png: out }, [out.buffer]);
});
