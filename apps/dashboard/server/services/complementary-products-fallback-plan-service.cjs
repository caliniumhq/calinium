'use strict';
const { createCommercePlanService } = require('./commerce-plan-service.cjs');
module.exports = createCommercePlanService({ key:'complementary_products_fallback', schemaPath:'schemas/calinium-complementary-products-fallback-candidate.schema.json', runtimeSectionId:'complementary-products', sectionRole:'complementary_products_fallback', blockRole:'fallback_product', singular:'Complementary Products fallback', minimumItems:1, maximumItems:8, pageRole:'product_page' });
