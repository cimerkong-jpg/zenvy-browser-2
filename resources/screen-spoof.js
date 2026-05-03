(function() {
  const screenConfig = %SCREEN_CONFIG%;
  
  Object.defineProperties(screen, {
    width: { get: () => screenConfig.width, configurable: true },
    height: { get: () => screenConfig.height, configurable: true },
    availWidth: { get: () => screenConfig.availWidth, configurable: true },
    availHeight: { get: () => screenConfig.availHeight, configurable: true },
    colorDepth: { get: () => screenConfig.colorDepth, configurable: true },
    pixelDepth: { get: () => screenConfig.pixelDepth, configurable: true }
  });
})();
