"use strict";

const { createDecipheriv, createHash, verify } = require("node:crypto");
const { gunzipSync } = require("node:zlib");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");

const MAGIC = Buffer.from("MIMOSA1\0", "ascii");
const VERSION = 1;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const FIXED_HEADER_BYTES = MAGIC.length + 1 + 2 + IV_BYTES + TAG_BYTES;
const PRIVATE_ASSET_MAGIC = Buffer.from("MIMASSET", "ascii");
const PRIVATE_ASSET_VERSION = 1;
const PRIVATE_ASSET_SCHEMA = "mimosa-private-assets/v1";
const PRIVATE_ASSET_SLOT = Symbol.for("mimosa.private-assets/v1");
const PRIVATE_ASSET_HEADER_BYTES = PRIVATE_ASSET_MAGIC.length + 1 + 2;
const PRIVATE_ASSET_ENTRY_FIXED_BYTES = 2 + 4 + 32;
const PRIVATE_ASSET_ID_RE = /^[a-f0-9]{32}$/;
const MAX_PRIVATE_ASSET_COUNT = 64;
const MAX_PRIVATE_ASSET_PACK_BYTES = 64 * 1024 * 1024;
// build-protected replaces this only for signed delivery packages. Keeping an
// unsigned developer build supported makes local protection debugging possible.
const integrityPublicKeyPem = "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAed1gHCLSatReM8maWfsdvWfTc40E8Gj6ZD5V5gKtN0E=\n-----END PUBLIC KEY-----\n";
let packageIntegrityChecked = false;
let inheritedProtectionKey = null;

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}

function manifestBytes(manifest) {
  const unsigned = { ...manifest, integrity: { ...(manifest.integrity || {}) } };
  delete unsigned.integrity.signature;
  return Buffer.from(canonicalJson(unsigned), "utf8");
}

function listFiles(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir).sort()) {
    // Finder may add directory-view metadata after the package is signed. Ignore
    // only .DS_Store; all other unexpected paths are still rejected below.
    if (entry === ".DS_Store") continue;
    const file = path.join(dir, entry);
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) throw new Error(`交付包不允许符号链接：${path.relative(base, file)}`);
    if (stat.isDirectory()) listFiles(file, base, out);
    else if (stat.isFile()) {
      if (stat.nlink > 1) throw new Error(`交付包不允许硬链接：${path.relative(base, file)}`);
      out.push(path.relative(base, file).split(path.sep).join("/"));
    }
    else throw new Error(`交付包包含不支持的文件类型：${path.relative(base, file)}`);
  }
  return out;
}

function isCanonicalProtectedRelativePath(relative) {
  if (typeof relative !== "string" || relative.length === 0 || relative.length > 1024) return false;
  if (!/^[A-Za-z0-9._/-]+$/.test(relative)) return false;
  if (relative.startsWith("/") || /^[A-Za-z]:/.test(relative) || relative.includes("\\")) return false;
  const parts = relative.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) return false;
  return path.posix.normalize(relative) === relative;
}

function verifyProtectedPackage() {
  if (!integrityPublicKeyPem || packageIntegrityChecked) return;
  try {
    // 共享载荷多平台布局:清单在 mimosa-zcode/manifest.json,只覆盖共享载荷子树。
    // 旧单树布局:清单在包根 <root>/manifest.json。二者按 manifest.json 存在与否择一。
    const sharedRoot = path.dirname(__dirname);          // mimosa-zcode
    const legacyRoot = path.dirname(sharedRoot);         // <root>
    const protectedRoot = fs.existsSync(path.join(sharedRoot, "manifest.json")) ? sharedRoot : legacyRoot;
    const manifest = JSON.parse(fs.readFileSync(path.join(protectedRoot, "manifest.json"), "utf8"));
    const integrity = manifest?.integrity;
    const expectedFingerprint = createHash("sha256").update(integrityPublicKeyPem, "utf8").digest("hex");
    if (
      manifest?.schema !== "mimosa-protected-build/v1" ||
      manifest?.protection?.integritySignatureRequired !== true ||
      integrity?.schema !== "mimosa-protected-integrity/v1" ||
      integrity?.algorithm !== "Ed25519" ||
      integrity?.publicKeySha256 !== expectedFingerprint ||
      typeof integrity?.signature !== "string" ||
      !verify(null, manifestBytes(manifest), integrityPublicKeyPem, Buffer.from(integrity.signature, "base64"))
    ) {
      throw new Error("manifest Ed25519 签名无效");
    }
    const actualFiles = listFiles(protectedRoot).filter((name) => name !== "manifest.json").sort();
    const declared = Array.isArray(manifest.files) ? manifest.files : [];
    const declaredPaths = declared.map((file) => file.path).sort();
    if (JSON.stringify(actualFiles) !== JSON.stringify(declaredPaths)) {
      throw new Error("manifest 文件清单不匹配");
    }
    for (const file of declared) {
      if (!file || !isCanonicalProtectedRelativePath(file.path)) {
        throw new Error("manifest 含非法文件路径");
      }
      const contents = fs.readFileSync(path.join(protectedRoot, file.path));
      if (contents.length !== file.bytes || createHash("sha256").update(contents).digest("hex") !== file.sha256) {
        throw new Error(`文件哈希不匹配：${file.path}`);
      }
    }
    packageIntegrityChecked = true;
  } catch (error) {
    throw new Error(`Mimosa 保护包完整性校验失败：${error.message}`);
  }
}

function decodeKey(raw) {
  if (raw.length === 32) return Buffer.from(raw);
  const text = raw.toString("utf8").trim();
  if (/^[0-9a-f]{64}$/i.test(text)) return Buffer.from(text, "hex");
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(text)) {
    const decoded = Buffer.from(text, "base64");
    if (decoded.length === 32) return decoded;
  }
  throw new Error("Mimosa 保护密钥格式无效");
}

function protectionKey() {
  if (inheritedProtectionKey) return Buffer.from(inheritedProtectionKey);
  const inheritedFd = String(process.env.MIMOSA_PROTECT_KEY_FD || "").trim();
  if (inheritedFd) {
    delete process.env.MIMOSA_PROTECT_KEY_FD;
    if (!/^[3-9][0-9]*$/.test(inheritedFd)) {
      throw new Error("Mimosa 内置保护密钥通道无效");
    }
    let raw;
    let encoded;
    try {
      raw = fs.readFileSync(Number(inheritedFd));
      const keyB64 = raw.toString("utf8").trim();
      encoded = Buffer.from(keyB64, "base64");
      const decoded = decodeKey(encoded);
      inheritedProtectionKey = Buffer.from(decoded);
      // 拓扑 B:密钥本就随包交付给运营方（ZCode），加密只是抬高成本、无保密性。
      // 一次性 FD 只喂到首个 Node 进程（hook loader 壳），它随后 spawn 的内层
      // cli 是独立进程、读不到已删除的 FD。把密钥透传到 env，让 hook→cli、
      // stop-hook→cli 等子进程直接解密，mcp+hook+skill 对 ZCode 即插即用。
      // 不落任何 key 文件，也不损失我们本就没有的保密性。
      if (!process.env.MIMOSA_PROTECT_KEY_B64) {
        process.env.MIMOSA_PROTECT_KEY_B64 = keyB64;
      }
      process.once("exit", () => {
        if (inheritedProtectionKey) inheritedProtectionKey.fill(0);
      });
      return decoded;
    } catch {
      throw new Error("Mimosa 内置保护密钥通道无效");
    } finally {
      if (raw) raw.fill(0);
      if (encoded) encoded.fill(0);
      try { fs.closeSync(Number(inheritedFd)); } catch { /* already closed */ }
    }
  }
  const embeddedKey = String(process.env.MIMOSA_PROTECT_KEY_B64 || "").trim();
  if (embeddedKey) {
    try {
      return decodeKey(Buffer.from(embeddedKey, "base64"));
    } catch {
      throw new Error("Mimosa 内置保护密钥格式无效");
    }
  }
  // 嵌入式密钥模块(纯 Node 自包含交付):密钥 XOR 分片编进 loader 旁的混淆 JS 模块,
  // 等价于原生二进制里的嵌入密钥——随包交付给运营方、只做 cost-raising,非保密。
  // 每个进程各自 require 它,故 hook→内层 cli 无需 env 传递密钥。
  try {
    const embeddedKeyPath = path.join(__dirname, "mimosa-embedded-key.cjs");
    if (fs.existsSync(embeddedKeyPath)) {
      const embedded = require(embeddedKeyPath);
      const raw = typeof embedded === "function" ? embedded() : embedded;
      const decoded = decodeKey(Buffer.isBuffer(raw) ? raw : Buffer.from(raw));
      if (decoded && decoded.length === 32) return decoded;
    }
  } catch {
    /* 无嵌入密钥或读取失败,继续走下方 key 文件回退 */
  }
  const keyFile =
    process.env.MIMOSA_PROTECT_KEY_FILE ||
    path.join(os.homedir(), ".mimosa", "protection.key");
  let stat;
  try {
    stat = fs.lstatSync(keyFile);
  } catch {
    throw new Error(
      `Mimosa 保护密钥不存在：${keyFile}；请设置 MIMOSA_PROTECT_KEY_FILE`
    );
  }
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`Mimosa 保护密钥必须是非符号链接普通文件：${keyFile}`);
  }
  if (stat.nlink > 1) throw new Error(`Mimosa 保护密钥不允许硬链接：${keyFile}`);
  if (process.platform !== "win32" && (stat.mode & 0o077) !== 0) {
    throw new Error(`Mimosa 保护密钥权限过宽：${keyFile}；请执行 chmod 600`);
  }
  return decodeKey(fs.readFileSync(keyFile));
}

function decrypt(payload, key, expectedArtifactId) {
  if (payload.length < FIXED_HEADER_BYTES + 1) throw new Error("Mimosa 受保护产物过短");
  if (!payload.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error("Mimosa 受保护产物格式无效");
  }
  let offset = MAGIC.length;
  const version = payload.readUInt8(offset);
  offset += 1;
  if (version !== VERSION && version !== 2) {
    throw new Error(`Mimosa 受保护产物版本不兼容：${version}`);
  }
  const idLength = payload.readUInt16BE(offset);
  offset += 2;
  const iv = payload.subarray(offset, offset + IV_BYTES);
  offset += IV_BYTES;
  const tag = payload.subarray(offset, offset + TAG_BYTES);
  offset += TAG_BYTES;
  if (payload.length < offset + idLength + 1) throw new Error("Mimosa 受保护产物头损坏");
  const id = payload.subarray(offset, offset + idLength);
  offset += idLength;
  const actualArtifactId = id.toString("utf8");
  if (actualArtifactId !== expectedArtifactId) {
    throw new Error(`Mimosa 受保护产物身份不匹配：${actualArtifactId}`);
  }
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(id);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([
    decipher.update(payload.subarray(offset)),
    decipher.final(),
  ]);
  // v2 = 加密前 gzip;解密后 gunzip 还原。v1 保持原样(向后兼容)。
  return version === 2 ? gunzipSync(plain) : plain;
}

function parseProtectedAssetPack(pack) {
  if (pack.length < PRIVATE_ASSET_HEADER_BYTES || pack.length > MAX_PRIVATE_ASSET_PACK_BYTES) {
    throw new Error("私有资产包大小无效");
  }
  if (!pack.subarray(0, PRIVATE_ASSET_MAGIC.length).equals(PRIVATE_ASSET_MAGIC)) {
    throw new Error("私有资产包格式无效");
  }
  let offset = PRIVATE_ASSET_MAGIC.length;
  const version = pack.readUInt8(offset);
  offset += 1;
  if (version !== PRIVATE_ASSET_VERSION) throw new Error(`私有资产包版本不兼容：${version}`);
  const count = pack.readUInt16BE(offset);
  offset += 2;
  if (count === 0 || count > MAX_PRIVATE_ASSET_COUNT) throw new Error("私有资产包数量无效");

  const assets = new Map();
  try {
    for (let index = 0; index < count; index += 1) {
      if (offset + PRIVATE_ASSET_ENTRY_FIXED_BYTES > pack.length) {
        throw new Error("私有资产包条目头被截断");
      }
      const idLength = pack.readUInt16BE(offset);
      offset += 2;
      const contentLength = pack.readUInt32BE(offset);
      offset += 4;
      const expectedDigest = pack.subarray(offset, offset + 32);
      offset += 32;
      if (
        idLength === 0 ||
        contentLength === 0 ||
        offset + idLength + contentLength > pack.length
      ) {
        throw new Error("私有资产包条目长度无效");
      }
      const id = pack.subarray(offset, offset + idLength).toString("ascii");
      offset += idLength;
      if (!PRIVATE_ASSET_ID_RE.test(id) || assets.has(id)) {
        throw new Error("私有资产包包含非法或重复资产身份");
      }
      const content = Buffer.from(pack.subarray(offset, offset + contentLength));
      offset += contentLength;
      const actualDigest = createHash("sha256").update(content).digest();
      if (!actualDigest.equals(expectedDigest)) {
        content.fill(0);
        actualDigest.fill(0);
        throw new Error("私有资产包条目摘要不匹配");
      }
      actualDigest.fill(0);
      assets.set(id, content);
    }
    if (offset !== pack.length) throw new Error("私有资产包包含尾随数据");
    return assets;
  } catch (error) {
    for (const bytes of assets.values()) bytes.fill(0);
    assets.clear();
    throw error;
  }
}

let installedPrivateAssetProvider = null;
let installedPrivateAssetPayload = "";

/**
 * Install a non-enumerable, one-shot in-memory asset provider. It deliberately
 * has no list, dump, path, or debug operation. This removes plaintext assets
 * from static delivery and disk; Node runtime memory remains a documented
 * transitional boundary until these lookups move into the native core.
 */
function activateProtectedAssetPack(payloadFile, artifactId) {
  verifyProtectedPackage();
  const payloadPath = path.resolve(payloadFile);
  if (installedPrivateAssetProvider) {
    if (installedPrivateAssetPayload !== payloadPath) {
      throw new Error("Mimosa 不允许在同一进程切换私有资产包");
    }
    return true;
  }
  if (globalThis[PRIVATE_ASSET_SLOT] !== undefined) {
    throw new Error("Mimosa 私有资产运行时槽已被预先占用");
  }

  const key = protectionKey();
  let plain;
  let assets;
  try {
    plain = decrypt(fs.readFileSync(payloadPath), key, artifactId);
    assets = parseProtectedAssetPack(plain);
  } catch (error) {
    throw new Error(`Mimosa 私有资产包校验、解密或解析失败：${error.message}`);
  } finally {
    key.fill(0);
    if (plain) plain.fill(0);
  }

  const provider = Object.freeze({
    schema: PRIVATE_ASSET_SCHEMA,
    take(id) {
      const normalized = String(id);
      const bytes = assets.get(normalized);
      if (!bytes) return undefined;
      assets.delete(normalized);
      return bytes;
    },
  });
  try {
    Object.defineProperty(globalThis, PRIVATE_ASSET_SLOT, {
      value: provider,
      enumerable: false,
      configurable: false,
      writable: false,
    });
  } catch (error) {
    for (const bytes of assets.values()) bytes.fill(0);
    assets.clear();
    throw new Error(`Mimosa 私有资产提供器安装失败：${error.message}`);
  }
  installedPrivateAssetProvider = provider;
  installedPrivateAssetPayload = payloadPath;
  process.once("exit", () => {
    for (const bytes of assets.values()) bytes.fill(0);
    assets.clear();
  });
  return true;
}

const activeRulePacks = new Map();

function protectedRuleTempParent() {
  const configured = String(process.env.MIMOSA_PROTECT_RULES_TMPDIR || "").trim();
  if (!configured) return os.tmpdir();
  let stat;
  try {
    stat = fs.lstatSync(configured);
  } catch {
    throw new Error(`Mimosa 规则临时目录不存在：${configured}`);
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(`Mimosa 规则临时目录必须是非符号链接目录：${configured}`);
  }
  return configured;
}

/**
 * Recover the encrypted built-in Semgrep rule pack only for the current local
 * process. Semgrep requires a pathname, so a 0700 directory with a 0600 rule
 * file is created under the OS temporary directory and removed on normal exit.
 * An explicit user MIMOSA_SEMGREP_LOCAL_RULES value keeps its existing higher
 * priority and is never overwritten.
 */
/**
 * Whether Semgrep second-opinion is actually requested for this process. The
 * protected delivery ships no Semgrep binary and defaults to the Native engine,
 * so the encrypted rule pack must NOT be decrypted to disk unless the caller
 * explicitly asks for Semgrep. Signals available at loader-init: explicit local
 * rules, an explicit Semgrep binary path, MIMOSA_ENGINE=semgrep, or an
 * `--engine semgrep` argv on the wrapped CLI. Hooks/MCP (Native-only) never
 * match, so they never restore rule source to disk.
 */
function semgrepRequested() {
  const env = process.env;
  if (String(env.MIMOSA_SEMGREP_LOCAL_RULES || "").trim()) return true;
  if (String(env.MIMOSA_SEMGREP_PATH || "").trim()) return true;
  if (String(env.MIMOSA_ENGINE || "").trim().toLowerCase() === "semgrep") return true;
  const argv = Array.isArray(process.argv) ? process.argv : [];
  for (let i = 0; i < argv.length; i += 1) {
    const token = String(argv[i] || "").trim().toLowerCase();
    if (token === "--engine=semgrep") return true;
    if (token === "--engine" && String(argv[i + 1] || "").trim().toLowerCase() === "semgrep") return true;
  }
  return false;
}

function activateProtectedRulePack(payloadFile, artifactId) {
  verifyProtectedPackage();
  // Default (Native) delivery never consumes the Semgrep rule source. Do not
  // decrypt/restore the plaintext rule pack to disk unless Semgrep second-opinion
  // is explicitly requested — otherwise every protected process (CLI/MCP/hooks)
  // would leave rule source recoverable under the OS temp directory.
  if (!semgrepRequested()) return "";
  if (String(process.env.MIMOSA_SEMGREP_LOCAL_RULES || "").trim()) {
    return process.env.MIMOSA_SEMGREP_LOCAL_RULES;
  }
  const payloadPath = path.resolve(payloadFile);
  const active = activeRulePacks.get(payloadPath);
  if (active) {
    process.env.MIMOSA_SEMGREP_LOCAL_RULES = active.ruleFile;
    return active.ruleFile;
  }

  const key = protectionKey();
  let plain;
  try {
    plain = decrypt(fs.readFileSync(payloadPath), key, artifactId);
  } catch (error) {
    throw new Error(`Mimosa 加密规则包校验或解密失败：${error.message}`);
  } finally {
    key.fill(0);
  }

  let ruleDir = "";
  try {
    ruleDir = fs.mkdtempSync(path.join(protectedRuleTempParent(), "mimosa-protected-rules-"));
    fs.chmodSync(ruleDir, 0o700);
    const ruleFile = path.join(ruleDir, "mimosa-offline.yml");
    fs.writeFileSync(ruleFile, plain, { mode: 0o600 });
    fs.chmodSync(ruleFile, 0o600);
    const cleanup = () => {
      try {
        fs.rmSync(ruleDir, { recursive: true, force: true });
      } catch {
        /* best-effort cleanup only; rule directory remains mode 0700 */
      }
    };
    activeRulePacks.set(payloadPath, { ruleFile, cleanup });
    process.once("exit", cleanup);
    process.env.MIMOSA_SEMGREP_LOCAL_RULES = ruleFile;
    return ruleFile;
  } catch (error) {
    if (ruleDir) {
      try {
        fs.rmSync(ruleDir, { recursive: true, force: true });
      } catch {
        /* preserve the primary error */
      }
    }
    throw new Error(`Mimosa 加密规则包无法安全恢复：${error.message}`);
  } finally {
    plain.fill(0);
  }
}

function loadProtected(parentModule, payloadFile, artifactId) {
  verifyProtectedPackage();
  const key = protectionKey();
  let plain;
  try {
    plain = decrypt(fs.readFileSync(payloadFile), key, artifactId);
  } catch (error) {
    throw new Error(`Mimosa 受保护产物校验或解密失败（${artifactId}）：${error.message}`);
  } finally {
    key.fill(0);
  }

  const child = new Module(parentModule.filename, parentModule.parent);
  child.filename = parentModule.filename;
  child.paths = parentModule.paths;
  try {
    child._compile(plain.toString("utf8"), parentModule.filename);
    return child.exports;
  } finally {
    plain.fill(0);
  }
}

/**
 * Execute an encrypted CommonJS script from an ESM bootstrap hook.
 *
 * The protected ZCode hooks remain ESM at their public entrypoint so the host
 * keeps its existing `node hooks/*.mjs` contract. Their bundled implementation
 * is CJS and is compiled with a stable virtual filename inside the hook
 * directory. This deliberately preserves `__dirname`/module lookup semantics
 * for bundled Node dependencies without exposing the implementation as a .js
 * or .mjs artifact.
 */
function loadProtectedScript(payloadFile, artifactId, virtualFilename) {
  verifyProtectedPackage();
  const key = protectionKey();
  let plain;
  try {
    plain = decrypt(fs.readFileSync(payloadFile), key, artifactId);
  } catch (error) {
    throw new Error(`Mimosa 受保护产物校验或解密失败（${artifactId}）：${error.message}`);
  } finally {
    key.fill(0);
  }

  const filename = virtualFilename || `${payloadFile}.cjs`;
  const child = new Module(filename, module.parent);
  child.filename = filename;
  child.paths = Module._nodeModulePaths(path.dirname(filename));
  try {
    child._compile(plain.toString("utf8"), filename);
    return child.exports;
  } finally {
    plain.fill(0);
  }
}

module.exports = {
  activateProtectedAssetPack,
  activateProtectedRulePack,
  loadProtected,
  loadProtectedScript,
  verifyProtectedPackage,
};
