export function blurWhile(pending, fit = true) {
  if (!pending) return "transition-colors duration-500";
  return `transition-colors duration-500 rounded-md bg-gray-200 animate-pulse select-none text-transparent [&_*]:text-transparent ${fit ? "w-fit" : ""}`;
}