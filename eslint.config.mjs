export default [
  {
    ignores: ["**/node_modules/**", "**/.next/**", "**/dist/**", "**/out/**"],
  },
  ...(await import("eslint-config-next/core-web-vitals")).default,
  ...(await import("eslint-config-next/typescript")).default,
  {
    rules: {
      "react-hooks/static-components": "off",
      "react-hooks/set-state-in-effect": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];
