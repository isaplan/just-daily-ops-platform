import { ImportType, FieldMapping } from './types';

interface CachedMapping {
  mapping: FieldMapping;
  savedAt: string;
}

function generateHeaderSignature(headers: string[]): string {
  return headers
    .map(h => h.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_'))
    .join('|');
}

function getCacheKey(
  locationId: string,
  importType: ImportType,
  headerSignature: string
): string {
  // v3: Increased header detection threshold to 50%, stronger metadata penalties
  return `finance.mapping.v3.${locationId}.${importType}.${headerSignature}`;
}

export function saveMappingCache(
  locationId: string,
  importType: ImportType,
  headers: string[],
  mapping: FieldMapping
): void {
  try {
    const headerSignature = generateHeaderSignature(headers);
    const key = getCacheKey(locationId, importType, headerSignature);
    const cached: CachedMapping = {
      mapping,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(key, JSON.stringify(cached));
  } catch (error) {
    console.error('Failed to save mapping cache:', error);
  }
}

export function loadMappingCache(
  locationId: string,
  importType: ImportType,
  headers: string[]
): FieldMapping | null {
  try {
    const headerSignature = generateHeaderSignature(headers);
    const key = getCacheKey(locationId, importType, headerSignature);
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const cached: CachedMapping = JSON.parse(stored);
    return cached.mapping;
  } catch (error) {
    console.error('Failed to load mapping cache:', error);
    return null;
  }
}

export function clearMappingCache(locationId: string, importType: ImportType): void {
  try {
    // Clear all versions of cache for this location/type
    const prefixes = ['v2', 'v3'].map(v => `finance.mapping.${v}.${locationId}.${importType}.`);
    prefixes.forEach(prefix => {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(prefix));
      keys.forEach(key => localStorage.removeItem(key));
    });
    console.log(`🧹 Cleared all mapping cache for ${importType} at location ${locationId}`);
  } catch (error) {
    console.error('Failed to clear mapping cache:', error);
  }
}

export function clearAllOldVersionCaches(): void {
  try {
    // Clear all v2 caches (old version with bug)
    const v2Keys = Object.keys(localStorage).filter(key => key.startsWith('finance.mapping.v2.'));
    v2Keys.forEach(key => localStorage.removeItem(key));
    console.log(`🧹 Cleared ${v2Keys.length} old v2 cache entries`);
  } catch (error) {
    console.error('Failed to clear old caches:', error);
  }
}
