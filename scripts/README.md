1) Create a folder in your home directory ".campusmobile"

2) In your ".campusmobile" folder, create a file "env.js" with the following content:

// Modify These Values
var APP_NAME = 'Your App Name'
var GOOGLE_ANALYTICS_ID = 'Google Analytics ID Here'
var GOOGLE_MAPS_API_KEY = 'Google Maps API Key Here'
var FIREBASE_IOS_KEY = 'FireBase IOS API Key Here'
var FIREBASE_ANDROID_KEY = 'FireBase Android API Key Here'
var AUTH_SERVICE_API_KEY = 'Auth Service API Key Here'

// Placeholder Values (Do Not Modify)
var APP_NAME_PH = 'Campus Mobile'
var GOOGLE_ANALYTICS_ID_PH = 'GOOGLE_ANALYTICS_ID_PH'
var GOOGLE_MAPS_API_KEY_PH = 'GOOGLE_MAPS_API_KEY_PH'
var FIREBASE_KEY_PH = 'FIREBASE_KEY_PH'
var AUTH_SERVICE_API_KEY_PH = 'AUTH_SERVICE_API_KEY_PH'

// Exports (Do Not Modify)
exports.APP_NAME = APP_NAME
exports.APP_NAME_PH = APP_NAME_PH

exports.GOOGLE_MAPS_API_KEY = GOOGLE_MAPS_API_KEY
exports.GOOGLE_MAPS_API_KEY_PH = GOOGLE_MAPS_API_KEY_PH

exports.GOOGLE_ANALYTICS_ID = GOOGLE_ANALYTICS_ID
exports.GOOGLE_ANALYTICS_ID_PH = GOOGLE_ANALYTICS_ID_PH

exports.FIREBASE_IOS_KEY = FIREBASE_IOS_KEY
exports.FIREBASE_ANDROID_KEY = FIREBASE_ANDROID_KEY
exports.FIREBASE_KEY_PH = FIREBASE_KEY_PH

exports.AUTH_SERVICE_API_KEY = AUTH_SERVICE_API_KEY
exports.AUTH_SERVICE_API_KEY_PH = AUTH_SERVICE_API_KEY_PH