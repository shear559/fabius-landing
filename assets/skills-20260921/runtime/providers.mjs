// Browser stand-in for runtime/src/providers.mjs. route.mjs (served byte-identical from Fabius 3.2.0)
// imports this only to pick a provider and a model; a page has no keys and names no model, so
// nothing resolves and the router's classification, rung and tier are unaffected.
export const PROVIDERS = { anthropic: { label: 'Anthropic', tiers: { fast: 'fast tier', mid: 'mid tier', frontier: 'frontier tier' } } };
export const resolveModel = () => null;
export const overrideModel = (resolved) => resolved;
export const availableProviders = () => [];
