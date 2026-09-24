import { describe, expect, it } from 'vitest';
import { savedSelections } from '../components/creative-director/ResourcePicker';

describe('ResourcePicker durable selection hydration', () => {
  it('restores approved Shopify and uploaded-asset references after an embedded refresh', () => {
    const result = savedSelections({ generation_context: {
      merchant_references: { hero_image: 'dashboard://projects/project-1/assets/asset-hero' },
      shopify_resource_references: { featured_collection: 'resource-collection' },
      asset_references: { 'hero-image': 'dashboard://projects/project-1/assets/asset-hero' },
      resolved_empty_fields: ['optional_copy'],
      completed_confirmations: ['review:verification:craftsmanship:methods', 'unrelated-stale-confirmation']
    } }, {
      groups: [
        { kind: 'collection', field_refs: ['featured_collection'] },
        { kind: 'image', field_refs: ['hero_image'] }
      ],
      fields: [
        { setting_ref: 'featured_collection', required: true },
        { setting_ref: 'hero_image', required: true },
        { setting_ref: 'optional_copy', required: false }
      ],
      required_assets: [{ asset_id: 'hero-image' }],
      required_confirmations: ['review:verification:craftsmanship:methods']
    });

    expect(result).toEqual({
      groups: { collection: 'shopify:resource-collection', image: 'asset:asset-hero' },
      requiredAssets: { 'hero-image': 'asset-hero' },
      emptyFields: ['optional_copy'],
      confirmedRequiredConfirmations: ['review:verification:craftsmanship:methods']
    });
  });
});
