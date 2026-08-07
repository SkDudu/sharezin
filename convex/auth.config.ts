export default {
  providers: [
    {
      // JWT issuer = Convex site URL (built-in on self-host), not Next frontend URL
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
