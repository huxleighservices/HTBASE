"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateGeoGridHeatMap = void 0;
const https_1 = require("firebase-functions/v2/https");
const google_maps_services_js_1 = require("@googlemaps/google-maps-services-js");
const params_1 = require("firebase-functions/params");
const googleMapsApiKey = (0, params_1.defineSecret)("GOOGLE_MAPS_API_KEY");
function generateGridPoints(center, radiusMiles, gridSize = 5) {
    const points = [];
    const milesPerDegree = 69;
    const degreeRadius = radiusMiles / milesPerDegree;
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const latOffset = (i - Math.floor(gridSize / 2)) *
                (degreeRadius * 2 / (gridSize - 1));
            const lngOffset = (j - Math.floor(gridSize / 2)) *
                (degreeRadius * 2 / (gridSize - 1));
            points.push({
                lat: center.lat + latOffset,
                lng: center.lng + lngOffset,
            });
        }
    }
    return points;
}
function calculateDistance(point1, point2) {
    const R = 3959;
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(point1.lat * Math.PI / 180) *
            Math.cos(point2.lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
exports.generateGeoGridHeatMap = (0, https_1.onCall)({
    secrets: [googleMapsApiKey],
    // Remove invoker: "public" - use Firebase Auth instead
}, async (request) => {
    // Check if user is authenticated (optional - remove if not needed)
    // if (!request.auth) {
    //   throw new HttpsError(
    //     "unauthenticated",
    //     "User must be authenticated"
    //   );
    // }
    const { city, businessName, keyword } = request.data;
    if (!city || !businessName) {
        throw new https_1.HttpsError("invalid-argument", "City and business name are required");
    }
    const client = new google_maps_services_js_1.Client({});
    const apiKey = googleMapsApiKey.value();
    try {
        console.log(`Geocoding city: ${city}`);
        const geocodeResponse = await client.geocode({
            params: {
                address: city,
                key: apiKey,
            },
        });
        if (geocodeResponse.data.results.length === 0) {
            throw new https_1.HttpsError("not-found", "City not found");
        }
        const center = geocodeResponse.data.results[0].geometry.location;
        console.log(`Center coordinates: ${center.lat}, ${center.lng}`);
        const gridPoints = generateGridPoints(center, 10, 5);
        console.log(`Generated ${gridPoints.length} grid points`);
        const searchTerm = keyword || businessName;
        const results = [];
        const batchSize = 5;
        for (let i = 0; i < gridPoints.length; i += batchSize) {
            const batch = gridPoints.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(async (point) => {
                try {
                    const searchResponse = await client.placesNearby({
                        params: {
                            location: point,
                            radius: 3000,
                            keyword: searchTerm,
                            key: apiKey,
                        },
                    });
                    const foundIndex = searchResponse.data.results.findIndex((place) => {
                        var _a;
                        return (_a = place.name) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(businessName.toLowerCase());
                    });
                    return {
                        point,
                        found: foundIndex !== -1,
                        position: foundIndex,
                        distance: calculateDistance(center, point),
                    };
                }
                catch (error) {
                    console.error(`Error searching at point ${point.lat},${point.lng}:`, error);
                    return {
                        point,
                        found: false,
                        position: -1,
                        distance: calculateDistance(center, point),
                    };
                }
            }));
            results.push(...batchResults);
            if (i + batchSize < gridPoints.length) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }
        const visibilityScore = (results.filter((r) => r.found).length / results.length) * 100;
        const foundResults = results.filter((r) => r.found);
        const avgPosition = foundResults.length > 0 ?
            foundResults.reduce((sum, r) => sum + r.position, 0) /
                foundResults.length : -1;
        return {
            center,
            gridPoints,
            results,
            summary: {
                totalPoints: results.length,
                foundCount: foundResults.length,
                visibilityScore: Math.round(visibilityScore),
                averagePosition: avgPosition !== -1 ? Math.round(avgPosition) : null,
            },
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ?
            error.message : "Failed to generate heat map";
        console.error("Error generating heat map:", error);
        throw new https_1.HttpsError("internal", errorMessage);
    }
});
//# sourceMappingURL=geoGridRankTracker.js.map