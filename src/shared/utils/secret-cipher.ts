import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

import { AgentProbeRuntimeError } from "./errors.ts";

const KEY_LENGTH_BYTES = 32;
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;
const ALGORITHM = "aes-256-gcm";

export const ENCRYPTION_KEY_ENV_VAR = "AGENTPROBE_ENCRYPTION_KEY";
const KEY_FILE_SUFFIX = ".key";

export type EncryptedSecret = {
  ciphertext: string;
  iv: string;
  authTag: string;
};

export type SecretCipher = {
  encrypt(plaintext: string): EncryptedSecret;
  decrypt(secret: EncryptedSecret): string;
};

function decodeKeyMaterial(raw: string, source: string): Buffer {
  const trimmed = raw.trim();
  if (
    /^[0-9a-fA-F]+$/.test(trimmed) &&
    trimmed.length === KEY_LENGTH_BYTES * 2
  ) {
    return Buffer.from(trimmed, "hex");
  }
  let buffer: Buffer;
  try {
    buffer = Buffer.from(trimmed, "base64");
  } catch {
    throw new AgentProbeRuntimeError(
      `${source} must be ${KEY_LENGTH_BYTES} bytes encoded as hex or base64.`,
    );
  }
  if (buffer.length !== KEY_LENGTH_BYTES) {
    throw new AgentProbeRuntimeError(
      `${source} must be ${KEY_LENGTH_BYTES} bytes encoded as hex or base64.`,
    );
  }
  return buffer;
}

function ensureKeyFile(path: string): Buffer {
  if (existsSync(path)) {
    const contents = readFileSync(path, "utf8");
    return decodeKeyMaterial(contents, `Key file at ${path}`);
  }
  mkdirSync(dirname(path), { recursive: true });
  const fresh = randomBytes(KEY_LENGTH_BYTES);
  writeFileSync(path, fresh.toString("hex"), { mode: 0o600 });
  try {
    chmodSync(path, 0o600);
  } catch {
    // chmod may not be supported on every filesystem; the initial write mode is best-effort.
  }
  return fresh;
}

/**
 * Resolve the master encryption key. Order:
 *   1. {@link ENCRYPTION_KEY_ENV_VAR} env var (hex or base64, 32 bytes).
 *   2. A key file alongside the SQLite database (auto-generated, 0600).
 */
export function resolveMasterKey(options: {
  sqlitePath?: string;
  env?: NodeJS.ProcessEnv;
}): Buffer {
  const env = options.env ?? process.env;
  const fromEnv = env[ENCRYPTION_KEY_ENV_VAR];
  if (typeof fromEnv === "string" && fromEnv.trim()) {
    return decodeKeyMaterial(fromEnv, ENCRYPTION_KEY_ENV_VAR);
  }
  if (!options.sqlitePath) {
    throw new AgentProbeRuntimeError(
      `${ENCRYPTION_KEY_ENV_VAR} is not set and no key file location is available.`,
    );
  }
  const keyPath = resolve(`${options.sqlitePath}${KEY_FILE_SUFFIX}`);
  return ensureKeyFile(keyPath);
}

export function createSecretCipher(key: Buffer): SecretCipher {
  if (key.length !== KEY_LENGTH_BYTES) {
    throw new AgentProbeRuntimeError(
      `Encryption key must be ${KEY_LENGTH_BYTES} bytes (got ${key.length}).`,
    );
  }
  return {
    encrypt(plaintext: string): EncryptedSecret {
      const iv = randomBytes(IV_LENGTH_BYTES);
      const cipher = createCipheriv(ALGORITHM, key, iv);
      const ciphertext = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();
      return {
        ciphertext: ciphertext.toString("base64"),
        iv: iv.toString("base64"),
        authTag: authTag.toString("base64"),
      };
    },
    decrypt(secret: EncryptedSecret): string {
      const iv = Buffer.from(secret.iv, "base64");
      const authTag = Buffer.from(secret.authTag, "base64");
      const ciphertext = Buffer.from(secret.ciphertext, "base64");
      if (iv.length !== IV_LENGTH_BYTES) {
        throw new AgentProbeRuntimeError("Stored IV has an unexpected length.");
      }
      if (authTag.length !== AUTH_TAG_LENGTH_BYTES) {
        throw new AgentProbeRuntimeError(
          "Stored auth tag has an unexpected length.",
        );
      }
      const decipher = createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      const plaintext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);
      return plaintext.toString("utf8");
    },
  };
}
