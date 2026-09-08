export default {
  providers: [
    {
      // JWT issuer = Convex site URL, not Next frontend URL
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
