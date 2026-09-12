const GAME_PATH = "/shinkai-no-makoto";

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === GAME_PATH || url.pathname === `${GAME_PATH}/`) {
      url.pathname = `${GAME_PATH}/play`;
      return env.ASSETS.fetch(new Request(url, request));
    }

    return env.ASSETS.fetch(request);
  }
} satisfies ExportedHandler<Env>;
