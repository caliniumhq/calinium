import { describe, expect, it, vi } from 'vitest';
import { openShopifyAuthorization } from '../components/creative-director/ShopifyConnectionPanel';

describe('Shopify connection panel', () => {
  it('escapes the embedded frame before opening Shopify authorization', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);

    openShopifyAuthorization('https://fixture.myshopify.com/admin/oauth/authorize?state=opaque');

    expect(open).toHaveBeenCalledWith('https://fixture.myshopify.com/admin/oauth/authorize?state=opaque', '_top');
    open.mockRestore();
  });
});
