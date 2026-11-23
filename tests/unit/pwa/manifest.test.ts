import manifest from "@/app/manifest";
import { PWA_SERVICE_WORKER_ENABLED } from "@/lib/pwa/no-service-worker";
import { existsSync } from "node:fs";
import { join } from "node:path";

describe("PWA install metadata", () => {
  const webManifest = manifest();

  it("is standalone with a Home Screen name", () => {
    expect(webManifest.display).toBe("standalone");
    expect(webManifest.short_name).toBe("FoulPlay");
    expect(webManifest.start_url).toBe("/");
    expect(webManifest.theme_color).toBe("#0A0A0A");
  });

  it("includes 192 and 512 icons that exist on disk", () => {
    const srcs = (webManifest.icons ?? []).map((icon) => icon.src);
    expect(srcs).toEqual(
      expect.arrayContaining(["/icons/icon-192.png", "/icons/icon-512.png"]),
    );
    const root = join(__dirname, "../../..");
    expect(existsSync(join(root, "public/icons/icon-192.png"))).toBe(true);
    expect(existsSync(join(root, "public/icons/icon-512.png"))).toBe(true);
    expect(existsSync(join(root, "public/apple-touch-icon.png"))).toBe(true);
  });

  it("does not enable a service worker", () => {
    expect(PWA_SERVICE_WORKER_ENABLED).toBe(false);
    const root = join(__dirname, "../../..");
    expect(existsSync(join(root, "public/sw.js"))).toBe(false);
    expect(existsSync(join(root, "public/service-worker.js"))).toBe(false);
  });
});
