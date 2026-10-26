// Round icon button for the header's action slot (help, sound, practice settings…), so every
// control in that row shares one size, color and focus style. `label` names the button for
// screen readers and as a tooltip. Hover and pressed colors live in globals.css (`.header-button`)
// so hover only applies on devices that can hover and doesn't stick after a tap.
export default function HeaderButton({ label, className = '', children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`header-button inline-grid h-10 w-10 shrink-0 place-items-center rounded-full text-zinc-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:text-zinc-400 dark:focus-visible:ring-zinc-500 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
