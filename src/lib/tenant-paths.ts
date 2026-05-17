export function staffBasePath(businessSlug?: string | null) {
  return businessSlug ? `/b/${businessSlug}/staff` : "/staff";
}

export function portalBasePath(businessSlug?: string | null) {
  return businessSlug ? `/b/${businessSlug}/portal` : "/portal";
}

