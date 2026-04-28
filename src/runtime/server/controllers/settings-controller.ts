import type { PersistenceRepository } from "../../../providers/persistence/types.ts";
import type { SecretCipher } from "../../../shared/utils/secret-cipher.ts";

const OPEN_ROUTER_SECRET_KEY = "open_router_api_key";
const OPEN_ROUTER_ENV_VAR = "OPEN_ROUTER_API_KEY";

export type SecretSource = "db" | "env" | null;

export type ResolvedSecret = {
  value: string | null;
  source: SecretSource;
};

export class SettingsController {
  constructor(
    private readonly options: {
      repository: PersistenceRepository;
      cipher: SecretCipher;
      env?: NodeJS.ProcessEnv;
    },
  ) {}

  private get env(): NodeJS.ProcessEnv {
    return this.options.env ?? process.env;
  }

  /**
   * Resolve the OpenRouter API key. The DB-stored value takes precedence over
   * the environment variable so dashboard configuration overrides any deploy-time
   * fallback.
   */
  async getOpenRouterApiKey(): Promise<ResolvedSecret> {
    const stored = await this.options.repository.getSecret(
      OPEN_ROUTER_SECRET_KEY,
    );
    if (stored) {
      const value = this.options.cipher.decrypt(stored);
      if (value) {
        return { value, source: "db" };
      }
    }
    const fromEnv = this.env[OPEN_ROUTER_ENV_VAR]?.trim();
    if (fromEnv) {
      return { value: fromEnv, source: "env" };
    }
    return { value: null, source: null };
  }

  async setOpenRouterApiKey(value: string): Promise<void> {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new Error("OpenRouter API key must not be empty.");
    }
    const encrypted = this.options.cipher.encrypt(trimmed);
    await this.options.repository.putSecret(OPEN_ROUTER_SECRET_KEY, encrypted);
  }

  async clearOpenRouterApiKey(): Promise<boolean> {
    return this.options.repository.deleteSecret(OPEN_ROUTER_SECRET_KEY);
  }

  /**
   * Status payload for endpoints that need to report config without leaking the
   * value itself. `configured` reflects whether *any* source resolved a value.
   */
  async openRouterApiKeyStatus(): Promise<{
    configured: boolean;
    source: SecretSource;
  }> {
    const { value, source } = await this.getOpenRouterApiKey();
    return { configured: Boolean(value), source };
  }
}
