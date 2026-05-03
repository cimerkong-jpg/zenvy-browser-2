// Inject this script to block WebRTC
(function() {
  'use strict';
  
  console.log('🛡️ WebRTC Blocker: Injecting directly...');
  
  // Override before page loads
  Object.defineProperty(window, 'RTCPeerConnection', {
    get: function() { return undefined; },
    set: function() {}
  });
  
  Object.defineProperty(window, 'webkitRTCPeerConnection', {
    get: function() { return undefined; },
    set: function() {}
  });
  
  Object.defineProperty(window, 'mozRTCPeerConnection', {
    get: function() { return undefined; },
    set: function() {}
  });
  
  console.log('✅ WebRTC APIs blocked!');
})();
