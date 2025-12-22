export function getSchemeCSS() {
  const cssVarNames = [
    "--bg-primary",
    "--bg-secondary",
    "--bg-tertiary",
    "--bg-hover",
    "--bg-active",
    "--border-primary",
    "--border-secondary",
    "--border-accent",
    "--text-primary",
    "--text-secondary",
    "--text-tertiary",
    "--accent-blue",
    "--accent-green",
    "--accent-yellow",
    "--accent-red",
    "--accent-purple",
    "--accent-orange",
    "--accent-cyan",
    "--accent-teal",
  ];

  return Object.fromEntries(
    cssVarNames.map((name) => [
      name,
      getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
    ])
  );
}
