'use strict';
const { createCommercePlanService } = require('./commerce-plan-service.cjs');
module.exports = createCommercePlanService({ key:'shop_the_look', schemaPath:'schemas/calinium-shop-the-look-candidate.schema.json', runtimeSectionId:'shop-the-look', sectionRole:'shop_the_look', blockRole:'shop_the_look_product', singular:'Shop the Look', minimumItems:1, maximumItems:6, pageRole:'homepage', shopTheLook:true });
