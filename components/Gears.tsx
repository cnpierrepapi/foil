// Two interlocking cogs that turn while the on-device model loads. When the
// load has failed they stop and tint red, so the state is readable at a glance.

const COG =
  "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7 7 0 0 0-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54a7 7 0 0 0-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.05.3-.07.62-.07.94 0 .33.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.13.22.39.31.59.22l2.39-.96c.5.38 1.05.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .43-.17.48-.41l.36-2.54c.57-.24 1.12-.56 1.62-.94l2.39.96c.23.09.49 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58ZM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2Z";

export function Gears({ failed }: { failed?: boolean }) {
  const color = failed ? "text-red-500" : "text-accent";
  return (
    <div className={`relative h-20 w-24 ${color}`} aria-hidden>
      <svg
        viewBox="0 0 24 24"
        className={`absolute left-0 top-1 h-16 w-16 ${failed ? "" : "gear-cw"}`}
        fill="currentColor"
      >
        <path d={COG} />
      </svg>
      <svg
        viewBox="0 0 24 24"
        className={`absolute right-0 bottom-0 h-11 w-11 opacity-70 ${failed ? "" : "gear-ccw"}`}
        fill="currentColor"
      >
        <path d={COG} />
      </svg>
    </div>
  );
}
