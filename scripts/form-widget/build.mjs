import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import JavaScriptObfuscator from "javascript-obfuscator";

const src = readFileSync(new URL("./widget.js", import.meta.url), "utf8");
const out = JavaScriptObfuscator.obfuscate(src, {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.6,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.25,
  identifierNamesGenerator: "hexadecimal",
  renameGlobals: false,
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 6,
  stringArray: true,
  stringArrayEncoding: ["base64"],
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayThreshold: 1,
  transformObjectKeys: true,
  unicodeEscapeSequence: false,
  target: "browser",
}).getObfuscatedCode();
mkdirSync(new URL("../../public/", import.meta.url), { recursive: true });
writeFileSync(new URL("../../public/fw.js", import.meta.url), out);
console.log("public/fw.js", out.length, "bytes");
