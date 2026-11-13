/** A prepared message only: no recipient, automatic send, or app credentials. */
export function whatsappHref(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
