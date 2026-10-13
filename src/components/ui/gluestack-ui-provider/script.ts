export const script = (_mode: string) => {
  document.documentElement.classList.remove("dark");
  document.documentElement.classList.add("light");
  document.documentElement.style.colorScheme = "light";
};
