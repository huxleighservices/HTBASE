"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateGeoGridHeatMap = void 0;
const v2_1 = require("firebase-functions/v2");
const app_1 = require("firebase-admin/app");
(0, v2_1.setGlobalOptions)({ maxInstances: 10 });
(0, app_1.initializeApp)();
var geoGridRankTracker_1 = require("./geoGridRankTracker");
Object.defineProperty(exports, "generateGeoGridHeatMap", { enumerable: true, get: function () { return geoGridRankTracker_1.generateGeoGridHeatMap; } });
//# sourceMappingURL=index.js.map