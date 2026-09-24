'use strict';
const { createCommercePlanService } = require('./commerce-plan-service.cjs');
module.exports = createCommercePlanService({ key:'cross_sell_products', schemaPath:'schemas/calinium-cross-sell-products-candidate.schema.json', runtimeSectionId:'cross-sell-products', sectionRole:'cross_sell_products', blockRole:'curated_cross_sell_product', singular:'Cross-sell Products', minimumItems:1, maximumItems:8, pageRole:'homepage' });
