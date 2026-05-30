import type { PostcodeAnswer } from './types';

// Server-side afleiding postcode -> departement via geo.api.gouv.fr.
// Postcode zelf wordt nergens opgeslagen; alleen het afgeleide departement/regio.
const GEO_API = 'https://geo.api.gouv.fr/communes';

export function isValidFrPostcode(pc: string): boolean {
  return /^\d{5}$/.test(pc.trim());
}

export async function deriveDepartment(postcode: string): Promise<PostcodeAnswer | null> {
  const pc = postcode.trim();
  if (!isValidFrPostcode(pc)) return null;

  const url = `${GEO_API}?codePostal=${pc}&fields=nom,departement,region&format=json`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  const data = (await res.json()) as Array<{
    departement?: { code?: string; nom?: string };
    region?: { code?: string; nom?: string };
  }>;

  if (!Array.isArray(data) || data.length === 0) return null;
  const first = data[0];
  const dept = first.departement;
  const region = first.region;
  if (!dept?.code || !dept?.nom) return null;

  return {
    dept_code: dept.code,
    dept_naam: dept.nom,
    region_naam: region?.nom ?? '',
  };
}
