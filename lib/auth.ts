import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      mapProfileToUser: (profile) => {
        // profile.login is the GitHub username
        if (profile.login !== process.env.GITHUB_ALLOWED_USERNAME) {
          throw new APIError("FORBIDDEN", {
            message: "You are not authorized to access this application",
          });
        }
        return {};
      },
    },
  },
  plugins: [nextCookies()],
});
