export function keyboardIsOpen({
  focused,
  baseline,
  height,
  scale = 1,
  previouslyOpen = false,
}: {
  focused: boolean;
  baseline: number;
  height: number;
  scale?: number;
  previouslyOpen?: boolean;
}) {
  // Browser toolbars and pinch zoom must not masquerade as a software keyboard.
  return (
    (focused || previouslyOpen) &&
    Math.abs(scale - 1) < 0.05 &&
    baseline - height > 120
  );
}
