(function() {
  const batteryConfig = %BATTERY_CONFIG%;
  
  if (!navigator.getBattery) return;
  
  const originalGetBattery = navigator.getBattery.bind(navigator);
  
  navigator.getBattery = function() {
    return Promise.resolve({
      charging: batteryConfig.charging,
      chargingTime: batteryConfig.chargingTime,
      dischargingTime: batteryConfig.dischargingTime,
      level: batteryConfig.level,
      addEventListener: function() {},
      removeEventListener: function() {},
      dispatchEvent: function() { return true; }
    });
  };
})();
