importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDScTln-U_NG5hR0iC1Y0dok_WNTYOZ06E",
    authDomain: "eden-app-notifications.firebaseapp.com",
    projectId: "eden-app-notifications",
    storageBucket: "eden-app-notifications.appspot.com",
    messagingSenderId: "456240180306",
    appId: "1:456240180306:web:f3b09f540246c622e316db",
    measurementId: "G-1XDSRDW6BM"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
    self.registration.showNotification(payload.notification.title, {
        body: payload.notification.body,
        icon: '/favicon.ico'
    });
}); 