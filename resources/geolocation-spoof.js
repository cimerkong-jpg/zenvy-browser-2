(function() {
  const geoConfig = %GEO_CONFIG%;
  
  if (!navigator.geolocation) return;
  
  const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
  const originalWatchPosition = navigator.geolocation.watchPosition.bind(navigator.geolocation);
  
  navigator.geolocation.getCurrentPosition = function(success, error, options) {
    if (success) {
      success({
        coords: {
          latitude: geoConfig.latitude,
          longitude: geoConfig.longitude,
          accuracy: geoConfig.accuracy,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      });
    }
  };
  
  navigator.geolocation.watchPosition = function(success, error, options) {
    if (success) {
      success({
        coords: {
          latitude: geoConfig.latitude,
          longitude: geoConfig.longitude,
          accuracy: geoConfig.accuracy,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      });
    }
    return 0;
  };
})();
