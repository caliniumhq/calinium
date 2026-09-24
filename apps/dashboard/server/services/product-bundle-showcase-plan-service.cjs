'use strict';
const { createCommercePlanService } = require('./commerce-plan-service.cjs');
module.exports = createCommercePlanService({ key:'product_bundle_showcase', schemaPath:'schemas/calinium-product-bundle-showcase-candidate.schema.json', runtimeSectionId:'product-bundle-showcase', sectionRole:'product_bundle_showcase', blockRole:'bundle_product', singular:'Product Bundle Showcase', minimumItems:2, maximumItems:5, pageRole:'homepage' });
