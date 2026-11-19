// Which logo set the app shows. The local Docker build sets
// NEXT_PUBLIC_BRAND=unica-hija (the team's logo); the hosted Vercel site leaves
// it unset and shows the WAH logo. Baked in at build time like any NEXT_PUBLIC_ value.

const WAH = {
  logo: "/brand/wah/logo.png",
  loginLogo: "/brand/wah/login-logo.png",
  logoAlt: "WAH logo",
  favicon: "/brand/wah/favicon.ico",
  appleIcon: "/brand/wah/apple-icon.png",
};

const UNICA_HIJA = {
  logo: "/brand/unica-hija/logo.png",
  loginLogo: "/brand/unica-hija/login-logo.png",
  logoAlt: "Unica Hija logo",
  favicon: "/brand/unica-hija/favicon.ico",
  appleIcon: "/brand/unica-hija/apple-icon.png",
};

export const BRAND = process.env.NEXT_PUBLIC_BRAND === "unica-hija" ? UNICA_HIJA : WAH;
