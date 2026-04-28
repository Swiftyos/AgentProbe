import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  createSecretCipher,
  ENCRYPTION_KEY_ENV_VAR,
  resolveMasterKey,
} from "../../../src/shared/utils/secret-cipher.ts";
import { makeTempDir } from "../support.ts";

function randomKeyHex(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

describe("secret cipher", () => {
  test("encrypt/decrypt round-trips a value", () => {
    const cipher = createSecretCipher(Buffer.from(randomKeyHex(), "hex"));
    const sealed = cipher.encrypt("super-secret-token");
    expect(sealed.ciphertext).not.toContain("super-secret-token");
    expect(cipher.decrypt(sealed)).toBe("super-secret-token");
  });

  test("decryption fails when ciphertext is tampered", () => {
    const cipher = createSecretCipher(Buffer.from(randomKeyHex(), "hex"));
    const sealed = cipher.encrypt("alpha");
    const tampered = Buffer.from(sealed.ciphertext, "base64");
    tampered[0] = (tampered[0] ?? 0) ^ 0xff;
    expect(() =>
      cipher.decrypt({ ...sealed, ciphertext: tampered.toString("base64") }),
    ).toThrow();
  });

  test("rejects keys with the wrong length", () => {
    expect(() => createSecretCipher(Buffer.alloc(16))).toThrow(/32 bytes/);
  });
});

describe("resolveMasterKey", () => {
  test("uses the env var when provided", () => {
    const hex = randomKeyHex();
    const env = { [ENCRYPTION_KEY_ENV_VAR]: hex } as NodeJS.ProcessEnv;
    const key = resolveMasterKey({ env });
    expect(key.toString("hex")).toBe(hex);
  });

  test("creates a 0600 key file beside the sqlite path on first use", () => {
    const dir = makeTempDir("cipher-keyfile");
    const sqlitePath = join(dir, "runs.sqlite3");
    const env = {} as NodeJS.ProcessEnv;
    const key = resolveMasterKey({ sqlitePath, env });
    const keyPath = `${sqlitePath}.key`;
    expect(existsSync(keyPath)).toBe(true);
    expect(readFileSync(keyPath, "utf8").trim()).toBe(key.toString("hex"));
    if (process.platform !== "win32") {
      const mode = statSync(keyPath).mode & 0o777;
      expect(mode).toBe(0o600);
    }
  });

  test("reuses an existing key file across calls", () => {
    const dir = makeTempDir("cipher-reuse");
    const sqlitePath = join(dir, "runs.sqlite3");
    const env = {} as NodeJS.ProcessEnv;
    const first = resolveMasterKey({ sqlitePath, env });
    const second = resolveMasterKey({ sqlitePath, env });
    expect(first.toString("hex")).toBe(second.toString("hex"));
  });

  test("requires an env key for postgres", () => {
    const env = {} as NodeJS.ProcessEnv;
    expect(() => resolveMasterKey({ backendKind: "postgres", env })).toThrow(
      /AGENTPROBE_ENCRYPTION_KEY is required/,
    );
  });
});
