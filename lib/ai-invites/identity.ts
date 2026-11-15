export type PersonIdentity = {
  name: string;
  invite_name: string;
  registration_name: string | null;
  testimonial_name: string | null;
  primary_email: string | null;
  email2: string | null;
};
export function primaryName(
  identity: Pick<
    PersonIdentity,
    "registration_name" | "testimonial_name" | "invite_name" | "name"
  >,
) {
  return (
    identity.registration_name?.trim() ||
    identity.testimonial_name?.trim() ||
    identity.invite_name.trim() ||
    identity.name.trim()
  );
}
export function nameSource(
  identity: Pick<PersonIdentity, "registration_name" | "testimonial_name">,
) {
  return identity.registration_name
    ? "Registration"
    : identity.testimonial_name
      ? "Testimonial"
      : "Invite list";
}
export function otherNames(identity: PersonIdentity) {
  const primary = identity.name.trim().toLowerCase();
  return [
    ...new Set(
      [
        identity.invite_name,
        identity.registration_name,
        identity.testimonial_name,
      ].filter(
        (v): v is string => !!v?.trim() && v.trim().toLowerCase() !== primary,
      ),
    ),
  ];
}
