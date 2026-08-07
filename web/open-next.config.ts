import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// ponytail: no R2 incremental cache until ISR miss measured
export default defineCloudflareConfig();
