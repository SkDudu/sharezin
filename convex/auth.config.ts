export default {
  providers: [
    {
      // ponytail: self-host blocks CONVEX_SITE_URL override — SITE_URL set per frontend deploy
      domain: process.env.SITE_URL ?? process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
