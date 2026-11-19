import "server-only";
import { requireAssignedUser } from "@/lib/app-access";
import { supabaseAdmin } from "@/lib/supabase-server";
import type { CatalogueSource, Listing, ReferenceNote } from "./model";

export async function loadCatalogue() {
  if (!(await requireAssignedUser())) throw new Error("Sign-in required");
  const { data: allSources, error } = await supabaseAdmin
    .from("product_catalogue_sources")
    .select("*")
    .order("edition_date", { ascending: false });
  if (error) throw new Error("Catalogue sources unavailable");
  const sources = (allSources as CatalogueSource[]).filter(
    (s, i, a) => a.findIndex((x) => x.market === s.market) === i,
  );
  const results = await Promise.all(
    sources.map(async (source) => {
      const { data, error } = await supabaseAdmin
        .from("product_catalogue_listings")
        .select(
          "source_id,sku,name,brand,category,pack,source_page,pv,pv_max,pv_status,bv,bv_max,bv_status,ap,ap_max,ap_status,rp,rp_max,rp_status",
        )
        .eq("source_id", source.id)
        .order("name")
        .range(0, 999);
      if (error || !data || data.length !== source.verified_count)
        throw new Error("Catalogue snapshot incomplete");
      return data as Listing[];
    }),
  );
  const { data: notes, error: noteError } = await supabaseAdmin
    .from("product_catalogue_notes")
    .select("*")
    .order("id");
  if (noteError) throw new Error("Reference notes unavailable");
  return { sources, listings: results.flat(), notes: notes as ReferenceNote[] };
}
