import type { EndpointAdapter } from "../../domains/evaluation/ports.ts";
import type {
  AdapterReply,
  AutogptAuthResult,
  Endpoints,
} from "../../shared/types/contracts.ts";
import {
  AgentProbeConfigError,
  AgentProbeRuntimeError,
} from "../../shared/utils/errors.ts";
import { HttpEndpointAdapter } from "./http-endpoint.ts";
import { buildOpenClawAdapter, OpenClawEndpointAdapter } from "./openclaw.ts";
import { configureEndpoint, dispatchKey } from "./preset-config.ts";

class CliHarnessEndpointAdapter implements EndpointAdapter {
  constructor(readonly endpoint: Endpoints) {
    if (endpoint.transport !== "cli") {
      throw new AgentProbeConfigError("CLI adapter requires transport: cli.");
    }
  }

  async healthCheck(): Promise<void> {}

  async openScenario(): Promise<Record<string, unknown>> {
    return {};
  }

  async sendUserTurn(): Promise<AdapterReply> {
    throw new AgentProbeRuntimeError(
      "CLI harness execution is not implemented yet.",
    );
  }

  async closeScenario(): Promise<void> {}
}

export function buildEndpointAdapter(
  endpoints: Endpoints,
  options: {
    fetchImpl?: typeof fetch;
    autogptAuthResolver?: () => Promise<AutogptAuthResult> | AutogptAuthResult;
  } = {},
): EndpointAdapter {
  const configured = configureEndpoint(endpoints);
  if (configured.transport === "http") {
    return new HttpEndpointAdapter(
      configured,
      options.fetchImpl,
      options.autogptAuthResolver,
    );
  }
  if (configured.transport === "websocket") {
    const key = dispatchKey(endpoints);
    if (
      key &&
      [
        "openclaw",
        "openclaw-endpoints.yaml",
        "openclaw-endpoints.yml",
      ].includes(key)
    ) {
      return buildOpenClawAdapter(configured);
    }
    return buildOpenClawAdapter(configured);
  }
  if (configured.transport === "cli") {
    return new CliHarnessEndpointAdapter(configured);
  }
  throw new AgentProbeConfigError(
    `Unsupported transport: ${configured.transport ?? "unknown"}`,
  );
}

export { configureEndpoint, HttpEndpointAdapter, OpenClawEndpointAdapter };
