/** A prepared message only: no recipient, automatic send, or app credentials. */
export function whatsappHref(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function isShareableHqh(text: string) {
  return (
    /HQH|会前会|破题|Poti/i.test(text) &&
    /(?:objective|目标|目的)/i.test(text) &&
    (/^\s*1[.)]\s/m.test(text) || /(?:background|背景)/i.test(text))
  );
}
