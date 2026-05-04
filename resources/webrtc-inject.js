// Inject this script to block WebRTC completely
(function() {
  'use strict';
  
  console.log('🛡️ WebRTC Blocker: Injecting directly...');
  
  // Block RTCPeerConnection completely
  Object.defineProperty(window, 'RTCPeerConnection', {
    get: function() { return undefined; },
    set: function() {},
    configurable: false
  });
  
  Object.defineProperty(window, 'webkitRTCPeerConnection', {
    get: function() { return undefined; },
    set: function() {},
    configurable: false
  });
  
  Object.defineProperty(window, 'mozRTCPeerConnection', {
    get: function() { return undefined; },
    set: function() {},
    configurable: false
  });
  
  // Block RTCSessionDescription
  Object.defineProperty(window, 'RTCSessionDescription', {
    get: function() { return undefined; },
    set: function() {},
    configurable: false
  });
  
  Object.defineProperty(window, 'webkitRTCSessionDescription', {
    get: function() { return undefined; },
    set: function() {},
    configurable: false
  });
  
  Object.defineProperty(window, 'mozRTCSessionDescription', {
    get: function() { return undefined; },
    set: function() {},
    configurable: false
  });
  
  // Block RTCIceCandidate
  Object.defineProperty(window, 'RTCIceCandidate', {
    get: function() { return undefined; },
    set: function() {},
    configurable: false
  });
  
  Object.defineProperty(window, 'webkitRTCIceCandidate', {
    get: function() { return undefined; },
    set: function() {},
    configurable: false
  });
  
  Object.defineProperty(window, 'mozRTCIceCandidate', {
    get: function() { return undefined; },
    set: function() {},
    configurable: false
  });
  
  // Block getUserMedia
  if (navigator.mediaDevices) {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      get: function() {
        return function() {
          console.log('🛡️ WebRTC Blocker: Blocked getUserMedia call');
          return Promise.reject(new DOMException('WebRTC is disabled', 'NotAllowedError'));
        };
      },
      set: function() {},
      configurable: false
    });
    
    Object.defineProperty(navigator.mediaDevices, 'enumerateDevices', {
      get: function() {
        return function() {
          console.log('🛡️ WebRTC Blocker: Blocked enumerateDevices call');
          return Promise.resolve([]);
        };
      },
      set: function() {},
      configurable: false
    });
  }
  
  // Block legacy getUserMedia
  Object.defineProperty(navigator, 'getUserMedia', {
    get: function() { return undefined; },
    set: function() {},
    configurable: false
  });
  
  Object.defineProperty(navigator, 'webkitGetUserMedia', {
    get: function() { return undefined; },
    set: function() {},
    configurable: false
  });
  
  Object.defineProperty(navigator, 'mozGetUserMedia', {
    get: function() { return undefined; },
    set: function() {},
    configurable: false
  });
  
  console.log('✅ WebRTC APIs completely blocked!');
  console.log('RTCPeerConnection:', window.RTCPeerConnection);
  console.log('webkitRTCPeerConnection:', window.webkitRTCPeerConnection);
  console.log('mozRTCPeerConnection:', window.mozRTCPeerConnection);
})();
