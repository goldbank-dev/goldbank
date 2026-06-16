import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { IntegrationStatusCards } from "../IntegrationStatusCards";

// Mock supabase client
vi.mock("@/integrations/supabase/client", () => {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [{ key: "x" }], error: null }),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { audit_status: "verified", last_audit_date: new Date().toISOString(), custody_location: "Cofre SP" },
      error: null,
    }),
  };
  return {
    supabase: { from: vi.fn(() => builder) },
  };
});

const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };

describe("IntegrationStatusCards — load & save settings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("carrega valores existentes do systemSettings (toggles refletem o estado salvo)", async () => {
    const settings = {
      integration_ai_enabled: false,
      integration_email_enabled: true,
      integration_pix_enabled: false,
      integration_stripe_enabled: true,
      integration_webhooks_enabled: true,
      integration_webhook_url: "https://example.com/hook",
      publish_proof_of_reserves: true,
      token_symbol: "GTK",
    };
    render(<IntegrationStatusCards systemSettings={settings} handleUpdateSetting={vi.fn()} />);
    await flush();

    // AI desativado, Email ativo
    const ativo = await screen.findAllByText("Ativo");
    const inativo = screen.getAllByText("Inativo");
    expect(ativo.length).toBeGreaterThan(0);
    expect(inativo.length).toBeGreaterThan(0);

    // Webhook configurado mostra a URL
    expect(screen.getByText(/example\.com\/hook/)).toBeInTheDocument();
  });

  it("usa defaults quando systemSettings está vazio", async () => {
    render(<IntegrationStatusCards systemSettings={{}} handleUpdateSetting={vi.fn()} />);
    await flush();
    // AI default = true → "Ativo" presente
    const ativos = await screen.findAllByText("Ativo");
    expect(ativos.length).toBeGreaterThan(0);
  });

  it("salva alteração via handleUpdateSetting ao alternar um toggle", async () => {
    const handleUpdateSetting = vi.fn();
    render(
      <IntegrationStatusCards
        systemSettings={{ integration_ai_enabled: true }}
        handleUpdateSetting={handleUpdateSetting}
      />
    );
    await flush();

    const switches = await screen.findAllByRole("switch");
    expect(switches.length).toBeGreaterThan(0);
    fireEvent.click(switches[0]);

    await waitFor(() => expect(handleUpdateSetting).toHaveBeenCalled());
    const [key, value] = handleUpdateSetting.mock.calls[0];
    expect(typeof key).toBe("string");
    expect(key.startsWith("integration_") || key === "publish_proof_of_reserves").toBe(true);
    expect(typeof value).toBe("boolean");
  });

  it("marca Webhooks como erro quando habilitado sem URL", async () => {
    render(
      <IntegrationStatusCards
        systemSettings={{ integration_webhooks_enabled: true, integration_webhook_url: "" }}
        handleUpdateSetting={vi.fn()}
      />
    );
    await flush();
    expect(await screen.findByText(/URL não configurada/i)).toBeInTheDocument();
  });

  it("aceita valores serializados como JSON string (parseVal)", async () => {
    render(
      <IntegrationStatusCards
        systemSettings={{ integration_ai_enabled: "false", integration_pix_enabled: "true" }}
        handleUpdateSetting={vi.fn()}
      />
    );
    await flush();
    expect(screen.getAllByText("Ativo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Inativo").length).toBeGreaterThan(0);
  });
});
