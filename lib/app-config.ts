function appConfig() {
  return {
    name: Deno.env.get("APP_NAME") || "probot-scheduler",
  };
}

export default appConfig;
